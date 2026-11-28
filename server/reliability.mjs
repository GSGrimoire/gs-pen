// Research only: permanent aggregate counters have no links, trace IDs or transcripts.
import {classifyPublicVideoUrl} from '../src/url-classifier.mjs';
import {sanitizeDiagnostic} from '../src/diagnostics.mjs';
import {retrievePublicCaptions} from './caption.mjs';
import {budget} from './request-budget.mjs';
import {deleteFailedLink} from './failed-links.mjs';
import {ContentError} from '../src/content-workflow.mjs';

export const RESEARCH_RETENTION_DAYS=180;
export const RESEARCH_RETENTION_MS=RESEARCH_RETENTION_DAYS*86400000;
export const RESEARCH_CRON='*/15 * * * *';
const monthOf=now=>new Date(now).toISOString().slice(0,7);
const monthStart=now=>Date.parse(monthOf(now)+'-01T00:00:00Z');
const platformOf=raw=>{const v=classifyPublicVideoUrl(raw);return v.ok?v.platform:null;};
const outcomeOf=r=>r.ok===true?'resolved':(r.post?.text||r.metadata?.status==='succeeded')?'partial':'failed';
const safeCode=code=>sanitizeDiagnostic({traceId:'research',code}).code;

async function increment(db,ownerId,now,kind,platform,outcome,code){
 await db.prepare(`INSERT INTO monthly_reliability (owner_id,month,kind,platform,outcome,code,count,last_at)
 VALUES (?,?,?,?,?,?,1,?) ON CONFLICT(owner_id,month,kind,platform,outcome,code) DO UPDATE SET
 count=monthly_reliability.count+1,last_at=max(monthly_reliability.last_at,excluded.last_at)`)
 .bind(ownerId,monthOf(now),kind,platform,outcome,safeCode(code),kind==='maintenance'?now:monthStart(now)).run();
}
// Recognized, budget-approved user requests only. Start and completion counts are separate.
export async function recordUserMetric(db,ownerId,raw,result,now){
 const platform=platformOf(raw);if(!platform)return;
 await increment(db,ownerId,now,'user',platform,result?outcomeOf(result):'started',result?result.code:'STARTED');
}
export async function expireResearch(db,ownerId,now=Date.now()){
 // Whole-generation expiry: a retry never extends the first-failure clock.
 const result=await db.prepare(`DELETE FROM failed_link_attempts WHERE owner_id=? AND case_id IN
 (SELECT case_id FROM failed_link_attempts WHERE owner_id=? GROUP BY case_id HAVING min(created_at)<=?)`)
 .bind(ownerId,ownerId,now-RESEARCH_RETENTION_MS).run();
 return result.meta?.changes??result.changes??0;
}
export async function readReliability(db,ownerId,now=Date.now()){
 const d=new Date(monthStart(now));d.setUTCMonth(d.getUTCMonth()-23);
 const {results}=await db.prepare(`SELECT month,kind,platform,outcome,code,count,last_at AS lastAt
 FROM monthly_reliability WHERE owner_id=? AND month>=? AND month<=? ORDER BY month DESC,kind,platform,outcome,code`)
 .bind(ownerId,monthOf(d.valueOf()),monthOf(now)).all();
 const months=new Map();let lastMaintenanceAt=null;
 for(const row of results){
  if(row.kind==='maintenance'){lastMaintenanceAt=Math.max(lastMaintenanceAt??0,row.lastAt);continue;}
  if(!months.has(row.month))months.set(row.month,{month:row.month,user:[],diagnostic:[]});
  if(row.kind==='user'||row.kind==='diagnostic')months.get(row.month)[row.kind].push({platform:row.platform,outcome:row.outcome,code:row.code,count:row.count});
 }
 return {retentionDays:RESEARCH_RETENTION_DAYS,lastMaintenanceAt,months:[...months.values()]};
}
// Trusted scheduled invocation only. No HTTP or assistant execution route.
// At most one case per tick; no automatic replay of uncertain claims.
export async function runResearchTick(env,{now=Date.now(),fetchImpl=fetch,retrieve=retrievePublicCaptions}={}){
 const ownerId=env.GS_PEN_OWNER_ID;
 if(!ownerId||!env.GS_PEN_OWNER_EMAIL)throw Error('RESEARCH_OWNER_UNAVAILABLE');
 const db=env.DB,month=monthOf(now),start=monthStart(now);
 await expireResearch(db,ownerId,now);
 await increment(db,ownerId,now,'maintenance','unknown','started','STARTED');
 const candidate=await db.prepare(`SELECT f.seq FROM failed_link_attempts f
 WHERE f.owner_id=? AND f.created_at<? AND f.research_month<?
 AND f.seq=(SELECT min(a.seq) FROM failed_link_attempts a WHERE a.owner_id=f.owner_id AND a.case_id=f.case_id)
 AND (SELECT a.status FROM failed_link_attempts a WHERE a.owner_id=f.owner_id AND a.case_id=f.case_id ORDER BY a.seq DESC LIMIT 1)!='resolved'
 ORDER BY f.seq LIMIT 1`).bind(ownerId,start,month).first();
 if(!candidate)return {status:'idle'};
 const allowance=await budget(db,now);
 if(!allowance.allowed)return {status:'budget_denied'};
 const claimed=await db.prepare(`UPDATE failed_link_attempts SET research_month=?
 WHERE owner_id=? AND seq=? AND research_month<? AND created_at>?
 AND (SELECT a.status FROM failed_link_attempts a WHERE a.owner_id=failed_link_attempts.owner_id AND a.case_id=failed_link_attempts.case_id ORDER BY a.seq DESC LIMIT 1)!='resolved'
 RETURNING case_id AS caseId,source_url AS sourceUrl,platform,
 (SELECT max(a.seq) FROM failed_link_attempts a WHERE a.owner_id=failed_link_attempts.owner_id AND a.case_id=failed_link_attempts.case_id) AS version`)
 .bind(month,ownerId,candidate.seq,month,now-RESEARCH_RETENTION_MS).first();
 if(!claimed)return {status:'not_claimed'};
 const platform=platformOf(claimed.sourceUrl);
 if(!platform||platform!==claimed.platform)return {status:'invalid_stored_link'};
 await increment(db,ownerId,now,'diagnostic',platform,'started','STARTED');
 let result;
 try{result=await retrieve(claimed.sourceUrl,{fetchImpl,traceId:crypto.randomUUID(),build:'research_monthly_v1',onEvent:()=>{}});}
 catch{result={ok:false,code:'INTERNAL_ERROR'};}
 const outcome=outcomeOf(result);
 await increment(db,ownerId,now,'diagnostic',platform,outcome,result.code);
 // Aggregate must be committed first; concurrent user capture invalidates deletion.
 if(outcome==='resolved'){
  try{await deleteFailedLink(db,ownerId,claimed.caseId,claimed.version);}
  catch(e){if(!(e instanceof ContentError)||e.code!=='FAILED_LINK_CHANGED_OR_MISSING')throw e;}
 }
 return {status:'completed',outcome};
}
