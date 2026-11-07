import test from 'node:test';
import assert from 'node:assert/strict';
import { tiktokContent,facebookContent } from '../server/post-content.mjs';
import { retrievePublicCaptions } from '../server/caption.mjs';
import { sanitizeDiagnostic } from '../src/diagnostics.mjs';
const id='1234567890123456789',url='https://www.tiktok.com/@synthetic/video/'+id;
const item={id,desc:'Private synthetic post #test #danskæ',createTime:'1700000000',author:{nickname:'Synthetic creator',uniqueId:'synthetic'},video:{duration:60,width:720,height:1280},stats:{playCount:123,diggCount:0}};
const html=(value=item)=>'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+JSON.stringify({__DEFAULT_SCOPE__:{'webapp.video-detail':{itemInfo:{itemStruct:value}}}})+'</script>';
test('TikTok post and metadata use matching video data, preserve zero counts and exclude media URLs',()=>{
 const r=tiktokContent(html(),id);assert.equal(r.post.text,item.desc);assert.deepEqual(r.post.hashtags,['#test','#danskæ']);assert.equal(r.metadata.fields.likes,0);assert.equal(r.metadata.fields.publishedAt,'2023-11-14T22:13:20.000Z');assert.equal(r.metadata.fields.creator,'Synthetic creator');
 assert.equal(tiktokContent(html({...item,id:'different'}),id).post.status,'unavailable');
 assert.equal(tiktokContent('broken',id).metadata.status,'unavailable');
});
test('Post data survives missing, blocked and malformed caption tracks, with one page fetch',async()=>{
 for(const mode of ['missing','blocked','malformed']){
  let calls=0;const events=[];
  const markup=mode==='missing'?html():html({...item,video:{subtitleInfos:[{url:'https://v.tiktokcdn.com/track'}]}});
  const r=await retrievePublicCaptions(url,{traceId:'synthetic',onEvent:e=>events.push(e),fetchImpl:async()=>++calls===1?new Response(markup):mode==='blocked'?new Response('',{status:403}):new Response('not a caption')});
  assert.equal(r.ok,false);assert.equal(r.post.text,item.desc);assert.equal(r.metadata.status,'succeeded');assert.equal(calls,mode==='missing'?1:2);
  const raw=JSON.stringify(events);for(const s of [id,'Synthetic creator','Private synthetic post','@synthetic'])assert.ok(!raw.includes(s));
  assert.ok(events.some(e=>e.stage==='post_parse'&&e.postTextFound));
 }
});
test('Facebook public share layout extracts longer text, creator and hashtags, and marks preview provenance',()=>{
 const r=facebookContent('<meta content="5 views · 2 reactions | Long synthetic story #magic &amp; #test | Synthetic Studio" property="og:title"><meta property="og:description" content="Short story...">',id);
 assert.equal(r.post.text,'Long synthetic story #magic & #test');assert.equal(r.post.completeness,'page_preview_may_be_truncated');assert.equal(r.metadata.fields.creator,'Synthetic Studio');assert.deepEqual(r.post.hashtags,['#magic','#test']);
 const generic=facebookContent('<meta property="og:title" content="Facebook"><meta property="og:description" content="Log into Facebook to start sharing">',id);
 assert.equal(generic.post.status,'unavailable');assert.equal(generic.metadata.status,'unavailable');
});
test('Facebook structured video fields are scoped to the requested video',()=>{
 const r=facebookContent('<script type="application/ld+json">'+JSON.stringify({'@type':'VideoObject',url:'https://www.facebook.com/reel/'+id,description:'Synthetic complete post',author:{name:'Fixture author'}})+'</script>',id);
 assert.equal(r.post.text,'Synthetic complete post');assert.equal(r.metadata.fields.creator,'Fixture author');
 assert.equal(facebookContent('<script type="application/json">'+JSON.stringify({__typename:'Video',id:'another',description:'unrelated'})+'</script>',id).post.status,'unavailable');
});
test('Facebook retrieval strips tracking, attempts only bounded share redirects and returns partial outputs',async()=>{
 let calls=0;const events=[];
 const r=await retrievePublicCaptions('https://m.facebook.com/reel/'+id+'?tracking=private',{traceId:'fixture',onEvent:e=>events.push(e),fetchImpl:async(u,options)=>{calls++;assert.equal(u,'https://www.facebook.com/reel/'+id);assert.equal(options.redirect,'manual');return new Response('<meta property="og:title" content="3 views | Synthetic post #test | Synthetic Author">');}});
 assert.equal(calls,1);assert.equal(r.post.status,'succeeded');assert.equal(r.ok,false);assert.equal(r.code,'NOT_IMPLEMENTED');assert.equal(r.cues.length,0);assert.ok(events.some(e=>e.stage==='metadata_parse'));
 let shortCalls=0;
 const short=await retrievePublicCaptions('https://fb.watch/fixture/',{fetchImpl:async()=>{shortCalls++;throw Error('synthetic network failure');}});
 assert.equal(shortCalls,1);
 assert.equal(short.code,'NETWORK_ERROR');
});
test('Network and provider failures propagate to post and metadata availability without inventing missing content',async()=>{
 const r=await retrievePublicCaptions(url,{fetchImpl:async()=>new Response('',{status:403})});assert.equal(r.post.code,'PROVIDER_BLOCKED');assert.equal(r.metadata.code,'PROVIDER_BLOCKED');
});
test('Diagnostic fields accept only availability booleans and never persist content objects',()=>{
 const event=sanitizeDiagnostic({traceId:'fixture',stage:'post_parse',status:'succeeded',code:'OK',postTextFound:true,metadataFound:true,post:{text:'secret'},metadata:{creator:'secret'},text:'secret',creator:'secret'});
 assert.equal(event.postTextFound,true);assert.ok(!JSON.stringify(event).includes('secret'));
 assert.equal(sanitizeDiagnostic({...event,postTextFound:'secret'}).postTextFound,undefined);
});
test('Facebook login redirect is reported as LOGIN_REQUIRED, other refusals stay PROVIDER_BLOCKED', async () => {
 const story='https://www.facebook.com/story.php?story_fbid=1234567890&id=9876543210';
 const login=new Response(null,{status:302,headers:{location:'https://www.facebook.com/login/?next=x'}});
 let calls=0;
 const r=await retrievePublicCaptions(story,{fetchImpl:async()=>{calls++;return login;}});
 assert.equal(r.code,'LOGIN_REQUIRED');assert.equal(r.post.code,'LOGIN_REQUIRED');assert.equal(calls,1,'Pen never follows the login redirect');
 const elsewhere=await retrievePublicCaptions(story,{fetchImpl:async()=>new Response(null,{status:302,headers:{location:'https://evil.example/login/'}})});
 assert.equal(elsewhere.code,'PROVIDER_BLOCKED');
 const tiktok=await retrievePublicCaptions('https://www.tiktok.com/@x/video/1234567890123',{fetchImpl:async()=>new Response(null,{status:302,headers:{location:'https://www.facebook.com/login/'}})});
 assert.equal(tiktok.code,'PROVIDER_BLOCKED');
});

