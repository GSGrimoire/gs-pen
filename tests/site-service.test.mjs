import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleSiteRequest,RETENTION_MS } from '../server/site-service.mjs';
function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../drizzle/0000_curvy_cargill.sql',import.meta.url),'utf8'));
 const db={prepare(query){let args=[];const api={bind(...values){args=values;return api;},async run(){return sql.prepare(query).run(...args);},async first(){return sql.prepare(query).get(...args);},async all(){return {results:sql.prepare(query).all(...args)};}};return api;},async batch(statements){sql.exec('BEGIN');try{for(const s of statements)await s.run();sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}};
 return {env:{DB:db,GS_PEN_OWNER_EMAIL:'owner@example.test'},sql};
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
 for(const k of ['writePassed','privacyPassed','deletePassed','expiryPassed'])assert.equal(response[k],true);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM diagnostic_events').get().n,1);
});
test('Site caption resolver returns native timed cues; stores only technical events',async()=>{
 const {env,sql}=setup();let count=0;
 const fetchImpl=async()=>++count===1?new Response('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+JSON.stringify({caption_infos:[{url:'https://v.tiktokcdn.com/subtitle?signature=private'}]})+'</script>'):new Response('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nPrivate synthetic caption\n');
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
