import { sanitizeDiagnostic } from '../src/diagnostics.mjs';
import { retrievePublicCaptions } from './caption.mjs';
export const BUILD = 'testlab_v01_sites_2';
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
  return !!(id && email && env.GS_PEN_OWNER_EMAIL && email.toLowerCase() === env.GS_PEN_OWNER_EMAIL.toLowerCase() && (!env.GS_PEN_OWNER_ID || id===env.GS_PEN_OWNER_ID));
}
export async function expireEvents(db, now=Date.now()) {
  return db.prepare('DELETE FROM diagnostic_events WHERE expires_at <= ?').bind(now).run();
}
export function sanitizedSiteEvent(input, {traceId=crypto.randomUUID(),source='site',now=Date.now()}={}) {
  return sanitizeDiagnostic({...input,traceId,source,build:BUILD,transport:'site_backend'},new Date(now));
}
export async function storeEvents(db, events, now=Date.now()) {
  await expireEvents(db,now);
  const statements=events.map(e=>db.prepare('INSERT INTO diagnostic_events (id,created_at,expires_at,payload) VALUES (?,?,?,?)')
    .bind(crypto.randomUUID(),now,now+RETENTION_MS,JSON.stringify(e)));
  if(statements.length) await db.batch(statements);
  await db.prepare('DELETE FROM diagnostic_events WHERE id IN (SELECT id FROM diagnostic_events ORDER BY created_at DESC, id DESC LIMIT -1 OFFSET 10000)').run();
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
  // Destructive-only housekeeping relies on the confirmed owner-private dispatch boundary.
  // It returns no records and cannot delete unexpired events. Never make this Site public.
  if(path==='/api/retention' && request.method==='POST') {
    if(request.headers.get('oai-authenticated-user-id') && !ownerAuthorized(request,env))return json({code:'AUTH_DENIED'},403);
    if(request.headers.get('origin') && request.headers.get('origin')!==new URL(request.url).origin)return json({code:'AUTH_DENIED'},403);
    try{await expireEvents(env.DB,now);return json({expiredDeleted:true,retentionDays:30});}catch{return json({code:'STORAGE_FAILED'},503);}
  }
  if(!ownerAuthorized(request,env))return json({code:'AUTH_DENIED'},403);
  if(!['GET','POST','DELETE'].includes(request.method))return json({code:'NOT_IMPLEMENTED'},405);
  const origin=request.headers.get('origin');
  if(request.method!=='GET' && ((origin && origin!==new URL(request.url).origin) || request.headers.get('sec-fetch-site')==='cross-site'))return json({code:'AUTH_DENIED'},403);
  try {
    if(path==='/api/health' && request.method==='GET') {
      let storage=false;try{await expireEvents(env.DB,now);await env.DB.prepare('SELECT count(*) AS count FROM diagnostic_events').first();storage=true;}catch{}
      return json({build:BUILD,backend:'sites_private',ownerAuth:'dispatch_and_server_allowlist',authRequired:false,diagnosticStorage:storage?'site_database':'unavailable',centralSiteStorage:storage,captionAdapter:'tiktok_experimental',publicContentAdapters:['tiktok','facebook'],retentionDays:30});
    }
    if(path==='/api/diagnostics' && request.method==='GET') {
      await expireEvents(env.DB,now);
      const result=await env.DB.prepare('SELECT payload FROM diagnostic_events WHERE expires_at > ? ORDER BY created_at DESC, id DESC LIMIT 10000').bind(now).all();
      return json({events:result.results.map(row=>JSON.parse(row.payload)),retentionDays:30,storage:'site_database'});
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
        const expiryPassed=!(await env.DB.prepare('SELECT id FROM diagnostic_events WHERE id=?').bind(id).first());
        return json({writePassed,privacyPassed,deletePassed,expiryPassed,storage:'site_database'});
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
    return json({...result,traceId,events,diagnosticsStored:stored,diagnosticsStorage:stored?'site_database':'unavailable'});
  } catch {return json({code:'STORAGE_FAILED'},503);}
}
