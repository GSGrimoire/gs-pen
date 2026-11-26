import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {replayLink,recordFailedLink,pageFailedLinks,pageFailedAttempts,deleteFailedLink,exportFailedAttempt} from '../server/failed-links.mjs';
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../drizzle/0003_failed_link_attempts.sql',import.meta.url),'utf8'));
 const db={prepare(query){let args=[];const api={bind(...v){args=v;return api;},async first(){return sql.prepare(query).get(...args);},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return sql.prepare(query).run(...args);}};return api;}};
 return db;
}
const source='https://www.facebook.com/share/r/Fixture123/?tracking=secret#private';
const traceId='00000000-0000-4000-8000-000000000001';
const opt=now=>({traceId,build:'fixture',now});
test('replay link removes tracking and keeps required public identifiers',()=>{
 assert.equal(replayLink(source).sourceUrl,'https://www.facebook.com/share/r/Fixture123');
 assert.equal(replayLink('https://www.facebook.com/story.php?story_fbid=12345678&id=12345679&tracking=secret').sourceUrl,'https://www.facebook.com/story.php?story_fbid=12345678&id=12345679');
 assert.equal(replayLink('https://user:pass@www.facebook.com/reel/12345678'),null);
 assert.equal(replayLink('https://evil.test/'),null);
});
test('records partial and failure, groups retries, resolves only previous cases, isolates owners and deletes',async()=>{
 const db=setup();
 assert.equal(await recordFailedLink(db,'a',source,{ok:true,code:'OK'},opt(1)),'not_eligible');
 await recordFailedLink(db,'a',source,{ok:false,code:'LOGIN_REQUIRED'},opt(2));
 await recordFailedLink(db,'a',source.replace('secret','other'),{ok:false,code:'NOT_IMPLEMENTED',post:{text:'not stored'}},opt(3));
 await recordFailedLink(db,'a',source,{ok:true,code:'OK'},opt(4));
 const {items}=await pageFailedLinks(db,'a');assert.equal(items.length,1);assert.equal(items[0].attempts,3);assert.equal(items[0].failures,2);assert.equal(items[0].status,'resolved');assert.equal(items[0].firstAt,2);
 assert.equal((await pageFailedLinks(db,'b')).items.length,0);
 await assert.rejects(pageFailedAttempts(db,'b',items[0].id));
 const history=await pageFailedAttempts(db,'a',items[0].id);assert.deepEqual(history.items.map(x=>x.status),['resolved','partial','failed']);
 assert.ok(!JSON.stringify(history).includes('not stored'));assert.ok(!JSON.stringify(history).includes('secret'));
 await deleteFailedLink(db,'a',items[0].id);assert.equal((await pageFailedLinks(db,'a')).items.length,0);
});
test('export refuses missing token or public target; only exports bounded normalized attempt; identical retry reconciles',async()=>{
 const db=setup();await recordFailedLink(db,'a',source,{ok:false,code:'LOGIN_REQUIRED'},opt(2));
 const id=(await pageFailedLinks(db,'a')).items[0].id;
 await assert.rejects(exportFailedAttempt({DB:db},'a',id),e=>e.code==='RESEARCH_NOT_CONFIGURED');
 const env={DB:db,GS_PEN_RESEARCH_TOKEN:'test-secret'};
 let calls=0;await assert.rejects(exportFailedAttempt(env,'a',id,{fetchImpl:async()=>{calls++;return Response.json({id:1473734015,private:false});}}),e=>e.code==='RESEARCH_TARGET_REJECTED');assert.equal(calls,1);
 let content;const fetchImpl=async(url,o)=>{assert.equal(o.redirect,'error');assert.ok(url.startsWith('https://api.github.com/repos/GSGrimoire/gs-pen-research'));
 if(!url.includes('/contents/'))return Response.json({id:1473734015,private:true,visibility:'private',full_name:'GSGrimoire/gs-pen-research',default_branch:'main'});
 if(o.method==='PUT'){content=JSON.parse(o.body).content;const raw=atob(content);assert.ok(raw.includes('Fixture123'));assert.ok(!raw.includes('tracking'));assert.ok(!raw.includes('test-secret'));return new Response(null,{status:201});}
 return content?Response.json({encoding:'base64',content}):new Response(null,{status:404});};
 assert.equal((await exportFailedAttempt(env,'a',id,{fetchImpl})).reused,false);
 assert.equal((await exportFailedAttempt(env,'a',id,{fetchImpl})).reused,true);
 await assert.rejects(exportFailedAttempt(env,'b',id,{fetchImpl}));
});
