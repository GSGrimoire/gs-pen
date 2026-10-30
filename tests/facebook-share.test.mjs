import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFacebookShareUrl,canonicalFacebookVideoUrl } from '../server/facebook-share.mjs';
import { retrievePublicCaptions } from '../server/caption.mjs';

const id='123456789012345',reel='https://www.facebook.com/reel/'+id;
const watch='https://www.facebook.com/watch/?v='+id;
const share='https://www.facebook.com/share/r/ShortToken123/';
const fb='https://fb.watch/VideoCode123/';
const redirect=(location,status=302)=>new Response(null,{status,headers:{location}});

test('Facebook fb.watch and /share/r resolve to one verified reel or watch URL',async()=>{
  const urls=[];
  const resolved=await resolveFacebookShareUrl(fb+'?mibextid=private',async(url,opts)=>{
    urls.push(url);assert.equal(opts.redirect,'manual');
    return urls.length===1?redirect(share+'?tracking=ignore',301):redirect(reel+'?fbclid=private');
  });
  assert.deepEqual(resolved,{ok:true,url:reel,redirectCount:2});
  assert.deepEqual(urls,[fb,share]);
  const video=await resolveFacebookShareUrl('https://m.facebook.com/share/v/Token123/?mibextid=secret',async()=>redirect(watch+'&fbclid=abc'));
  assert.deepEqual(video,{ok:true,url:watch,redirectCount:1});
});

test('Supported canonical video forms are normalized and never fetched during resolution',async()=>{
  for(const link of [watch,'https://m.facebook.com/reel/'+id+'/?tracking=x','https://www.facebook.com/example/videos/'+id+'/']){
    let calls=0;
    const resolved=await resolveFacebookShareUrl(link,async()=>{calls++;throw Error('must not call');});
    assert.equal(resolved.ok,true);
    assert.equal(calls,0);
  }
  assert.equal(canonicalFacebookVideoUrl('https://www.facebook.com/profile.php?id='+id),null);
});

test('Facebook 200 share page may offer a bounded explicit canonical video hint',async()=>{
  const html='<meta property="og:url" content="'+reel+'?fbclid=secret"><meta name="junk" content="private speech">';
  const r=await resolveFacebookShareUrl(share,async()=>new Response(html));
  assert.deepEqual(r,{ok:true,url:reel,redirectCount:0});
  const link=await resolveFacebookShareUrl(fb,async()=>new Response('<link rel="canonical" href="'+watch.replace('&','&amp;')+'">'));
  assert.deepEqual(link,{ok:true,url:watch,redirectCount:0});
  const login=await resolveFacebookShareUrl(share,async()=>new Response('<html>Log in to Facebook</html>'));
  assert.equal(login.code,'SHORT_LINK_UNRESOLVED');
});

test('Reject malicious, cross-provider, login, unsupported and credentialed redirect destinations',async()=>{
  for(const destination of [
    'http://www.facebook.com/reel/'+id,
    'https://facebook.com.evil.test/reel/'+id,
    'https://127.0.0.1/reel/'+id,
    'https://www.facebook.com:444/reel/'+id,
    'https://www.facebook.com@evil.test/reel/'+id,
    'https://www.facebook.com/login',
    'https://www.facebook.com/share/p/something/',
    'https://www.tiktok.com/@creator/video/1234567890123456789'
  ]){
    let calls=0;
    const result=await resolveFacebookShareUrl(share,async()=>{calls++;return redirect(destination);});
    assert.equal(calls,1,destination);
    assert.equal(result.code,'SHORT_LINK_TARGET_REJECTED',destination);
  }
});

test('Missing redirect target, redirect loop, rate block and hop limit stop safely',async()=>{
  let count=0;
  const noLocation=await resolveFacebookShareUrl(fb,async()=>new Response(null,{status:302}));
  assert.equal(noLocation.code,'SHORT_LINK_UNRESOLVED');
  const loop=await resolveFacebookShareUrl(fb,async()=>{count++;return redirect(fb);});
  assert.equal(loop.code,'SHORT_LINK_UNRESOLVED');
  assert.equal(count,1);
  const blocked=await resolveFacebookShareUrl(fb,async()=>new Response(null,{status:403}));
  assert.equal(blocked.code,'PROVIDER_BLOCKED');
  assert.equal(blocked.httpStatus,403);
  count=0;
  const long=await resolveFacebookShareUrl(fb,async()=>redirect('https://fb.watch/step'+(++count)+'/'));
  assert.equal(long.code,'SHORT_LINK_UNRESOLVED');
  assert.equal(count,3);
});

test('Resolved Facebook video returns only source-labeled post preview, not invented captions',async()=>{
  const urls=[],events=[];
  const post='<meta property="og:title" content="10 views | Public testing post #test | Fixture Author">';
  const result=await retrievePublicCaptions(fb+'?secret=discard',{
    traceId:'testfb',
    onEvent:e=>events.push(e),
    fetchImpl:async(url,opts)=>{
      urls.push(url);assert.equal(opts.redirect,'manual');
      return urls.length===1?redirect(reel+'?tracking=drop'):new Response(post);
    }
  });
  assert.deepEqual(urls,[fb,reel]);
  assert.equal(result.ok,false);
  assert.equal(result.code,'NOT_IMPLEMENTED');
  assert.deepEqual(result.cues,[]);
  assert.equal(result.post.status,'succeeded');
  assert.equal(result.post.text,'Public testing post #test');
  assert.equal(result.post.completeness,'page_preview_may_be_truncated');
  assert.ok(events.some(e=>e.stage==='share_link_resolution'&&e.redirectCount===1));
  const trace=JSON.stringify(events);
  for(const privateValue of ['VideoCode123','secret=discard',id,'Public testing post','Fixture Author'])assert.ok(!trace.includes(privateValue));
});

test('No Facebook video output when provider refuses or share page is a generic shell',async()=>{
  const out=await retrievePublicCaptions(share,{fetchImpl:async()=>new Response('<html>Log into Facebook</html>')});
  assert.equal(out.ok,false);
  assert.equal(out.code,'SHORT_LINK_UNRESOLVED');
  assert.equal(out.post.status,'unavailable');
});
