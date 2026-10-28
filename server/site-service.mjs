import {ContentError} from '../src/content-workflow.mjs';
import {contentAction,contentMcp,readContentJson,readContentJob,pageContentJobs,deleteContentJob} from './content-service.mjs';
import { sanitizeDiagnostic } from '../src/diagnostics.mjs';
import { retrievePublicCaptions } from './caption.mjs';
import { expireHistory,saveExtraction,pageExtractions,readExtraction,deleteExtraction } from './history.mjs';
export const BUILD = 'workspace_v03_sites_3';
export const RETENTION_MS = 30 * 86400000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function securityHeaders(type = 'application/json; charset=utf-8') {
  return {'Content-Type':type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com"};
}
const json = (body, status=200) => new Response(JSON.stringify(body), {status,headers:securityHeaders()});
// Dispatch supplies trusted identity. No client owner, query parameter or cookie is used.
export function ownerAuthorized(request, env) {
  const id=request.headers.get('oai-authenticated-user-id');
  const email=request.headers.get('oai-authenticated-user-email');
  return !!(id && email && env.GS_PEN_OWNER_EMAIL && email.toLowerCase() === env.GS_PEN_OWNER_EMAIL.toLowerCase() && (env.GS_PEN_OWNER_ID && id===env.GS_PEN_OWNER_ID));
}
// Automatic retention is paused, including for records with legacy expiry timestamps.
export async function expireEvents() { return {paused:true}; }
export function sanitizedSiteEvent(input, {traceId=crypto.randomUUID(),source='site',now=Date.now()}={}) {
  return sanitizeDiagnostic({...input,traceId,source,build:BUILD,transport:'site_backend'},new Date(now));
}
export async function storeEvents(db, events, now=Date.now()) {
  await expireEvents(db,now);
  const statements=events.map(e=>db.prepare('INSERT INTO diagnostic_events (id,created_at,expires_at,payload) VALUES (?,?,?,?)')
    .bind(crypto.randomUUID(),now,Number.MAX_SAFE_INTEGER,JSON.stringify(e)));
  if(statements.length) await db.batch(statements);
}
async function boundedJson(request) {
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('invalid');
  if(!request.body)throw Error('invalid');
  const reader=request.body.getReader();let size=0;const chunks=[];
  try {while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw Error('invalid');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function budget(db, now) {
  const window=Math.floor(now/60000);
  const r=await db.prepare('INSERT INTO request_budget (scope,window,used) VALUES (?, ?, 1) ON CONFLICT(scope) DO UPDATE SET window=excluded.window, used=CASE WHEN request_budget.window=excluded.window THEN request_budget.used+1 ELSE 1 END RETURNING used').bind('captions',window).first();
  return r.used<=10;
}
export async function handleSiteRequest(request, env, {fetchImpl=fetch,now=Date.now()}={}) {
  const path=new URL(request.url).pathname;
  // Keep the old service route harmless if a previously scheduled caller runs.
  // It never deletes records while retention is paused; preserve the private boundary.
  if(path==='/api/retention' && request.method==='POST') {
    if(request.headers.get('oai-authenticated-user-id') && !ownerAuthorized(request,env))return json({code:'AUTH_DENIED'},403);
    if(request.headers.get('origin') && request.headers.get('origin')!==new URL(request.url).origin)return json({code:'AUTH_DENIED'},403);
    return json({expiredDeleted:false,retentionPaused:true,retentionDays:null});
  }
  if(!ownerAuthorized(request,env))return json({code:'AUTH_DENIED'},403);
  if(!['GET','POST','DELETE'].includes(request.method))return json({code:'NOT_IMPLEMENTED'},405);
  const origin=request.headers.get('origin');
  if(request.method!=='GET' && ((origin && origin!==new URL(request.url).origin) || request.headers.get('sec-fetch-site')==='cross-site'))return json({code:'AUTH_DENIED'},403);
  try {
    const ownerId=request.headers.get('oai-authenticated-user-id');
    if(path==='/mcp'){
      if(request.method!=='POST')return json({code:'NOT_IMPLEMENTED'},405);
      const result=await contentMcp(request,env,ownerId,now);
      return result.notification?new Response(null,{status:202,headers:securityHeaders()}):json(result);
    }
    if(path==='/api/content'&&request.method==='GET')return json(await pageContentJobs(env.DB,ownerId,new URL(request.url).searchParams.get('cursor')));
    if(path==='/api/content'&&request.method==='POST')return json(await contentAction('create_content_job',await readContentJson(request),env,ownerId,now));
    if(path==='/api/content/draft'&&request.method==='POST')return json(await contentAction('save_content_draft',await readContentJson(request),env,ownerId,now));
    if(path.startsWith('/api/content/')&&['GET','DELETE'].includes(request.method)){
      const parts=path.slice('/api/content/'.length).split('/');
      if(request.method==='DELETE')return parts.length===1?json(await deleteContentJob(env.DB,ownerId,parts[0])):json({code:'CONTENT_NOT_FOUND'},404);
      if(parts.length===2&&parts[1]==='brief')return json(await contentAction('get_content_brief',{id:parts[0]},env,ownerId,now));
      if(parts.length===2&&parts[1]==='poster')return json(await contentAction('get_poster_draft',{id:parts[0]},env,ownerId,now));
      if(parts.length===1)return json({job:await readContentJob(env.DB,ownerId,parts[0])});
      return json({code:'CONTENT_NOT_FOUND'},404);
    }

    if(path==='/api/history' && request.method==='GET')return json({...await pageExtractions(env.DB,ownerId,new URL(request.url).searchParams.get('cursor')),retentionDays:null,retentionPaused:true});
    if(path.startsWith('/api/history/')){
      const id=path.slice('/api/history/'.length);
      if(!UUID.test(id))return json({code:'NOT_FOUND'},404);
      if(request.method==='GET'){
        const item=await readExtraction(env.DB,ownerId,id,now);
        return item?json({item}):json({code:'NOT_FOUND'},404);
      }
      if(request.method==='DELETE')return await deleteExtraction(env.DB,ownerId,id)?json({deleted:true}):json({code:'NOT_FOUND'},404);
      return json({code:'NOT_IMPLEMENTED'},405);
    }
    if(path==='/api/health' && request.method==='GET') {
      let storage=false;try{await expireEvents(env.DB,now);await env.DB.prepare('SELECT count(*) AS count FROM diagnostic_events').first();storage=true;}catch{}
      let history=false;try{await env.DB.prepare('SELECT id FROM extractions LIMIT 1').first();history=true;}catch{}
      let contentWorkflowAvailable=false;try{await env.DB.prepare('SELECT id FROM content_jobs LIMIT 1').first();contentWorkflowAvailable=true;}catch{}
      return json({contentWorkflowAvailable,build:BUILD,backend:'sites_private',ownerAuth:'dispatch_and_server_allowlist',authRequired:false,diagnosticStorage:storage?'site_database':'unavailable',centralSiteStorage:storage,historyAvailable:history,captionAdapter:'tiktok_experimental',publicContentAdapters:['tiktok','facebook'],retentionDays:null,retentionPaused:true});
    }
    if(path==='/api/diagnostics' && request.method==='GET') {
      await expireEvents(env.DB,now);
      const result=await env.DB.prepare('SELECT payload FROM diagnostic_events ORDER BY created_at DESC, id DESC LIMIT 10000').all();
      return json({events:result.results.map(row=>JSON.parse(row.payload)),retentionDays:null,retentionPaused:true,storage:'site_database'});
    }
    if(path==='/api/diagnostics' && request.method==='DELETE') {
      await env.DB.prepare('DELETE FROM diagnostic_events').run();return json({cleared:true});
    }
    if(path==='/api/storage-check' && request.method==='POST') {
      // Disposable, server-authored records only. Exercise the actual bound database.
      const id=crypto.randomUUID(),traceId=crypto.randomUUID();
      const event=sanitizedSiteEvent({stage:'diagnostics_write',status:'succeeded',code:'OK',url:'privacy_sentinel',message:'privacy_sentinel'},{traceId,now});
      const payload=JSON.stringify(event);
      try {
        await env.DB.prepare('INSERT INTO diagnostic_events (id,created_at,expires_at,payload) VALUES (?,?,?,?)').bind(id,now,now+RETENTION_MS,payload).run();
        const row=await env.DB.prepare('SELECT payload FROM diagnostic_events WHERE id=?').bind(id).first();
        const writePassed=row?.payload===payload,privacyPassed=!!row && !row.payload.includes('privacy_sentinel');
        await env.DB.prepare('DELETE FROM diagnostic_events WHERE id=?').bind(id).run();
        const deletePassed=!(await env.DB.prepare('SELECT id FROM diagnostic_events WHERE id=?').bind(id).first());
        await env.DB.prepare('INSERT INTO diagnostic_events (id,created_at,expires_at,payload) VALUES (?,?,?,?)').bind(id,now-RETENTION_MS,now,payload).run();
        await expireEvents(env.DB,now);
        const retentionPausedPassed=!!(await env.DB.prepare('SELECT id FROM diagnostic_events WHERE id=?').bind(id).first());
        const historyOwner='self-check:'+crypto.randomUUID();
        let historyId;
        try{
          historyId=await saveExtraction(env.DB,historyOwner,'https://www.facebook.com/reel/123456789012345',{ok:false,code:'NOT_IMPLEMENTED',cues:[],post:{status:'succeeded',text:'Disposable storage-check fixture'},metadata:{status:'unavailable'}},now);
          const historyWritePassed=!!(await readExtraction(env.DB,historyOwner,historyId,now));
          const historyIsolationPassed=!(await readExtraction(env.DB,ownerId,historyId,now));
          const historyDeletePassed=await deleteExtraction(env.DB,historyOwner,historyId);
          historyId=await saveExtraction(env.DB,historyOwner,'https://www.facebook.com/reel/123456789012345',{ok:false,code:'NOT_IMPLEMENTED',cues:[],post:{status:'succeeded',text:'Disposable expiry fixture'},metadata:{status:'unavailable'}},now-RETENTION_MS);
          await env.DB.prepare('UPDATE extractions SET expires_at=? WHERE id=?').bind(now,historyId).run();
          await expireHistory(env.DB,now);
          const historyRetentionPausedPassed=!!(await readExtraction(env.DB,historyOwner,historyId,now+RETENTION_MS+1));
          return json({writePassed,privacyPassed,deletePassed,retentionPausedPassed,historyWritePassed,historyIsolationPassed,historyDeletePassed,historyRetentionPausedPassed,storage:'site_database'});
        }finally{if(historyId)await deleteExtraction(env.DB,historyOwner,historyId);}
      } finally {await env.DB.prepare('DELETE FROM diagnostic_events WHERE id=?').bind(id).run();}
    }
    if(request.method!=='POST' || !['/api/diagnostics','/api/captions'].includes(path))return json({code:'NOT_IMPLEMENTED'},404);
    let data;try{data=await boundedJson(request);}catch{return json({code:'INVALID_URL'},400);}
    if(!data || typeof data!=='object' || Array.isArray(data))return json({code:'INVALID_URL'},400);
    const traceId=UUID.test(data.traceId||'')?data.traceId:crypto.randomUUID();
    if(path==='/api/diagnostics') {
      // Never accept free-text trace/build/source values from the browser.
      const event=sanitizedSiteEvent(data,{traceId,source:'browser',now});
      await storeEvents(env.DB,[event],now);return json({saved:true,storage:'site_database'});
    }
    let budgetAvailable=true;
    try{budgetAvailable=await budget(env.DB,now);}catch{/* logging database failure must not block caption retrieval */}
    if(!budgetAvailable)return json({ok:false,code:'RATE_LIMITED',cues:[],diagnosticsStored:false},429);
    if(typeof data.url!=='string' || data.url.length>2048)return json({code:'INVALID_URL'},400);
    const events=[];
    let result;
    try{result=await retrievePublicCaptions(data.url,{traceId,build:BUILD,fetchImpl,onEvent:e=>events.push(sanitizedSiteEvent(e,{traceId,now:Date.now()}))});}
    catch{result={ok:false,status:'failed',code:'INTERNAL_ERROR',cues:[]};events.push(sanitizedSiteEvent({stage:'finished',status:'failed',code:'INTERNAL_ERROR'},{traceId,now}));}
    let stored=false;try{await storeEvents(env.DB,events,now);stored=true;}catch{}
    let historyId=null,historyStatus='not_saved';
    try{historyId=await saveExtraction(env.DB,ownerId,data.url,result,now);historyStatus=historyId?'saved':'empty';}catch{historyStatus='failed';}
    return json({...result,traceId,events,diagnosticsStored:stored,diagnosticsStorage:stored?'site_database':'unavailable',historyId,historyStatus});
  } catch(e) {return json({code:e instanceof ContentError?e.code:'STORAGE_FAILED'},e instanceof ContentError?e.status:503);}
}
