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
test('Rate-limited extraction attempts create one sanitized diagnostic event per minute',async()=>{
 const {env,sql}=setup();const short='https://vm.tiktok.com/ZFixture123/?tracking=sensitive';
 let providerCalls=0;
 for(let n=0;n<14;n++){
  const response=await handleSiteRequest(req('captions','POST',{url:short}),env,{fetchImpl:async()=>{providerCalls++;return new Response(null,{status:403});},now:60000});
  assert.equal(response.status,n<10?200:429);
 }
 assert.equal(providerCalls,10);
 const events=sql.prepare('SELECT payload FROM diagnostic_events').all().map(r=>JSON.parse(r.payload));
 const denied=events.filter(e=>e.code==='RATE_LIMITED');
 assert.equal(denied.length,1);
 assert.equal(denied[0].linkType,'short_link');
 assert.equal(denied[0].requiresRedirect,true);
 assert.equal(denied[0].stage,'finished');
 const raw=JSON.stringify(events);
 assert.ok(!raw.includes('ZFixture123'));
 assert.ok(!raw.includes('tracking=sensitive'));
});

test('Site resolves short links and stores real partial/full results without logging the video identity',async()=>{
 const {env,sql}=setup();const id='1234567890123456789';
 const canonical='https://www.tiktok.com/@fixture/video/'+id;
 const item={id,desc:'Private synthetic post',video:{caption_infos:[{url:'https://v.tiktokcdn.com/subtitle?signature=secret'}]}};
 const markup='<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+JSON.stringify({__DEFAULT_SCOPE__:{'webapp.video-detail':{itemInfo:{itemStruct:item}}}})+'</script>';
 let calls=0;
 const response=await (await handleSiteRequest(req('captions','POST',{url:'https://vm.tiktok.com/ZFixture123/'}),env,{fetchImpl:async()=>++calls===1?
  new Response(null,{status:302,headers:{location:canonical}}):calls===2?
  new Response(markup):new Response('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nPrivate speech\n')
 })).json();
 assert.equal(response.ok,true);
 assert.equal(response.cues.length,1);
 assert.equal(response.historyStatus,'saved');
 assert.equal(response.diagnosticsStored,true);
 assert.equal(calls,3);
 assert.ok(response.events.some(e=>e.stage==='share_link_resolution'&&e.redirectCount===1));
 const raw=JSON.stringify(sql.prepare('SELECT payload FROM diagnostic_events').all());
 for(const privateValue of [id,'ZFixture123','@fixture','signature=secret','Private speech'])assert.ok(!raw.includes(privateValue));
});

