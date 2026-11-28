import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {recordFailedLink,pageFailedLinks,pageFailedAttempts} from '../server/failed-links.mjs';
import {recordUserMetric,readReliability,expireResearch,runResearchTick,RESEARCH_RETENTION_MS} from '../server/reliability.mjs';
const now=Date.parse('2026-11-15T12:00:00Z'),last=Date.parse('2026-10-15T12:00:00Z');
const owner='owner',url='https://facebook.com/share/r/FixtureResearch123';
const fail={ok:false,code:'LOGIN_REQUIRED'},success={ok:true,code:'OK',cues:[{text:'private synthetic transcript'}]};
function setup(){
 const sql=new DatabaseSync(':memory:');const dir=new URL('../drizzle/',import.meta.url);
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL(file,dir),'utf8'));
 const db={prepare(query){let args=[];const api={bind(...v){args=v;return api;},async first(){return sql.prepare(query).get(...args);},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return sql.prepare(query).run(...args);}};return api;}};
 return {sql,db,env:{DB:db,GS_PEN_OWNER_ID:owner,GS_PEN_OWNER_EMAIL:'owner@example.test'}};
}
const capture=(db,at=last,who=owner,source=url)=>recordFailedLink(db,who,source,fail,{traceId:crypto.randomUUID(),build:'fixture',now:at});
test('user denominator and diagnostic population separate; aggregates contain no link or transcript',async()=>{
 const {db,env,sql}=setup();await capture(db);
 for(const outcome of [fail,success]){await recordUserMetric(db,owner,url,null,now);await recordUserMetric(db,owner,url,outcome,now);}
 await recordUserMetric(db,owner,'https://invalid.test/',fail,now);
 let calls=0;const run=await runResearchTick(env,{now,retrieve:async raw=>{calls++;assert.equal(raw,url);return success;}});
 assert.equal(run.outcome,'resolved');assert.equal(calls,1);assert.equal((await pageFailedLinks(db,owner)).items.length,0);
 const report=await readReliability(db,owner,now),month=report.months[0];
 assert.equal(month.user.find(x=>x.outcome==='started').count,2);
 assert.equal(month.user.find(x=>x.outcome==='resolved').count,1);
 assert.equal(month.user.find(x=>x.outcome==='failed').count,1);
 assert.equal(month.diagnostic.find(x=>x.outcome==='resolved').count,1);
 assert.ok(!JSON.stringify(sql.prepare('SELECT * FROM monthly_reliability').all()).includes('FixtureResearch123'));
 assert.ok(!JSON.stringify(report).includes('private synthetic transcript'));assert.equal((await readReliability(db,'foreign',now)).months.length,0);
});
test('durable monthly claim prevents concurrent/repeated rechecks of same case; unresolved eligible next month',async()=>{
 const {db,env}=setup();await capture(db);await capture(db,now,owner,url+'new');await capture(db,last,'foreign');
 let calls=0;const retrieve=async()=>{calls++;return fail;};
 await Promise.all([runResearchTick(env,{now,retrieve}),runResearchTick(env,{now,retrieve})]);assert.equal(calls,1);
 await runResearchTick(env,{now:now+3600000,retrieve});assert.equal(calls,1);
 await runResearchTick(env,{now:Date.parse('2026-12-15T12:00:00Z'),retrieve});assert.equal(calls,2);
 assert.equal((await pageFailedLinks(db,'foreign')).items.length,1);
});
test('non-sliding expiry hides and deletes old generation without deleting other owners, new cases or aggregate',async()=>{
 const {db,sql}=setup();await capture(db,now-RESEARCH_RETENTION_MS);await capture(db,now-1);
 await capture(db,now-1,owner,url+'new');await capture(db,now-RESEARCH_RETENTION_MS,'foreign');
 await recordUserMetric(db,owner,url,fail,now);
 const old=(await pageFailedLinks(db,owner)).items.at(-1);
 assert.equal((await pageFailedLinks(db,owner,null,now-RESEARCH_RETENTION_MS)).items.length,1);
 await assert.rejects(pageFailedAttempts(db,owner,old.id,null,now-RESEARCH_RETENTION_MS));
 assert.equal(await expireResearch(db,owner,now),2);assert.equal((await pageFailedLinks(db,owner)).items.length,1);
 assert.equal((await pageFailedLinks(db,'foreign')).items.length,1);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM monthly_reliability').get().n,1);
});
test('quota fails closed; lost completion retains case; stale successful recheck cannot delete later capture',async()=>{
 const {db,env}=setup();await capture(db);let calls=0;
 const broken={prepare(q){if(q.includes('request_budget'))throw Error('budget');return db.prepare(q);}};
 await assert.rejects(runResearchTick({...env,DB:broken},{now,retrieve:async()=>{calls++;return success;}}));assert.equal(calls,0);
 const result=await runResearchTick(env,{now,retrieve:async()=>{await capture(db,now);return success;}});
 assert.equal(result.outcome,'resolved');assert.equal((await pageFailedLinks(db,owner)).items[0].attempts,2);
 const later=Date.parse('2026-12-15T12:00:00Z');
 const brokenCompletion={prepare(q){if(q.includes('INSERT INTO monthly_reliability')){const stmt=db.prepare(q),bind=stmt.bind;stmt.bind=(...args)=>{if(args[2]==='diagnostic'&&args[4]==='resolved')throw Error('stats');return bind(...args);};return stmt;}return db.prepare(q);}};
 await assert.rejects(runResearchTick({...env,DB:brokenCompletion},{now:later,retrieve:async()=>success}));
 assert.equal((await pageFailedLinks(db,owner)).items[0].attempts,2);
 assert.equal((await readReliability(db,owner,later)).months[0].diagnostic[0].outcome,'started');
});
test('migration 0004 preserves previous records and snapshot lineage',()=>{
 const sql=new DatabaseSync(':memory:');const dir=new URL('../drizzle/',import.meta.url);
 for(const f of readdirSync(dir).filter(f=>/^000[0-3].*\.sql$/.test(f)).sort())sql.exec(readFileSync(new URL(f,dir),'utf8'));
 sql.exec("INSERT INTO failed_link_attempts (id,case_id,owner_id,source_url,platform,created_at,status,code,trace_id,build) VALUES ('id','id','owner','https://facebook.com/share/r/Fixture123','facebook',1,'failed','LOGIN_REQUIRED','trace','fixture')");
 const before=sql.prepare('SELECT * FROM failed_link_attempts').get();sql.exec(readFileSync(new URL('0004_monthly_reliability.sql',dir),'utf8'));
 assert.deepEqual({...sql.prepare('SELECT * FROM failed_link_attempts').get()},{...before,research_month:''});
 const old=JSON.parse(readFileSync(new URL('meta/0003_snapshot.json',dir),'utf8')),next=JSON.parse(readFileSync(new URL('meta/0004_snapshot.json',dir),'utf8'));
 assert.equal(next.prevId,old.id);for(const key of Object.keys(old.tables).filter(k=>k!=='failed_link_attempts'))assert.deepEqual(next.tables[key],old.tables[key]);
 assert.deepEqual(sql.prepare("PRAGMA table_info('monthly_reliability')").all().map(x=>x.name),Object.keys(next.tables.monthly_reliability.columns));
});

test('corrupted stored research links fail closed before any scheduled retrieval',async()=>{
 const {db,env,sql}=setup();
 await capture(db);
 sql.prepare('UPDATE failed_link_attempts SET source_url=? WHERE owner_id=?')
  .run('https://untrusted.example/private',owner);
 let calls=0;
 const result=await runResearchTick(env,{now,retrieve:async()=>{calls++;return success;}});
 assert.equal(result.status,'invalid_stored_link');
 assert.equal(calls,0);
 assert.equal(sql.prepare("SELECT count(*) AS n FROM monthly_reliability WHERE kind='diagnostic'").get().n,0);
 assert.equal(sql.prepare('SELECT research_month FROM failed_link_attempts WHERE owner_id=?').get(owner).research_month,'2026-11');
 assert.equal((await pageFailedLinks(db,owner)).items.length,1);
});
