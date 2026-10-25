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
test('Legacy-expired diagnostics survive health, reads, writes and the paused housekeeping route',async()=>{
 const {env,sql}=setup(),now=Date.now();await handleSiteRequest(req('diagnostics','POST',data),env,{now});
 sql.prepare('UPDATE diagnostic_events SET expires_at=?').run(now);
 await handleSiteRequest(req('health'),env,{now:now+RETENTION_MS});
 const listed=await (await handleSiteRequest(req('diagnostics'),env,{now:now+RETENTION_MS})).json();
 assert.equal(listed.events.length,1);assert.equal(listed.retentionPaused,true);assert.equal(listed.retentionDays,null);
 await handleSiteRequest(req('diagnostics','POST',data),env,{now:now+RETENTION_MS});
 const retention=await(await handleSiteRequest(req('retention','POST',undefined,null),env,{now:now+RETENTION_MS})).json();
 assert.equal(retention.expiredDeleted,false);assert.equal(retention.retentionPaused,true);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM diagnostic_events').get().n,2);
 assert.equal((await handleSiteRequest(req('retention','POST',undefined,'other@example.test'),env)).status,403);
 assert.equal((await handleSiteRequest(req('retention','POST',undefined,null,{origin:'https://foreign.test'}),env)).status,403);
});
test('Owner delete physically clears records',async()=>{
 const {env,sql}=setup();await handleSiteRequest(req('diagnostics','POST',data),env);await handleSiteRequest(req('diagnostics','DELETE'),env);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM diagnostic_events').get().n,0);
});
test('Authenticated storage check exercises real SQL without changing existing records',async()=>{
 const {env,sql}=setup();await handleSiteRequest(req('diagnostics','POST',data),env);
 assert.equal((await handleSiteRequest(req('storage-check','POST',{},null),env)).status,403);
 const response=await (await handleSiteRequest(req('storage-check','POST',{}),env)).json();
 for(const k of ['writePassed','privacyPassed','deletePassed','retentionPausedPassed','historyWritePassed','historyIsolationPassed','historyDeletePassed','historyRetentionPausedPassed'])assert.equal(response[k],true);
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
test('History preserves more than 50 results and old expiry values, with only a bounded list window',async()=>{
 const {saveExtraction,readExtraction,listExtractions}=await import('../server/history.mjs');const {env,sql}=setup();const now=Date.now();const result={ok:false,code:'CAPTIONS_NOT_FOUND',cues:[],post:{status:'succeeded',text:'Fixture post'},metadata:{status:'unavailable'}};
 const source='https://www.facebook.com/watch/?v=123456789012345&tracking=private';
 await saveExtraction(env.DB,'different-owner',source,result,now);
 let oldest;
 for(let i=0;i<52;i++){const id=await saveExtraction(env.DB,'trusted-test-id',source,result,now+i);oldest??=id;}
 assert.equal(sql.prepare('SELECT count(*) AS n FROM extractions WHERE owner_id=?').get('trusted-test-id').n,52);
 sql.prepare('UPDATE extractions SET expires_at=?').run(now);
 const items=(await (await handleSiteRequest(req('history'),env,{now:now+RETENTION_MS+52})).json()).items;
 assert.equal(items.length,50);assert.equal(items[0].sourceUrl,'https://www.facebook.com/watch/?v=123456789012345');assert.equal(items[0].expiresAt,null);
 const opened=await readExtraction(env.DB,'trusted-test-id',oldest,now+RETENTION_MS+52);assert.equal(opened.result.post.text,'Fixture post');
 assert.equal(await readExtraction(env.DB,'different-owner',oldest,now+RETENTION_MS+52),null);
 assert.equal((await listExtractions(env.DB,'different-owner',now+RETENTION_MS+52)).length,1);
 await handleSiteRequest(req('retention','POST'),env,{now:now+RETENTION_MS+52});assert.equal(sql.prepare('SELECT count(*) AS n FROM extractions').get().n,53);
 assert.equal((await handleSiteRequest(req('history/'+oldest,'DELETE'),env)).status,200);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM extractions').get().n,52);
});
test('The diagnostic listing cap does not delete stored records',async()=>{
 const {env,sql}=setup(),now=Date.now();const insert=sql.prepare('INSERT INTO diagnostic_events (id,created_at,expires_at,payload) VALUES (?,?,?,?)');
 sql.exec('BEGIN');for(let i=0;i<10001;i++)insert.run('fixture_'+i,now+i,now,JSON.stringify(data));sql.exec('COMMIT');
 await handleSiteRequest(req('diagnostics','POST',data),env,{now:now+RETENTION_MS});
 const listed=await(await handleSiteRequest(req('diagnostics'),env,{now:now+RETENTION_MS})).json();assert.equal(listed.events.length,10000);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM diagnostic_events').get().n,10002);
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


test('Health detects an unavailable history table without relying on expiry side effects',async()=>{
 const {env,sql}=setup();sql.exec('DROP TABLE extractions');
 const health=await(await handleSiteRequest(req('health'),env)).json();assert.equal(health.historyAvailable,false);assert.equal(health.centralSiteStorage,true);assert.equal(health.retentionPaused,true);
});

test('Content jobs are owner-scoped, reuse identical briefs and reject stale creative edits',async()=>{
 const {env,sql}=setup();const input={idea:'A lighthouse key',sourceChars:2000};
 const create=async()=> (await(await handleSiteRequest(req('content','POST',input),env)).json());
 const first=await create(),again=await create();assert.equal(first.reused,false);assert.equal(again.reused,true);assert.equal(first.job.id,again.job.id);assert.equal(sql.prepare('SELECT count(*) AS n FROM content_jobs').get().n,1);
 const job=first.job;const content={title:'The Lighthouse Key',message:'A key that glows near lost sailors.',hashtags:['#DnD'],visualBrief:'A brass key in fog.'};
 const foreign={...env,GS_PEN_OWNER_ID:'different-owner'};const isolated=req('content/'+job.id);isolated.headers.set('oai-authenticated-user-id','different-owner');assert.equal((await handleSiteRequest(isolated,foreign)).status,404);
 const saved=await handleSiteRequest(req('content/draft','POST',{id:job.id,inputHash:job.inputHash,version:job.version,draft:content}),env);assert.equal(saved.status,200);assert.equal((await saved.json()).job.version,2);
 assert.equal((await handleSiteRequest(req('content/draft','POST',{id:job.id,inputHash:job.inputHash,version:1,draft:content}),env)).status,409);
 const exported=await(await handleSiteRequest(req('content/'+job.id+'/poster'),env)).json();assert.equal(exported.submissionStatus,'not_sent');assert.equal(exported.arguments.message,content.message+'\n\n#DnD');
 const rows=JSON.stringify(sql.prepare('SELECT payload FROM diagnostic_events').all());assert.ok(!rows.includes('lighthouse'));
});
test('Content source ownership and request bounds cannot be bypassed with client result uploads',async()=>{
 const {env}=setup();const input={idea:'New idea',extractionId:'00000000-0000-4000-8000-000000000099'};
 assert.equal((await handleSiteRequest(req('content','POST',input),env)).status,404);
 assert.equal((await handleSiteRequest(req('content','POST',{idea:'x',source:{text:'arbitrary'}}),env)).status,400);
 assert.equal((await handleSiteRequest(req('content','POST',{idea:'x'.repeat(33000)}),env)).status,413);
 for(const identity of [null,'other@example.test'])for(const [path,method,body] of [['content','GET'],['content','POST',{idea:'x'}],['content/draft','POST',{}]])assert.equal((await handleSiteRequest(req(path,method,body,identity),env)).status,403);
 assert.equal((await handleSiteRequest(req('content','POST',{idea:'x'},undefined,{origin:'https://foreign.test'}),env)).status,403);
});
test('The authenticated assistant interface exposes bounded workflow tools without publishing or model calls',async()=>{
 const {env}=setup();const mcp=(method,params,identity='owner@example.test')=>{const r=req('ignored','POST',{jsonrpc:'2.0',id:1,method,params},identity);return handleSiteRequest(new Request('https://pen.test/mcp',r),env);};
 assert.equal((await mcp('tools/list',{},null)).status,403);
 const listed=await(await mcp('tools/list',{})).json();assert.equal(listed.result.tools.length,5);assert.ok(listed.result.tools.every(t=>!t.name.includes('publish')));
 const created=await(await mcp('tools/call',{name:'create_content_job',arguments:{idea:'A compact creative job'}})).json();const job=JSON.parse(created.result.content[0].text);assert.ok(job.prompt);assert.equal(job.brief,undefined);
 const brief=await(await mcp('tools/call',{name:'get_content_brief',arguments:{id:job.jobId}})).json();const compact=JSON.parse(brief.result.content[0].text);assert.equal(compact.budget.serverModelCalls,0);assert.ok(compact.prompt.includes('quoted data'));
 const save=await(await mcp('tools/call',{name:'save_content_draft',arguments:{id:job.jobId,inputHash:job.inputHash,version:job.version,draft:{title:'An item',message:'An original item for your next adventure.'}}})).json();const receipt=JSON.parse(save.result.content[0].text);assert.equal(receipt.status,'draft_ready');assert.equal(receipt.prompt,undefined);assert.equal(receipt.brief,undefined);assert.equal(receipt.draft,undefined);
 const cached=await(await mcp('tools/call',{name:'create_content_job',arguments:{idea:'A compact creative job'}})).json();const reused=JSON.parse(cached.result.content[0].text);assert.equal(reused.reused,true);assert.equal(reused.status,'draft_ready');assert.equal(reused.prompt,undefined);assert.equal(reused.draft.title,'An item');
 const unsafe=await(await mcp('tools/call',{name:'publish',arguments:{}})).json();assert.equal(unsafe.result.isError,true);assert.ok(!JSON.stringify(unsafe).includes('stack'));
 const initialized=await(await mcp('initialize',{protocolVersion:'2025-06-18'})).json();assert.equal(initialized.result.protocolVersion,'2025-06-18');
});


test('Creative sources cannot be borrowed from another owner and full originals stay in history',async()=>{
 const {env,sql}=setup();const {saveExtraction}=await import('../server/history.mjs');const content={ok:false,code:'PARTIAL_RESULT',cues:[],post:{text:'A long original source. '.repeat(400),status:'succeeded',provenance:'Synthetic fixture',completeness:'page_preview_may_be_truncated'},metadata:{status:'unavailable'}};
 const other=await saveExtraction(env.DB,'other-owner','https://www.facebook.com/reel/123456789012345',content);
 assert.equal((await handleSiteRequest(req('content','POST',{idea:'New magic',extractionId:other}),env)).status,404);
 const own=await saveExtraction(env.DB,'trusted-test-id','https://www.facebook.com/reel/123456789012345',content);
 const created=await(await handleSiteRequest(req('content','POST',{idea:'New magic',extractionId:own,sourceChars:2000}),env)).json();assert.equal(created.job.brief.source.truncated,true);assert.equal(created.job.brief.source.selectedCharacters,2000);assert.equal(created.job.brief.source.provenance.postCompleteness,'page_preview_may_be_truncated');
 const archived=JSON.parse(sql.prepare('SELECT payload FROM extractions WHERE id=?').get(own).payload);assert.equal(archived.post.text,content.post.text);
});