test('Facebook short-share link resolves to a saved, provenance-labeled public preview without captions',async()=>{
 const {env,sql}=setup(),id='123456789012345';
 let calls=0;
 const result=await (await handleSiteRequest(req('captions','POST',{url:'https://fb.watch/Synthetic123/?mibextid=private'}),env,{fetchImpl:async(url,options)=>{
  calls++;
  assert.equal(options.redirect,'manual');
  if(calls===1)return new Response(null,{status:302,headers:{location:'https://www.facebook.com/reel/'+id+'?secret=discard'}});
  assert.equal(url,'https://www.facebook.com/reel/'+id);
  return new Response('<meta property="og:title" content="10 views | Synthetic Facebook post #test | Fixture Author">');
 }})).json();
 assert.equal(calls,2);
 assert.equal(result.ok,false);
 assert.equal(result.code,'NOT_IMPLEMENTED');
 assert.equal(result.post.status,'succeeded');
 assert.equal(result.post.completeness,'page_preview_may_be_truncated');
 assert.equal(result.historyStatus,'saved');
 assert.deepEqual(result.cues,[]);
 assert.ok(result.events.some(e=>e.stage==='share_link_resolution'&&e.status==='succeeded'));
 const raw=JSON.stringify(sql.prepare('SELECT payload FROM diagnostic_events').all());
 for(const x of ['Synthetic123','mibextid','Fixture Author',id,'Synthetic Facebook post'])assert.ok(!raw.includes(x));
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

test('Owners can explicitly delete content jobs and their source copies without deleting the original extraction',async()=>{
 const {env,sql}=setup();const {saveExtraction}=await import('../server/history.mjs');
 const source=await saveExtraction(env.DB,'trusted-test-id','https://www.facebook.com/reel/123456789012345',{cues:[],post:{text:'Synthetic source excerpt',status:'succeeded'}});
 const create=await(await handleSiteRequest(req('content','POST',{idea:'A new creation',extractionId:source}),env)).json();const job=create.job;
 const deletion=()=>req('content/'+job.id,'DELETE');
 for(const identity of [null,'other@example.test'])assert.equal((await handleSiteRequest(req('content/'+job.id,'DELETE',undefined,identity),env)).status,403);
 assert.equal((await handleSiteRequest(req('content/'+job.id,'DELETE',undefined,undefined,{origin:'https://foreign.test'}),env)).status,403);
 const other=deletion();other.headers.set('oai-authenticated-user-id','other-owner');assert.equal((await handleSiteRequest(other,{...env,GS_PEN_OWNER_ID:'other-owner'})).status,404);
 assert.equal((await handleSiteRequest(req('content/not-a-uuid','DELETE'),env)).status,404);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM content_jobs').get().n,1);
 // Source deletion retains separately saved work, as the confirmation dialog explains.
 assert.equal((await handleSiteRequest(req('history/'+source,'DELETE'),env)).status,200);
 assert.equal((await handleSiteRequest(req('content/'+job.id),env)).status,200);
 assert.equal((await handleSiteRequest(deletion(),env)).status,200);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM content_jobs').get().n,0);
 assert.equal((await handleSiteRequest(req('content/'+job.id),env)).status,404);
 assert.equal((await handleSiteRequest(req('content/'+job.id+'/poster'),env)).status,404);
 assert.equal((await handleSiteRequest(deletion(),env)).status,404);
 const original=await saveExtraction(env.DB,'trusted-test-id','https://www.facebook.com/reel/123456789012345',{cues:[],post:{text:'Original remains',status:'succeeded'}});
 const standalone=await(await handleSiteRequest(req('content','POST',{idea:'Another job',extractionId:original}),env)).json();
 await handleSiteRequest(req('content/'+standalone.job.id,'DELETE'),env);
 assert.equal((await handleSiteRequest(req('history/'+original),env)).status,200);
});

test('Retained lists traverse tied timestamps and deleted cursor rows without loading source bodies',async()=>{
 const {env,sql}=setup(),ids=[],now=Date.now();
 const payload=JSON.stringify({code:'OK',cues:[{text:'PRIVATE_CAPTION_SENTINEL'}],post:{text:'PRIVATE_POST_SENTINEL'.repeat(1000)},metadata:{status:'succeeded',fields:{title:'Fixture title',creator:'Fixture creator'}}});
 const ex=sql.prepare('INSERT INTO extractions (id,owner_id,source_url,platform,created_at,expires_at,payload) VALUES (?,?,?,?,?,?,?)');
 const job=sql.prepare('INSERT INTO content_jobs (id,owner_id,input_hash,version,created_at,updated_at,payload) VALUES (?,?,?,1,?,?,?)');
 for(let i=0;i<103;i++){const id=crypto.randomUUID(),time=now+Math.floor(i/5);ids.push(id);ex.run(id,'trusted-test-id','https://www.facebook.com/reel/123456789012345','facebook',time,0,payload);job.run(id,'trusted-test-id','hash_'+i,time,time,JSON.stringify({brief:{idea:'Fixture idea',format:'facebook_post',source:{text:'PRIVATE_SOURCE_SENTINEL'}},draft:null}));}
 const foreign=crypto.randomUUID();ex.run(foreign,'other-owner','https://www.facebook.com/reel/123456789012345','facebook',now+1000,0,payload);job.run(foreign,'other-owner','foreign_hash',now+1000,now+1000,JSON.stringify({brief:{idea:'Foreign idea'},draft:null}));
 for(const [path,key,table] of [['history','items','extractions'],['content','jobs','content_jobs']]){
  const queries=[],prepare=env.DB.prepare;env.DB.prepare=q=>{queries.push(q);return prepare(q);};const first=await(await handleSiteRequest(req(path),env)).json();env.DB.prepare=prepare;
  assert.equal(first[key].length,50);assert.equal(first.total,103);assert.equal(first.limit,50);assert.ok(first.nextCursor);assert.ok(queries.every(q=>!q.includes('SELECT *')));assert.ok(!JSON.stringify(first).includes('PRIVATE_'));assert.ok(!JSON.stringify(first).includes('Foreign idea'));
  sql.prepare('DELETE FROM '+table+' WHERE id=?').run(first[key].at(-1).id);
  const second=await(await handleSiteRequest(req(path+'?cursor='+encodeURIComponent(first.nextCursor)),env)).json();assert.equal(second[key].length,50);assert.equal(second.total,102);
  const third=await(await handleSiteRequest(req(path+'?cursor='+encodeURIComponent(second.nextCursor)),env)).json();assert.equal(third[key].length,3);assert.equal(third.nextCursor,null);
  const seen=[...first[key],...second[key],...third[key]].map(x=>x.id);assert.equal(new Set(seen).size,103);assert.ok(ids.every(id=>seen.includes(id)));assert.ok(!seen.includes(foreign));
  const other=req(path+'?cursor='+encodeURIComponent(first.nextCursor));other.headers.set('oai-authenticated-user-id','other-owner');const isolated=await(await handleSiteRequest(other,{...env,GS_PEN_OWNER_ID:'other-owner'})).json();assert.equal(isolated.total,1);assert.equal(isolated[key].length,0);
 }
 assert.ok(JSON.stringify(await(await handleSiteRequest(req('history/'+ids[0]),env)).json()).includes('PRIVATE_CAPTION_SENTINEL'));
});
test('List cursors are bounded and cannot bypass owner authentication or widen page size',async()=>{
 const {env}=setup();for(const path of ['history','content']){
  for(const cursor of ['', 'x'.repeat(200), '123:bad-id', '-1:00000000-0000-4000-8000-000000000001', '9999999999999999:00000000-0000-4000-8000-000000000001', "0:'); DROP TABLE extractions;--"]){const r=await handleSiteRequest(req(path+'?cursor='+encodeURIComponent(cursor)),env);assert.equal(r.status,400);assert.equal((await r.json()).code,'INVALID_PAGE_CURSOR');}
  for(const identity of [null,'other@example.test'])assert.equal((await handleSiteRequest(req(path+'?cursor=forged','GET',undefined,identity),env)).status,403);
  const empty=await(await handleSiteRequest(req(path+'?limit=999999'),env)).json();assert.equal(empty.limit,50);assert.equal(empty.total,0);assert.equal(empty.nextCursor,null);
 }
});
test('The assistant list contract exposes summaries and an optional bounded cursor only',async()=>{
 const {env}=setup();const call=async args=>{const r=req('ignored','POST',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'list_content_jobs',arguments:args}});return(await(await handleSiteRequest(new Request('https://pen.test/mcp',r),env)).json()).result;};
 assert.deepEqual(JSON.parse((await call({})).content[0].text),{jobs:[],total:0,nextCursor:null,limit:50});
 const invalid=await call({cursor:42});assert.equal(invalid.isError,true);assert.equal(JSON.parse(invalid.content[0].text).code,'INVALID_PAGE_CURSOR');assert.equal((await call({ownerId:'other-owner'})).isError,true);
});
