import {classifyPublicVideoUrl} from '../src/url-classifier.mjs';
import {sanitizeDiagnostic} from '../src/diagnostics.mjs';
import {decodeCursor,encodeCursor,PAGE_SIZE} from './list-page.mjs';
import {ContentError} from '../src/content-workflow.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const checkId=id=>{if(typeof id!=='string'||!UUID.test(id))throw new ContentError('FAILED_LINK_NOT_FOUND',404);return id;};
export function replayLink(raw){
 const v=classifyPublicVideoUrl(raw);if(!v.ok)return null;
 const u=new URL(v.url),original=new URL(v.url);
 u.hash='';u.search='';
 const path=u.pathname.replace(/\/+$/,'');
 const keys=path==='/watch'?['v']:['/story.php','/permalink.php'].includes(path)?['story_fbid','id']:path==='/photo.php'?['fbid']:[];
 for(const key of keys)if(original.searchParams.has(key))u.searchParams.set(key,original.searchParams.get(key));
 u.pathname=path||'/';
 // Reject arbitrary path text rather than storing accidental private strings.
 if(!/^\/[A-Za-z0-9@._/-]+$/.test(u.pathname)||!classifyPublicVideoUrl(u.href).ok)return null;
 return {sourceUrl:u.href,platform:v.platform};
}
export async function recordFailedLink(db,ownerId,raw,result,{traceId,build,now=Date.now()}){
 const link=replayLink(raw);if(!link)return 'not_eligible';
 const status=result.ok?'resolved':(result.post?.text||result.metadata?.status==='succeeded')?'partial':'failed';
 const code=sanitizeDiagnostic({traceId,build,code:result.code,status:'failed'}).code;
 const id=crypto.randomUUID();
 // Do not add ordinary successful extractions to this registry.
 const row=await db.prepare(`INSERT INTO failed_link_attempts (id,owner_id,source_url,platform,created_at,status,code,trace_id,build)
 SELECT ?,?,?,?,?,?,?,?,? WHERE ?!='resolved' OR EXISTS (SELECT 1 FROM failed_link_attempts WHERE owner_id=? AND source_url=?)
 RETURNING id`).bind(id,ownerId,link.sourceUrl,link.platform,now,status,code,traceId,build,status,ownerId,link.sourceUrl).first();
 return row?'saved':'not_eligible';
}
const fields='id,source_url AS sourceUrl,platform,created_at AS createdAt,status,code,trace_id AS traceId,build';
export async function pageFailedLinks(db,ownerId,cursor){
 const before=decodeCursor(cursor);
 const {results}=await db.prepare(`WITH ranked AS (SELECT *,row_number() OVER(PARTITION BY source_url ORDER BY created_at DESC,id DESC) AS rn,
 count(*) OVER(PARTITION BY source_url) AS attempts,
 sum(CASE WHEN status!='resolved' THEN 1 ELSE 0 END) OVER(PARTITION BY source_url) AS failures,
 min(created_at) OVER(PARTITION BY source_url) AS firstAt FROM failed_link_attempts WHERE owner_id=?)
 SELECT ${fields},attempts,failures,firstAt FROM ranked WHERE rn=1 ${before?'AND (created_at<? OR (created_at=? AND id<?))':''}
 ORDER BY created_at DESC,id DESC LIMIT 51`).bind(ownerId,...(before?[before.time,before.time,before.id]:[])).all();
 const items=results.slice(0,PAGE_SIZE),last=items.at(-1);
 return {items,nextCursor:results.length>PAGE_SIZE?encodeCursor(last.createdAt,last.id):null};
}
export async function readFailedAttempt(db,ownerId,id){
 const row=await db.prepare(`SELECT ${fields} FROM failed_link_attempts WHERE owner_id=? AND id=?`).bind(ownerId,checkId(id)).first();
 if(!row)throw new ContentError('FAILED_LINK_NOT_FOUND',404);return row;
}
export async function pageFailedAttempts(db,ownerId,id,cursor){
 const row=await readFailedAttempt(db,ownerId,id),before=decodeCursor(cursor);
 const {results}=await db.prepare(`SELECT ${fields} FROM failed_link_attempts WHERE owner_id=? AND source_url=? ${before?'AND (created_at<? OR (created_at=? AND id<?))':''} ORDER BY created_at DESC,id DESC LIMIT 51`).bind(ownerId,row.sourceUrl,...(before?[before.time,before.time,before.id]:[])).all();
 const items=results.slice(0,PAGE_SIZE),last=items.at(-1);
 return {items,nextCursor:results.length>PAGE_SIZE?encodeCursor(last.createdAt,last.id):null};
}
export async function deleteFailedLink(db,ownerId,id){
 const row=await readFailedAttempt(db,ownerId,id);
 await db.prepare('DELETE FROM failed_link_attempts WHERE owner_id=? AND source_url=?').bind(ownerId,row.sourceUrl).run();
 return {deleted:true};
}
const ROOT='https://api.github.com/repos/GSGrimoire/gs-pen-research';
const REPO_ID=1473734015;
// Only owner-confirmed exports, no automatic transfer, no client-selected destination.
export async function exportFailedAttempt(env,ownerId,id,{fetchImpl=fetch}={}){
 const row=await readFailedAttempt(env.DB,ownerId,id);
 if(!env.GS_PEN_RESEARCH_TOKEN)throw new ContentError('RESEARCH_NOT_CONFIGURED',503);
 const link=replayLink(row.sourceUrl);if(!link||link.sourceUrl!==row.sourceUrl)throw new ContentError('RESEARCH_INVALID_RECORD',409);
 const headers={Authorization:'Bearer '+env.GS_PEN_RESEARCH_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'GS-Pen'};
 const request=async(url,options={})=>fetchImpl(url,{...options,headers,redirect:'error',signal:AbortSignal.timeout(8000)});
 try{
  const repo=await request(ROOT);
  if(!repo.ok)throw new ContentError('RESEARCH_UNAVAILABLE',502);
  const meta=await repo.json();
  if(meta.id!==REPO_ID||meta.private!==true||meta.visibility!=='private'||meta.full_name!=='GSGrimoire/gs-pen-research'||meta.default_branch!=='main')throw new ContentError('RESEARCH_TARGET_REJECTED',409);
  const path='cases/attempts/'+row.id+'.json';
  const record={schema:'gs-pen.research.attempt.v1',id:row.id,sourceUrl:link.sourceUrl,platform:link.platform,createdAt:row.createdAt,status:row.status,code:row.code,traceId:row.traceId,build:row.build};
  const bytes=new TextEncoder().encode(JSON.stringify(record,null,2)+'\n');
  const content=btoa(String.fromCharCode(...bytes));
  const url=ROOT+'/contents/'+path;
  const prior=await request(url+'?ref=main');
  if(prior.ok){
   const existing=await prior.json();
   if(existing.encoding==='base64'&&typeof existing.content==='string'&&existing.content.replace(/\s/g,'')===content)return {exported:true,reused:true,path};
   throw new ContentError('RESEARCH_CONFLICT',409);
  }
  if(prior.status!==404)throw new ContentError('RESEARCH_UNAVAILABLE',502);
  const saved=await request(url,{method:'PUT',body:JSON.stringify({message:'Record GS Pen research attempt '+row.id,content,branch:'main'})});
  if(saved.status!==201)throw new ContentError('RESEARCH_WRITE_UNCONFIRMED',502);
  return {exported:true,reused:false,path};
 }catch(e){if(e instanceof ContentError)throw e;throw new ContentError('RESEARCH_WRITE_UNCONFIRMED',502);}
}
