import test from 'node:test';
import assert from 'node:assert/strict';
import { retrievePublicCaptions } from '../server/caption.mjs';
import { matchedTikTokItem } from '../server/post-content.mjs';
const id='1234567890123456789',url='https://www.tiktok.com/@creator/video/'+id;
const mk=(name,body)=>'<script id="'+name+'">'+JSON.stringify(body)+'</script>';
const item=(which=id)=>({id:which,desc:'Selected synthetic video',video:{
  caption_infos:[
    {url:'https://v.tiktokcdn.com/expired?private=1'},
    {url:'https://v.tiktokcdn.com/live?private=2'},
    {url:'https://unsafe.example/private'}
  ]
}});
const sigi=which=>mk('SIGI_STATE',{ItemModule:{[which]:item(which)}});
const next=which=>mk('__NEXT_DATA__',{props:{pageProps:{itemInfo:{itemStruct:item(which)}}}});

test('TikTok SIGI_STATE and NEXT_DATA select only the exact video item',()=>{
  assert.equal(matchedTikTokItem(sigi(id),id).id,id);
  assert.equal(matchedTikTokItem(next(id),id).id,id);
  assert.equal(matchedTikTokItem(sigi('9999999999999999999'),id),null);
  assert.equal(matchedTikTokItem(next('9999999999999999999'),id),null);
  const badUniversal=mk('__UNIVERSAL_DATA_FOR_REHYDRATION__',{__DEFAULT_SCOPE__:{'webapp.video-detail':{itemInfo:{itemStruct:item('9999999999999999999')}}}});
  assert.equal(matchedTikTokItem(badUniversal+sigi(id),id).id,id);
});

test('A blocked native TikTok caption track falls back to the next allowed track',async()=>{
  const events=[],urls=[];
  const result=await retrievePublicCaptions(url,{traceId:'fixture',onEvent:e=>events.push(e),fetchImpl:async u=>{
    urls.push(u);
    if(urls.length===1)return new Response(sigi(id));
    if(urls.length===2)return new Response(null,{status:403});
    return new Response('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nSecond caption track\n');
  }});
  assert.equal(result.ok,true);
  assert.equal(result.post.text,'Selected synthetic video');
  assert.equal(result.cues[0].text,'Second caption track');
  assert.equal(urls.length,3);
  assert.ok(events.some(e=>e.stage==='caption_fetch'&&e.status==='failed'&&e.attempt===1));
  assert.ok(events.some(e=>e.stage==='caption_parse'&&e.status==='succeeded'&&e.attempt===2));
  const raw=JSON.stringify(events);
  for(const val of [id,'@creator','private=1','Selected synthetic video','Second caption track'])assert.ok(!raw.includes(val));
});

test('Reject disallowed caption candidate without fetching it and preserve a valid later candidate',async()=>{
  let calls=0;
  const input=item();
  input.video.caption_infos[0]={url:'https://evil.test/track'};
  input.video.caption_infos[1]={url:'https://v.tiktokcdn.com/good'};
  const markup=mk('SIGI_STATE',{ItemModule:{[id]:input}});
  const result=await retrievePublicCaptions(url,{fetchImpl:async()=>{
    calls++;
    return calls===1?new Response(markup):new Response('WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nAllowed\n');
  }});
  assert.equal(result.ok,true);
  assert.equal(calls,2);
  assert.equal(result.cues[0].text,'Allowed');
});

test('If every caption asset fails, TikTok post data remains an explicitly partial result',async()=>{
  let calls=0;
  const result=await retrievePublicCaptions(url,{fetchImpl:async()=>{
    calls++;
    return calls===1?new Response(next(id)):new Response(null,{status:403});
  }});
  assert.equal(result.ok,false);
  assert.equal(result.code,'CAPTION_HOST_REJECTED');
  assert.equal(result.post.text,'Selected synthetic video');
  assert.equal(result.metadata.status,'succeeded');
  assert.deepEqual(result.cues,[]);
  assert.equal(calls,3); // two public caption assets; third unsafe target is not requested.
});
