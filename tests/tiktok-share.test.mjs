import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTikTokShareUrl } from '../server/tiktok-share.mjs';
import { retrievePublicCaptions } from '../server/caption.mjs';

const id='1234567890123456789';
const canonical='https://www.tiktok.com/@fixture/video/'+id;
const share='https://vm.tiktok.com/ZN8U9kugR/';
const post='Synthetic private post #example';
function page(captions=true) {
  return '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+JSON.stringify({
    __DEFAULT_SCOPE__:{'webapp.video-detail':{itemInfo:{itemStruct:{
      id,desc:post,video:captions?{caption_infos:[{url:'https://v.tiktokcdn.com/subtitle?signature=secret'}]}:{}
    }}}}
  })+'</script>';
}
function redirect(location,status=302){return new Response(null,{status,headers:{location}});}

test('vm.tiktok.com share link resolves to exact video and extracts post plus native cues',async()=>{
  const calls=[],events=[];
  const fetchImpl=async(url,opts)=>{
    calls.push({url,method:opts.method,redirect:opts.redirect});
    if(calls.length===1)return redirect(canonical+'?tracking=secret');
    if(calls.length===2)return new Response(page());
    return new Response('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nSynthetic timed words\n');
  };
  const result=await retrievePublicCaptions(share+'?tracking=private',{traceId:'synthetic',fetchImpl,onEvent:e=>events.push(e)});
  assert.equal(result.ok,true);
  assert.equal(result.post.text,post);
  assert.equal(result.cues[0].text,'Synthetic timed words');
  assert.deepEqual(calls.map(x=>x.url),[share,canonical,'https://v.tiktokcdn.com/subtitle?signature=secret']);
  assert.ok(calls.every(x=>x.redirect==='manual'&&x.method==='GET'));
  assert.ok(events.some(e=>e.stage==='share_link_resolution'&&e.status==='succeeded'&&e.redirectCount===1));
  const logged=JSON.stringify(events);
  for(const secret of [id,'ZN8U9kugR','@fixture','tracking=private','signature=secret','Synthetic timed words'])assert.ok(!logged.includes(secret),secret);
});

test('vt links may traverse another recognized short link, with a strict hop count',async()=>{
  const calls=[];
  const result=await resolveTikTokShareUrl('https://vt.tiktok.com/abc123/?tracking=omit',async url=>{
    calls.push(url);
    if(calls.length===1)return redirect('https://www.tiktok.com/t/short_1/?track=omit',301);
    return redirect(canonical,307);
  });
  assert.deepEqual(result,{ok:true,url:canonical,redirectCount:2});
  assert.deepEqual(calls,['https://vt.tiktok.com/abc123/','https://www.tiktok.com/t/short_1/']);
});

test('TikTok /t/ links are supported, while direct canonical videos need no resolution fetch',async()=>{
  const result=await resolveTikTokShareUrl('https://www.tiktok.com/t/abc123/',async()=>redirect(canonical,308));
  assert.deepEqual(result,{ok:true,url:canonical,redirectCount:1});
  const direct=await resolveTikTokShareUrl(canonical,async()=>{throw Error('must not fetch');});
  assert.deepEqual(direct,{ok:true,url:canonical,redirectCount:0});
});

test('bad redirect targets are rejected without fetching those locations',async()=>{
  for(const destination of [
    'http://www.tiktok.com/@fixture/video/'+id,
    'https://www.tiktok.com.evil.test/@fixture/video/'+id,
    'https://127.0.0.1/private',
    'https://www.tiktok.com@evil.test/@fixture/video/'+id,
    'https://www.tiktok.com/login',
    'https://www.tiktok.com:8443/@fixture/video/'+id,
    'https://www.facebook.com/reel/123456789012345'
  ]) {
    let calls=0;
    const result=await resolveTikTokShareUrl(share,async()=>{calls++;return redirect(destination);});
    assert.equal(result.ok,false,destination);
    assert.equal(result.code,'SHORT_LINK_TARGET_REJECTED',destination);
    assert.equal(calls,1,destination);
  }
});

test('missing Location, plain page, redirect loop and hop limit return explicit failures',async()=>{
  const missing=await resolveTikTokShareUrl(share,async()=>new Response(null,{status:302}));
  assert.equal(missing.code,'SHORT_LINK_UNRESOLVED');
  const plain=await resolveTikTokShareUrl(share,async()=>new Response('<html>not a redirect</html>'));
  assert.equal(plain.code,'SHORT_LINK_UNRESOLVED');
  let loopCount=0;
  const loop=await resolveTikTokShareUrl(share,async()=>{loopCount++;return redirect(share);});
  assert.equal(loop.code,'SHORT_LINK_UNRESOLVED');
  assert.equal(loopCount,1);
  let count=0;
  const excessive=await resolveTikTokShareUrl(share,async()=>redirect('https://vm.tiktok.com/token'+(++count)+'/'));
  assert.equal(excessive.code,'SHORT_LINK_UNRESOLVED');
  assert.equal(count,3);
  assert.equal(excessive.redirectCount,3);
});

test('blocked or failed share resolution does not misreport missing captions',async()=>{
  const blocked=await retrievePublicCaptions(share,{fetchImpl:async()=>new Response(null,{status:403})});
  assert.equal(blocked.code,'PROVIDER_BLOCKED');
  const unavailable=await retrievePublicCaptions(share,{fetchImpl:async()=>new Response('<html></html>')});
  assert.equal(unavailable.code,'SHORT_LINK_UNRESOLVED');
  const network=await retrievePublicCaptions(share,{fetchImpl:async()=>{throw Error('private message');}});
  assert.equal(network.code,'NETWORK_ERROR');
  assert.ok(!JSON.stringify(network).includes('private message'));
});

test('resolved video without a native caption track retains post but does not claim a transcript',async()=>{
  let calls=0;
  const r=await retrievePublicCaptions(share,{fetchImpl:async()=>++calls===1?redirect(canonical):new Response(page(false))});
  assert.equal(calls,2);
  assert.equal(r.ok,false);
  assert.equal(r.code,'CAPTIONS_NOT_FOUND');
  assert.deepEqual(r.cues,[]);
  assert.equal(r.post.text,post);
});
