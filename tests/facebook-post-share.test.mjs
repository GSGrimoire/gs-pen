import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPublicVideoUrl } from '../src/url-classifier.mjs';
import { canonicalFacebookContentUrl, resolveFacebookShareUrl } from '../server/facebook-share.mjs';
import { retrievePublicCaptions } from '../server/caption.mjs';

const post='https://www.facebook.com/Fixture.Writer/posts/pfbid123456789012345';
const story='https://www.facebook.com/story.php?story_fbid=123456789012345&id=987654321098765';
const photo='https://www.facebook.com/photo.php?fbid=123456789012345';
const share='https://www.facebook.com/share/p/ExamplePostToken/';
const redirect=(location,status=302)=>new Response(null,{status,headers:{location}});

test('Facebook Share > Copy link post URLs classify and resolve within Facebook',async()=>{
  for(const raw of [share,'https://m.facebook.com/share/p/ExamplePostToken/?mibextid=tracking']) {
    const verdict=classifyPublicVideoUrl(raw);
    assert.equal(verdict.ok,true);
    assert.equal(verdict.requiresRedirectResolution,true);
  }
  const requested=[];
  const result=await resolveFacebookShareUrl(share+'?mibextid=private',async (url,options)=>{
    requested.push(url);
    assert.equal(options.redirect,'manual');
    return redirect(post+'?fbclid=discard');
  });
  assert.deepEqual(requested,[share]);
  assert.deepEqual(result,{ok:true,url:post,redirectCount:1});
});

test('Generic Facebook /share/token URLs may also resolve to public posts',async()=>{
  const short='https://www.facebook.com/share/ExamplePostToken/';
  const result=await resolveFacebookShareUrl(short,async()=>redirect(story+'&tracking=drop'));
  assert.deepEqual(result,{ok:true,url:story,redirectCount:1});
});

test('Public story, permalink, photo and posts retain only essential identifier parameters',async()=>{
  for(const [raw,expected] of [
    [post+'?tracking=discard',post],
    [story+'&fbclid=discard',story],
    [story.replace('story.php','permalink.php')+'&mibextid=discard',story.replace('story.php','permalink.php')],
    [photo+'&tracking=discard',photo]
  ]) {
    const normalized=canonicalFacebookContentUrl(raw);
    assert.equal(normalized,expected);
    let called=false;
    assert.deepEqual(await resolveFacebookShareUrl(raw,async()=>{called=true;throw Error('unexpected request');}),
      {ok:true,url:expected,redirectCount:0});
    assert.equal(called,false);
  }
});

test('Bounded public metadata canonical hints may resolve regular post shares',async()=>{
  const html='<meta property="og:url" content="'+story.replace('&','&amp;')+'&amp;tracking=remove">';
  assert.deepEqual(await resolveFacebookShareUrl(share,async()=>new Response(html)),
    {ok:true,url:story,redirectCount:0});
  const shell=await resolveFacebookShareUrl(share,async()=>new Response('<html>Log in to Facebook</html>'));
  assert.equal(shell.code,'SHORT_LINK_UNRESOLVED');
});

test('Post share resolves to a marked partial public preview, never a video transcript',async()=>{
  const urls=[],events=[];
  const result=await retrievePublicCaptions(share+'?tracking=secret',{
    traceId:'post_fixture',
    onEvent:e=>events.push(e),
    fetchImpl:async (url,options)=>{
      urls.push(url);assert.equal(options.redirect,'manual');
      if(urls.length===1)return redirect(post+'?tracking=discard');
      return new Response('<meta property="og:title" content="10 likes | A public synthetic example #fixture | Example Writer">');
    }
  });
  assert.deepEqual(urls,[share,post]);
  assert.equal(result.ok,false);
  assert.equal(result.code,'NOT_IMPLEMENTED');
  assert.deepEqual(result.cues,[]);
  assert.equal(result.post.status,'succeeded');
  assert.equal(result.post.text,'A public synthetic example #fixture');
  assert.equal(result.post.completeness,'page_preview_may_be_truncated');
  assert.equal(result.metadata.fields.creator,'Example Writer');
  assert.ok(events.some(e=>e.stage==='share_link_resolution'&&e.status==='succeeded'));
  const logged=JSON.stringify(events);
  for(const forbidden of ['ExamplePostToken','tracking=secret','pfbid123456789012345','A public synthetic example','Example Writer'])
    assert.ok(!logged.includes(forbidden),forbidden);
});

test('Unsafe redirect targets are rejected without fetching them',async()=>{
  for(const destination of [
    'https://facebook.com.evil.test/Fixture.Writer/posts/pfbid123456789012345',
    'http://www.facebook.com/Fixture.Writer/posts/pfbid123456789012345',
    'https://www.facebook.com:8443/Fixture.Writer/posts/pfbid123456789012345',
    'https://www.facebook.com/profile.php?id=123456789012345',
    'https://www.facebook.com/story.php?story_fbid=123456789012345',
    'https://www.tiktok.com/@creator/video/1234567890123456789'
  ]) {
    let calls=0;
    const result=await resolveFacebookShareUrl(share,async()=>{calls++;return redirect(destination);});
    assert.equal(result.code,'SHORT_LINK_TARGET_REJECTED',destination);
    assert.equal(calls,1,destination);
  }
});
