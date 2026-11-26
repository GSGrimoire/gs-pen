import {classifyPublicVideoUrl} from '../src/url-classifier.mjs';
import {sanitizeDiagnostic} from '../src/diagnostics.mjs';
import {PAGE_SIZE} from './list-page.mjs';
import {ContentError} from '../src/content-workflow.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const checkId=id=>{if(typeof id!=='string'||!UUID.test(id))throw new ContentError('FAILED_LINK_NOT_FOUND',404);return id;};
const sequence=n=>typeof n==='number'&&Number.isSafeInteger(n)&&n>0;
function cursorValue(raw){
 if(raw==null)return null;
 if(typeof raw!=='string'||!/^\d{1,16}$/.test(raw)||!sequence(Number(raw)))throw new ContentError('INVALID_PAGE_CURSOR');
 return Number(raw);
}
export function replayLink(raw){
 const v=classifyPublicVideoUrl(raw);if(!v.ok)return null;
 const u=new URL(v.url),original=new URL(v.url);
 // No redirect-based identity guessing. Reject ambiguous or encoded path segments.
 if(!/^\/[A-Za-z0-9@._/-]+$/.test(u.pathname)||u.pathname.includes('//'))return null;
 u.hash='';u.search='';
 const path=u.pathname.replace(/\/+$/,'');
 const keys=path==='/watch'?['v']:['/story.php','/permalink.php'].includes(path)?['story_fbid','id']:path==='/photo.php'?['fbid']:[];
 for(const key of keys)if(original.searchParams.has(key))u.searchParams.set(key,original.searchParams.get(key));
 u.pathname=path||'/';
 if(!classifyPublicVideoUrl(u.href).ok)return null;
 return {sourceUrl:u.href,platform:v.platform};
}
export async function recordFailedLink(db,ownerId,raw,result,{traceId,build,now=Date.now()}){
 const link=replayLink(raw);if(!link)return 'not_eligible';
 const status=result.ok===true?'resolved':(result.post?.text||result.metadata?.status==='succeeded')?'partial':'failed';
 const safe=sanitizeDiagnostic({traceId:typeof traceId==='string'&&UUID.test(traceId)?traceId:crypto.randomUUID(),build,code:result.code,status:'failed'});
 const id=crypto.randomUUID();
 // Atomic append: choose the existing case generation or create a new one.
 // Database allocation of seq defines completion order, including equal timestamps.
 const row=await db.prepare(`INSERT INTO failed_link_attempts (id,case_id,owner_id,source_url,platform,created_at,status,code,trace_id,build)
 SELECT ?,COALESCE((SELECT case_id FROM failed_link_attempts WHERE owner_id=? AND source_url=? ORDER BY seq DESC LIMIT 1),?),?,?,?,?,?,?,?,?
 WHERE ?!='resolved' OR EXISTS (SELECT 1 FROM failed_link_attempts WHERE owner_id=? AND source_url=?)
 RETURNING id`).bind(id,ownerId,link.sourceUrl,id,ownerId,link.sourceUrl,link.platform,now,status,safe.code,safe.traceId,safe.build,status,ownerId,link.sourceUrl).first();
 return row?'saved':'not_eligible';
}
const attemptFields='id,case_id AS caseId,seq,source_url AS sourceUrl,platform,created_at AS createdAt,status,code,trace_id AS traceId,build';
export async function pageFailedLinks(db,ownerId,cursor){
 const before=cursorValue(cursor);
 // Case creation order is immutable until deletion, so later retries do not move cases across pages.
 const {results}=await db.prepare(`WITH cases AS (SELECT case_id,min(seq) AS firstSeq,max(seq) AS version,count(*) AS attempts,
 sum(CASE WHEN status!='resolved' THEN 1 ELSE 0 END) AS failures FROM failed_link_attempts WHERE owner_id=? GROUP BY case_id)
 SELECT a.case_id AS id,a.id AS latestAttemptId,c.firstSeq,c.version,c.attempts,c.failures,f.created_at AS firstAt,
 a.source_url AS sourceUrl,a.platform,a.created_at AS createdAt,a.status,a.code,a.trace_id AS traceId,a.build
 FROM cases c JOIN failed_link_attempts a ON a.seq=c.version JOIN failed_link_attempts f ON f.seq=c.firstSeq
 WHERE a.owner_id=? AND f.owner_id=? ${before!==null?'AND c.firstSeq<?':''} ORDER BY c.firstSeq DESC LIMIT 51`)
 .bind(ownerId,ownerId,ownerId,...(before!==null?[before]:[])).all();
 const items=results.slice(0,PAGE_SIZE),last=items.at(-1);
 return {items,nextCursor:results.length>PAGE_SIZE?String(last.firstSeq):null};
}
export async function pageFailedAttempts(db,ownerId,id,cursor){
 checkId(id);const before=cursorValue(cursor);
 // Each page is one read. A deleted generation cannot resolve to a replacement case.
 const {results}=await db.prepare(`SELECT ${attemptFields} FROM failed_link_attempts WHERE owner_id=? AND case_id=?
 ${before!==null?'AND seq<?':''} ORDER BY seq DESC LIMIT 51`).bind(ownerId,id,...(before!==null?[before]:[])).all();
 if(!results.length&&!before)throw new ContentError('FAILED_LINK_NOT_FOUND',404);
 const items=results.slice(0,PAGE_SIZE),last=items.at(-1);
 return {items,nextCursor:results.length>PAGE_SIZE?String(last.seq):null};
}
export async function deleteFailedLink(db,ownerId,id,version){
 checkId(id);if(!sequence(version))throw new ContentError('INVALID_FAILED_LINK_VERSION');
 // A single conditional DELETE is the linearization point. New attempts invalidate stale
 // confirmation; a later capture creates a distinct generation, not a stale deletion target.
 const result=await db.prepare(`DELETE FROM failed_link_attempts WHERE owner_id=? AND case_id=?
 AND (SELECT max(seq) FROM failed_link_attempts WHERE owner_id=? AND case_id=?)=?`).bind(ownerId,id,ownerId,id,version).run();
 const changes=result.meta?.changes??result.changes;
 if(!Number.isSafeInteger(changes)||changes<1)throw new ContentError('FAILED_LINK_CHANGED_OR_MISSING',409);
 return {deleted:true};
}
