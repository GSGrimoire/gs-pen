import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync,readdirSync } from 'node:fs';
import { handleSiteRequest,RETENTION_MS } from '../server/site-service.mjs';
function setup(){
 const sql=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const db={prepare(query){let args=[];const api={bind(...values){args=values;return api;},async run(){return sql.prepare(query).run(...args);},async first(){return sql.prepare(query).get(...args);},async all(){return {results:sql.prepare(query).all(...args)};}};return api;},async batch(statements){sql.exec('BEGIN');try{for(const s of statements)await s.run();sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}};
 return {env:{DB:db,GS_PEN_OWNER_EMAIL:'owner@example.test',GS_PEN_OWNER_ID:'trusted-test-id'},sql};
}
function req(path,method='GET',body,identity='owner@example.test',extras={}){
 const headers={...extras};if(identity){headers['oai-authenticated-user-id']='trusted-test-id';headers['oai-authenticated-user-email']=identity;}
 if(body!==undefined)headers['content-type']='application/json';
 return new Request('https://pen.test/api/'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
}
const data={traceId:'00000000-0000-4000-8000-000000000001',platform:'tiktok',stage:'finished',status:'failed',code:'NETWORK_ERROR'};
test('Site backend denies absent, alternate and mismatched identity on every data endpoint',async()=>{
 const {env}=setup();for(const identity of [null,'other@example.test'])for(const [p,m,b] of [['health','GET'],['diagnostics','GET'],['diagnostics','POST',data],['diagnostics','DELETE'],['captions','POST',{url:'https://www.tiktok.com/@test/video/1234567890123456789'}]]){
  assert.equal((await handleSiteRequest(req(p,m,b,identity),env)).status,403);
 }
 assert.equal((await handleSiteRequest(req('health'),{...env,GS_PEN_OWNER_ID:'wrong'})).status,403);
 assert.equal((await handleSiteRequest(req('health'),{...env,GS_PEN_OWNER_ID:''})).status,403);
 assert.equal((await handleSiteRequest(req('health'),{...env,GS_PEN_OWNER_EMAIL:''})).status,403);
});
test('Site mutations reject cross-origin requests and oversized bodies',async()=>{
 const {env}=setup();assert.equal((await handleSiteRequest(req('diagnostics','POST',data,undefined,{origin:'https://evil.test'}),env)).status,403);
 assert.equal((await handleSiteRequest(req('diagnostics','POST',{...data,raw:'x'.repeat(5000)}),env)).status,400);
});
test('Database automatically persists sanitized browser events, ignores identity/build and raw error fields',async()=>{
 const {env,sql}=setup();const result=await handleSiteRequest(req('diagnostics','POST',{...data,traceId:'private_video_1234',build:'private_account',ownerId:'sensitive',message:'sensitive',url:'https://secret.test/creator',captionText:'secret speech',cookie:'sensitive'}),env);
 assert.equal((await result.json()).saved,true);
 const raw=sql.prepare('SELECT payload FROM diagnostic_events').get().payload;
 for(const x of ['sensitive','secret','private_'])assert.ok(!raw.includes(x));
 assert.equal((await (await handleSiteRequest(req('diagnostics'),env)).json()).events.length,1);
 assert.equal((await handleSiteRequest(req('health'),env)).headers.get('cache-control'),'private, no-store');
});
test('Thirty-day expiry physically deletes rows on reads and housekeeping without user interaction',async()=>{
 const {env,sql}=setup(),now=Date.now();await handleSiteRequest(req('diagnostics','POST',data),env,{now});
 assert.equal((await (await handleSiteRequest(req('diagnostics'),env,{now:now+RETENTION_MS-1})).json()).events.length,1);
 await handleSiteRequest(req('retention','POST'),env,{now:now+RETENTION_MS});
 assert.equal(sql.prepare('SELECT count(*) AS n FROM diagnostic_events').get().n,0);
 await handleSiteRequest(req('diagnostics','POST',data),env,{now});
 assert.equal((await (await handleSiteRequest(req('diagnostics'),env,{now:now+RETENTION_MS+1})).json()).events.length,0);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM diagnostic_events').get().n,0);
});
test('Owner delete physically clears records',async()=>{
 const {env,sql}=setup();await handleSiteRequest(req('diagnostics','POST',data),env);await handleSiteRequest(req('diagnostics','DELETE'),env);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM diagnostic_events').get().n,0);
});
test('Authenticated storage check exercises real SQL without changing existing records',async()=>{
 const {env,sql}=setup();await handleSiteRequest(req('diagnostics','POST',data),env);
 assert.equal((await handleSiteRequest(req('storage-check','POST',{},null),env)).status,403);
 const response=await (await handleSiteRequest(req('storage-check','POST',{}),env)).json();
 for(const k of ['writePassed','privacyPassed','deletePassed','expiryPassed','historyWritePassed','historyIsolationPassed','historyDeletePassed','historyExpiryPassed'])assert.equal(response[k],true);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM diagnostic_events').get().n,1);
});
test('Site caption resolver returns native timed cues; stores only technical events',async()=>{
 const {env,sql}=setup();let count=0;
 const fetchImpl=async()=>++count===1?new Response('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+JSON.stringify({__DEFAULT_SCOPE__:{'webapp.video-detail':{itemInfo:{itemStruct:{id:'1234567890123456789',video:{caption_infos:[{url:'https://v.tiktokcdn.com/subtitle?signature=private'}]}}}}}})+'</script>'):new Response('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nPrivate synthetic caption\n');
 const response=await (await handleSiteRequest(req('captions','POST',{traceId:data.traceId,url:'https://www.tiktok.com/@creator/video/1234567890123456789?secret=value'}),env,{fetchImpl})).json();
 assert.equal(response.ok,true);assert.equal(response.cues.length,1);assert.equal(response.diagnosticsStored,true);
 const raw=JSON.stringify(sql.prepare('SELECT * FROM diagnostic_events').all());
 for(const word of ['@creator','1234567890123456789','signature','Private synthetic caption','secret=value'])assert.ok(!raw.includes(word),word);
 assert.ok(response.events.every(e=>e.source==='site'&&e.transport==='site_backend'));
});
test('Provider failures are categorized; diagnostic database outage never blocks caption response',async()=>{
 const {env}=setup();env.DB={prepare(){throw Error('private database exception');}};
 const response=await (await handleSiteRequest(req('captions','POST',{url:'https://www.tiktok.com/@creator/video/1234567890123456789'}),env,{fetchImpl:async()=>new Response('',{status:403})})).json();
 assert.equal(response.code,'PROVIDER_BLOCKED');assert.equal(response.diagnosticsStored,false);assert.ok(!JSON.stringify(response).includes('private database'));
});
test('Durable request budget restricts repeated provider calls',async()=>{
 const {env}=setup();let count=0;const fetchImpl=async()=>{count++;return new Response('',{status:403});};
 for(let n=0;n<10;n++)assert.equal((await handleSiteRequest(req('captions','POST',{url:'https://www.tiktok.com/@creator/video/1234567890123456789'}),env,{fetchImpl,now:60000})).status,200);
 assert.equal((await handleSiteRequest(req('captions','POST',{url:'https://www.tiktok.com/@creator/video/1234567890123456789'}),env,{fetchImpl,now:60000})).status,429);assert.equal(count,10);
});
test('Site returns TikTok post fields while database stores only availability and technical categories',async()=>{
 const {env,sql}=setup();const id='1234567890123456789';
 const item={id,desc:'Private post sentinel #secret',author:{nickname:'Private creator sentinel',uniqueId:'private_handle'},video:{duration:5},stats:{playCount:99}};
 const markup='<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+JSON.stringify({__DEFAULT_SCOPE__:{'webapp.video-detail':{itemInfo:{itemStruct:item}}}})+'</script>';
 const r=await (await handleSiteRequest(req('captions','POST',{url:'https://www.tiktok.com/@private_handle/video/'+id}),env,{fetchImpl:async()=>new Response(markup)})).json();
 assert.equal(r.post.text,item.desc);assert.equal(r.metadata.fields.creator,item.author.nickname);assert.equal(r.ok,false);assert.equal(r.diagnosticsStored,true);
 const raw=JSON.stringify(sql.prepare('SELECT payload FROM diagnostic_events').all());for(const value of [item.desc,'Private creator sentinel','private_handle',id])assert.ok(!raw.includes(value));
 assert.ok(r.events.some(e=>e.stage==='metadata_parse'&&e.metadataFound));
});

test('Automatically saved extractions reopen only for their owner, independently of diagnostics',async()=>{
 const {env,sql}=setup(),id='1234567890123456789';
 const markup='<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+JSON.stringify({__DEFAULT_SCOPE__:{'webapp.video-detail':{itemInfo:{itemStruct:{id,desc:'History-only text',author:{nickname:'History creator'},video:{duration:5}}}}}})+'</script>';
 const response=await (await handleSiteRequest(req('captions','POST',{url:'https://www.tiktok.com/@fixture/video/'+id+'?tracking=secret#fragment'}),env,{fetchImpl:async()=>new Response(markup)})).json();
 assert.equal(response.historyStatus,'saved');assert.ok(response.historyId);
 const items=(await (await handleSiteRequest(req('history'),env)).json()).items;assert.equal(items.length,1);assert.ok(!items[0].sourceUrl.includes('tracking'));assert.ok(!items[0].sourceUrl.includes('#'));assert.equal(items[0].creator,'History creator');
 const opened=await (await handleSiteRequest(req('history/'+response.historyId),env)).json();assert.equal(opened.item.result.post.text,'History-only text');assert.equal(opened.item.result.events,undefined);
 for(const method of ['GET','DELETE']){
  assert.equal((await handleSiteRequest(req('history/'+response.historyId,method,undefined,null),env)).status,403);
  assert.equal((await handleSiteRequest(req('history/'+response.historyId,method,undefined,'other@example.test'),env)).status,403);
  const isolated=req('history/'+response.historyId,method);isolated.headers.set('oai-authenticated-user-id','other-trusted-id');assert.equal((await handleSiteRequest(isolated,env)).status,403);assert.equal((await handleSiteRequest(isolated,{...env,GS_PEN_OWNER_ID:'other-trusted-id'})).status,404);
 }
 const isolated=req('history');isolated.headers.set('oai-authenticated-user-id','other-trusted-id');assert.equal((await handleSiteRequest(isolated,env)).status,403);assert.equal((await (await handleSiteRequest(isolated,{...env,GS_PEN_OWNER_ID:'other-trusted-id'})).json()).items.length,0);
 const raw=JSON.stringify(sql.prepare('SELECT payload FROM diagnostic_events').all());assert.ok(!raw.includes('History-only text'));assert.ok(!raw.includes('History creator'));
 await handleSiteRequest(req('diagnostics','DELETE'),env);assert.equal(sql.prepare('SELECT count(*) AS n FROM extractions').get().n,1);
 assert.equal((await handleSiteRequest(req('history/'+response.historyId,'DELETE'),env)).status,200);assert.equal(sql.prepare('SELECT count(*) AS n FROM extractions').get().n,0);
});
test('History enforces 50 newest results per owner and physically expires at thirty days',async()=>{
 const {saveExtraction}=await import('../server/history.mjs');const {env,sql}=setup();const now=Date.now();const result={ok:false,code:'CAPTIONS_NOT_FOUND',cues:[],post:{status:'succeeded',text:'Fixture post'},metadata:{status:'unavailable'}};
 const source='https://www.facebook.com/watch/?v=123456789012345&tracking=private';
 await saveExtraction(env.DB,'different-owner',source,result,now);
 for(let i=0;i<52;i++)await saveExtraction(env.DB,'trusted-test-id',source,result,now+i);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM extractions WHERE owner_id=?').get('trusted-test-id').n,50);
 assert.equal(sql.prepare('SELECT min(created_at) AS t FROM extractions WHERE owner_id=?').get('trusted-test-id').t,now+2);
 const items=(await (await handleSiteRequest(req('history'),env,{now:now+52})).json()).items;assert.equal(items.length,50);assert.equal(items[0].sourceUrl,'https://www.facebook.com/watch/?v=123456789012345');
 await handleSiteRequest(req('retention','POST'),env,{now:now+RETENTION_MS+52});assert.equal(sql.prepare('SELECT count(*) AS n FROM extractions').get().n,0);
});
test('History outages never block available content and failed/empty results are not saved',async()=>{
 const {env,sql}=setup();const r=await (await handleSiteRequest(req('captions','POST',{url:'https://www.facebook.com/reel/123456789012345'}),env,{fetchImpl:async()=>new Response('',{status:403})})).json();assert.equal(r.historyStatus,'empty');assert.equal(sql.prepare('SELECT count(*) AS n FROM extractions').get().n,0);
 sql.exec('DROP TABLE extractions');
 const partial=await (await handleSiteRequest(req('captions','POST',{url:'https://www.facebook.com/reel/123456789012345'}),env,{fetchImpl:async()=>new Response('<meta property="og:title" content="2 views | Fixture post | Fixture author">')})).json();assert.equal(partial.post.status,'succeeded');assert.equal(partial.historyStatus,'failed');assert.equal(partial.diagnosticsStored,true);
});
test('History endpoints reject foreign-origin deletion and unsupported client writes',async()=>{
 const {env}=setup();assert.equal((await handleSiteRequest(req('history/00000000-0000-4000-8000-000000000001','DELETE',undefined,undefined,{origin:'https://evil.test'}),env)).status,403);
 assert.equal((await handleSiteRequest(req('history','POST',{result:{text:'client supplied'}}),env)).status,404);
 assert.equal((await handleSiteRequest(req('history/not-a-uuid'),env)).status,404);
});
