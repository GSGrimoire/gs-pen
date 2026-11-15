import test from 'node:test';
import assert from 'node:assert/strict';
import {readYoutubeEmbedMetadata,youtubeVideoId} from '../server/youtube-metadata.mjs';
import {retrievePublicCaptions} from '../server/caption.mjs';

const id='J---aiyznGQ';
const watch='https://www.youtube.com/watch?v='+id;
const fixture={
  version:'1.0',type:'video',provider_name:'YouTube',
  title:'Synthetic public title',author_name:'Fixture channel',
  author_url:'https://www.youtube.com/@fixture',
  thumbnail_url:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',
  html:'<iframe src="https://www.youtube.com/embed/'+id+'"></iframe>'
};
const asJson=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});

test('YouTube watch, mobile Shorts and short URLs all resolve to one exact video ID',()=>{
  for(const url of [
    watch+'&si=private_tracking',
    'https://youtu.be/'+id+'?t=42&secret=private',
    'https://m.youtube.com/shorts/'+id+'?feature=share'
  ])assert.equal(youtubeVideoId(url),id);
  for(const url of [
    'http://youtube.com/watch?v='+id,
    'https://www.youtube.com/watch?v='+id+'&v='+id,
    'https://www.youtube.com.evil.test/watch?v='+id,
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/channel/'+id
  ])assert.equal(youtubeVideoId(url),null);
});

test('YouTube oEmbed request strips tracking and never follows redirects or sends cookies',async()=>{
  let calls=0;
  const outcome=await readYoutubeEmbedMetadata('https://youtu.be/'+id+'?si=secret',{fetchImpl:async(url,options)=>{
    calls++;
    const u=new URL(url);
    assert.equal(u.origin,'https://www.youtube.com');
    assert.equal(u.pathname,'/oembed');
    assert.equal(u.searchParams.get('url'),watch);
    assert.equal(u.searchParams.get('format'),'json');
    assert.equal(options.method,'GET');
    assert.equal(options.redirect,'manual');
    assert.equal(options.credentials,'omit');
    assert.equal(options.headers.Accept,'application/json');
    assert.equal(options.headers.Cookie,undefined);
    assert.ok(options.signal);
    return asJson(fixture);
  }});
  assert.equal(calls,1);
  assert.equal(outcome.ok,true);
  assert.deepEqual(outcome.fields,{
    platform:'YouTube',videoId:id,title:'Synthetic public title',creator:'Fixture channel',
    channelUrl:'https://www.youtube.com/@fixture',
    thumbnailUrl:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'
  });
  assert.equal(outcome.provenance,'YouTube public oEmbed metadata');
  assert.ok(!JSON.stringify(outcome).includes('iframe'));
  assert.ok(!JSON.stringify(outcome).includes('secret'));
});

test('YouTube extraction returns useful metadata without any alleged transcript or description',async()=>{
  const events=[];
  const result=await retrievePublicCaptions('https://www.youtube.com/shorts/'+id,{
    traceId:'youtube-fixture',fetchImpl:async()=>asJson(fixture),onEvent:e=>events.push(e)
  });
  assert.equal(result.ok,false);
  assert.equal(result.status,'unavailable');
  assert.equal(result.code,'NOT_IMPLEMENTED');
  assert.deepEqual(result.cues,[]);
  assert.equal(result.captionTrackCount,0);
  assert.equal(result.post.status,'unavailable');
  assert.equal(result.post.text,null);
  assert.equal(result.metadata.status,'succeeded');
  assert.equal(result.metadata.fields.videoId,id);
  assert.equal(result.metadata.fields.title,'Synthetic public title');
  assert.ok(events.some(e=>e.stage==='metadata_parse'&&e.status==='succeeded'));
  assert.ok(events.some(e=>e.stage==='caption_track_discovery'&&e.code==='NOT_IMPLEMENTED'));
  const raw=JSON.stringify(events);
  for(const privateValue of [id,'Synthetic public title','Fixture channel','@fixture','iframe'])
    assert.ok(!raw.includes(privateValue),privateValue);
});

test('A missing or forbidden YouTube embed yields no invented source text',async()=>{
  for(const status of [302,403,404,429]){
    const result=await retrievePublicCaptions(watch,{fetchImpl:async()=>new Response(null,{status})});
    assert.equal(result.ok,false);
    assert.equal(result.code,status===404?'CONTENT_NOT_FOUND':'PROVIDER_BLOCKED');
    assert.deepEqual(result.cues,[]);
    assert.equal(result.metadata.status,'unavailable');
    assert.equal(result.post.status,'unavailable');
  }
});

test('Bad JSON, wrong provider, and empty data never count as captured metadata',async()=>{
  const samples=[
    new Response('<html>not data</html>'),
    asJson({...fixture,provider_name:'Other'}),
    asJson({...fixture,type:'photo'}),
    asJson({...fixture,title:' ',author_name:'  '}),
    asJson(null)
  ];
  for(const response of samples){
    const result=await readYoutubeEmbedMetadata(watch,{fetchImpl:async()=>response});
    assert.equal(result.ok,false);
    assert.equal(result.code,'CONTENT_NOT_FOUND');
  }
});

test('Metadata values are bounded and unsafe provider URLs are not carried through',async()=>{
  const result=await readYoutubeEmbedMetadata(watch,{fetchImpl:async()=>asJson({
    ...fixture,title:'T'.repeat(4000),author_name:'A'.repeat(4000),
    author_url:'https://youtube.com.evil.test/@fixture',
    thumbnail_url:'https://i.ytimg.com/vi/WrongVideo1/hqdefault.jpg',
    html:'<script>alert(1)</script>'
  })});
  assert.equal(result.ok,true);
  assert.equal(result.fields.title.length,600);
  assert.equal(result.fields.creator.length,200);
  assert.equal(result.fields.channelUrl,undefined);
  assert.equal(result.fields.thumbnailUrl,undefined);
  assert.ok(!JSON.stringify(result).includes('<script>'));
});

test('Overlarge embed responses fail closed without persisting metadata',async()=>{
  const giant={...fixture,title:'A'.repeat(50_000)};
  const result=await readYoutubeEmbedMetadata(watch,{fetchImpl:async()=>asJson(giant)});
  assert.equal(result.ok,false);
  assert.equal(result.code,'RESPONSE_TOO_LARGE');
});

test('Invalid YouTube URLs do not make a network request',async()=>{
  let calls=0;
  const result=await readYoutubeEmbedMetadata('https://evil.test/watch?v='+id,{fetchImpl:async()=>{calls++;return asJson(fixture);}});
  assert.equal(result.ok,false);
  assert.equal(result.code,'INVALID_URL');
  assert.equal(calls,0);
});
