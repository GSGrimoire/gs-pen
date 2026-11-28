import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {replayLink,recordFailedLink,pageFailedLinks,pageFailedAttempts,deleteFailedLink} from '../server/failed-links.mjs';
const migration=new URL('../drizzle/0003_failed_link_attempts.sql',import.meta.url);
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(migration,'utf8'));
 const db={prepare(query){let args=[];const api={bind(...v){args=v;return api;},async first(){return sql.prepare(query).get(...args);},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return sql.prepare(query).run(...args);}};return api;}};
 return {db,sql};
}
const source='https://www.facebook.com/share/r/Fixture123/?tracking=secret#private';
const traceId='00000000-0000-4000-8000-000000000001';
const opt=now=>({traceId,build:'fixture',now});
const failure={ok:false,code:'LOGIN_REQUIRED'};
test('normalizes every recognized link family without redirect or grouping unrelated forms',()=>{
 for(const [raw,want] of [
  [source,'https://www.facebook.com/share/r/Fixture123'],
  ['https://www.facebook.com/story.php?story_fbid=12345678&id=12345679&tracking=secret','https://www.facebook.com/story.php?story_fbid=12345678&id=12345679'],
  ['https://facebook.com/permalink.php?id=12345679&story_fbid=12345678','https://facebook.com/permalink.php?story_fbid=12345678&id=12345679'],
  ['https://facebook.com/photo.php?fbid=12345678&secret=x','https://facebook.com/photo.php?fbid=12345678'],
  ['https://www.facebook.com/watch/?v=12345678&tracking=x','https://www.facebook.com/watch?v=12345678'],
  ['https://facebook.com/reel/12345678/','https://facebook.com/reel/12345678'],
  ['https://facebook.com/a/videos/12345678','https://facebook.com/a/videos/12345678'],
  ['https://facebook.com/Fixture/posts/pfbid123456789','https://facebook.com/Fixture/posts/pfbid123456789'],
  ...['v','r','p'].map(t=>['https://facebook.com/share/'+t+'/Fixture123/','https://facebook.com/share/'+t+'/Fixture123']),
  ['https://facebook.com/share/Fixture123/','https://facebook.com/share/Fixture123'],
  ['https://fb.watch/Fixture123/','https://fb.watch/Fixture123'],
  ['https://www.tiktok.com/@fixture/video/1234567890123456789?x=y','https://www.tiktok.com/@fixture/video/1234567890123456789'],
  ['https://tiktok.com/t/Fixture123/','https://tiktok.com/t/Fixture123'],
  ['https://vm.tiktok.com/Fixture123/','https://vm.tiktok.com/Fixture123'],
  ['https://vt.tiktok.com/Fixture123/','https://vt.tiktok.com/Fixture123'],
  ['https://www.instagram.com/reel/Fixture123/','https://www.instagram.com/reel/Fixture123'],
  ['https://youtu.be/J---aiyznGQ?x=y','https://youtu.be/J---aiyznGQ'],
  ['https://youtube.com/watch?v=J---aiyznGQ&x=y','https://youtube.com/watch?v=J---aiyznGQ'],
  ['https://m.youtube.com/shorts/J---aiyznGQ','https://m.youtube.com/shorts/J---aiyznGQ']
 ])assert.equal(replayLink(raw)?.sourceUrl,want,raw);
 for(const raw of ['https://user:pass@www.facebook.com/reel/12345678','https://evil.test/','https://facebook.com//share/r/Fixture123','https://www.tiktok.com/@%41/video/1234567890123456789','https://youtube.com/watch?v=J---aiyznGQ&v=J---aiyznGQ','https://facebook.com/share/r/'+'x'.repeat(2048)])assert.equal(replayLink(raw),null,raw.slice(0,100));
 assert.ok(replayLink('https://facebook.com/share/r/'+'x'.repeat(500)));
 assert.notEqual(replayLink('https://fb.watch/Fixture123').sourceUrl,replayLink(source).sourceUrl);
});
test('records partial/failure, deterministic equal-time order, stable generation, owner isolation and regression',async()=>{
 const {db}=setup();assert.equal(await recordFailedLink(db,'a',source,{ok:true,code:'OK'},opt(1)),'not_eligible');
 await recordFailedLink(db,'a',source,failure,opt(2));
 const initial=(await pageFailedLinks(db,'a')).items[0];
 await recordFailedLink(db,'a',source.replace('secret','other'),{ok:false,code:'NOT_IMPLEMENTED',post:{text:'not stored'}},opt(2));
 await recordFailedLink(db,'a',source,{ok:true,code:'OK'},opt(2));
 const latest=(await pageFailedLinks(db,'a')).items[0];
 assert.equal(initial.id,latest.id);assert.equal(latest.attempts,3);assert.equal(latest.failures,2);assert.equal(latest.status,'resolved');
 assert.equal((await pageFailedLinks(db,'b')).items.length,0);
 await assert.rejects(pageFailedAttempts(db,'b',latest.id),e=>e.code==='FAILED_LINK_NOT_FOUND');
 const history=await pageFailedAttempts(db,'a',latest.id);assert.deepEqual(history.items.map(x=>x.status),['resolved','partial','failed']);
 assert.ok(!JSON.stringify(history).includes('not stored'));assert.ok(!JSON.stringify(history).includes('secret'));
 await assert.rejects(deleteFailedLink(db,'a',initial.id,initial.version),e=>e.code==='FAILED_LINK_CHANGED_OR_MISSING');
 await recordFailedLink(db,'a',source,failure,opt(2));
 const regressed=(await pageFailedLinks(db,'a')).items[0];assert.equal(regressed.status,'failed');
 await assert.rejects(deleteFailedLink(db,'b',regressed.id,regressed.version));
 await deleteFailedLink(db,'a',regressed.id,regressed.version);assert.equal((await pageFailedLinks(db,'a')).items.length,0);
 await recordFailedLink(db,'a',source,failure,opt(2));const fresh=(await pageFailedLinks(db,'a')).items[0];
 assert.notEqual(fresh.id,initial.id);await assert.rejects(deleteFailedLink(db,'a',initial.id,regressed.version));assert.equal((await pageFailedLinks(db,'a')).items.length,1);
});
test('stable case and attempt pages across concurrent append and deleted generations',async()=>{
 const {db}=setup();const links=Array.from({length:55},(_,i)=>'https://facebook.com/share/r/Fixture'+i);
 for(const link of links)await recordFailedLink(db,'a',link,failure,opt(1));
 const first=await pageFailedLinks(db,'a');assert.equal(first.items.length,50);
 await recordFailedLink(db,'a',links[0],failure,opt(1));await recordFailedLink(db,'a','https://facebook.com/share/r/BrandNew',failure,opt(1));
 const second=await pageFailedLinks(db,'a',first.nextCursor);assert.equal(second.items.length,5);assert.equal(second.items.at(-1).attempts,2);assert.equal(new Set([...first.items,...second.items].map(x=>x.id)).size,55);
 const id=second.items.at(-1).id;
 for(let i=0;i<52;i++)await recordFailedLink(db,'a',links[0],failure,opt(1));
 const a=await pageFailedAttempts(db,'a',id);assert.equal(a.items.length,50);
 await recordFailedLink(db,'a',links[0],failure,opt(1));const b=await pageFailedAttempts(db,'a',id,a.nextCursor);assert.equal(b.items.length,4);
 assert.equal(new Set([...a.items,...b.items].map(x=>x.id)).size,54);
 const latest=(await pageFailedLinks(db,'a',first.nextCursor)).items.at(-1);
 await deleteFailedLink(db,'a',id,latest.version);assert.deepEqual(await pageFailedAttempts(db,'a',id,a.nextCursor),{items:[],nextCursor:null});
 for(const cursor of ['', 'abc','-1','9007199254740992',1])await assert.rejects(pageFailedLinks(db,'a',cursor),e=>e.code==='INVALID_PAGE_CURSOR');
});
test('additive upgrade preserves legacy rows and snapshot definitions',()=>{
 const sql=new DatabaseSync(':memory:');
 const dir=new URL('../drizzle/',import.meta.url);
 for(const file of readdirSync(dir).filter(f=>/^000[0-2].*\.sql$/.test(f)).sort())sql.exec(readFileSync(new URL(file,dir),'utf8'));
 sql.exec("INSERT INTO diagnostic_events VALUES ('legacy',1,2,'{}'); INSERT INTO request_budget VALUES ('captions',1,2); INSERT INTO extractions VALUES ('legacy','owner','https://facebook.com/reel/12345678','facebook',1,2,'{}'); INSERT INTO content_jobs VALUES ('legacy','owner','hash',1,1,1,'{}');");
 const tables=['diagnostic_events','request_budget','extractions','content_jobs'],before=tables.map(t=>sql.prepare('SELECT * FROM '+t).all());
 sql.exec(readFileSync(migration,'utf8'));assert.deepEqual(tables.map(t=>sql.prepare('SELECT * FROM '+t).all()),before);
 const old=JSON.parse(readFileSync(new URL('meta/0002_snapshot.json',dir),'utf8')),next=JSON.parse(readFileSync(new URL('meta/0003_snapshot.json',dir),'utf8'));
 for(const table of tables)assert.deepEqual(next.tables[table],old.tables[table]);assert.equal(next.prevId,old.id);
 assert.deepEqual(sql.prepare("PRAGMA table_info('failed_link_attempts')").all().map(x=>x.name),Object.keys(next.tables.failed_link_attempts.columns));
});