test('Facebook sign-in classification requires a recognized redirect to a safe login location',async()=>{
 const url='https://www.facebook.com/reel/123456789012345';
 for(const [status,location,expected] of [
  [302,'/login.php?next=fixture','LOGIN_REQUIRED'],
  [307,'https://m.facebook.com/checkpoint/','LOGIN_REQUIRED'],
  [302,'http://www.facebook.com/login','PROVIDER_BLOCKED'],
  [302,'javascript://www.facebook.com/login','PROVIDER_BLOCKED'],
  [302,'https://www.facebook.com:8443/login','PROVIDER_BLOCKED'],
  [302,'https://fixture@www.facebook.com/login','PROVIDER_BLOCKED'],
  [302,'https://www.facebook.com/login.php.other','PROVIDER_BLOCKED'],
  [302,'https://evil.test/login','PROVIDER_BLOCKED'],
  [302,'https://www.tiktok.com/login','PROVIDER_BLOCKED'],
  [302,'https://[','PROVIDER_BLOCKED'],
  [403,'/login','PROVIDER_BLOCKED'],
  [304,'/login','PROVIDER_BLOCKED']
 ]){
  let calls=0;
  const result=await retrievePublicCaptions(url,{fetchImpl:async()=>{calls++;return new Response(null,{status,headers:{location}});}});
  assert.equal(result.code,expected,location);
  assert.equal(calls,1);
 }
});

test('Unread response cleanup cannot stall caption retrieval or expose cancellation errors',{timeout:2000},async()=>{
 const url='https://www.facebook.com/reel/123456789012345';
 for(const cancel of [()=>new Promise(()=>{}),()=>Promise.reject(new Error('private cancellation detail'))]){
  let cancelled=0;
  const body=new ReadableStream({cancel(){cancelled++;return cancel();}});
  const result=await retrievePublicCaptions(url,{fetchImpl:async()=>new Response(body,{status:302,headers:{location:'/login'}})});
  assert.equal(result.code,'LOGIN_REQUIRED');
  assert.equal(cancelled,1);
  assert.ok(!JSON.stringify(result).includes('private cancellation detail'));
 }
});
