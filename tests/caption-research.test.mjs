import test from "node:test";
import assert from "node:assert/strict";
import {retrievePublicCaptions,parseWebVtt,findCaptionUrls,validateCaptionAsset} from "../server/caption.mjs";

const src="https://www.tiktok.com/@creator/video/7538539956029902111";
const link="https://v16m-webapp.tiktokcdn-us.com/example.vtt";
const html='<html><script type="application/json" id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+JSON.stringify({scope:{data:{caption_infos:[{url:link}]}}})+'</script></html>';
const vtt="WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello everyone\n\n00:00:04.000 --> 00:00:05.000\nNext line\n";
function fakeFetch(url){return Promise.resolve(new globalThis.Response(url.includes("tiktokcdn-us.com")?vtt:html,{status:200}));}

test("finds nested caption track from hydration JSON",()=>{
  assert.deepEqual(findCaptionUrls(html),[link]);
});
test("validates allowed asset domains and rejects lookalikes",()=>{
  assert.equal(validateCaptionAsset(link)?.cdnFamily,"tiktokcdn_us");
  assert.equal(validateCaptionAsset("https://v16m-webapp.tiktokcdn-us.com.evil.test/example.vtt"),null);
  assert.equal(validateCaptionAsset("http://v16m-webapp.tiktokcdn-us.com/example.vtt"),null);
  assert.equal(validateCaptionAsset("https://127.0.0.1/signed.vtt"),null);
});
test("parses only valid WebVTT cues without executing markup",()=>{
  const cues=parseWebVtt(vtt);
  assert.equal(cues.length,2);
  assert.equal(cues[0].text,"Hello everyone");
  assert.deepEqual(parseWebVtt("not subtitles"),[]);
});
test("retrieves genuine-format captions from injected network adapter",async()=>{
  const events=[];
  const result=await retrievePublicCaptions(src,{fetchImpl:fakeFetch,traceId:"test_trace",onEvent:e=>events.push(e)});
  assert.equal(result.ok,true);
  assert.equal(result.cues.length,2);
  assert.ok(events.some(e=>e.stage==="caption_parse"&&e.captionCueCount===2));
  assert.equal(JSON.stringify(events).includes("@creator"),false);
  assert.equal(JSON.stringify(events).includes("Hello everyone"),false);
  assert.equal(JSON.stringify(events).includes("7538539956029902111"),false);
});
test("blocked page is reported distinctly from a captionless page",async()=>{
  const blocked=await retrievePublicCaptions(src,{fetchImpl:async()=>new globalThis.Response("",{status:403})});
  assert.equal(blocked.code,"PROVIDER_BLOCKED");
  const missing=await retrievePublicCaptions(src,{fetchImpl:async()=>new globalThis.Response("<html>nothing</html>",{status:200})});
  assert.equal(missing.code,"CAPTIONS_NOT_FOUND");
});
test("unsupported platforms cannot trigger external HTTP requests",async()=>{
  let sent=0;
  const result=await retrievePublicCaptions("https://www.youtube.com/watch?v=J---aiyznGQ",{fetchImpl:async()=>{sent++;}});
  assert.equal(result.code,"NOT_IMPLEMENTED");
  assert.equal(sent,0);
});

