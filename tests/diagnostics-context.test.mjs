import test from "node:test";
import assert from "node:assert/strict";
import {captionCdnFamily,diagnosticLinkContext,responseSizeBucket,sanitizeDiagnostic} from "../src/diagnostics.mjs";

test("reports source platform and link category without creator or video ID",()=>{
  const raw="https://www.tiktok.com/@some-creator/video/7538539956029902111?utm_source=share";
  const context=diagnosticLinkContext(raw);
  assert.deepEqual(context,{platform:"tiktok",sourceDomain:"www.tiktok.com",linkType:"creator_video",queryShape:"additional_parameters",requiresRedirect:false});
  assert.equal(JSON.stringify(context).includes("some-creator"),false);
  assert.equal(JSON.stringify(context).includes("7538539956029902111"),false);
});
test("short links and Shorts get distinct technical categories",()=>{
  assert.equal(diagnosticLinkContext("https://youtu.be/J---aiyznGQ").linkType,"short_link");
  assert.equal(diagnosticLinkContext("https://youtube.com/shorts/J---aiyznGQ").linkType,"shorts");
  assert.equal(diagnosticLinkContext("https://www.instagram.com/reel/C9abcdEFG12/").linkType,"reel");
});
test("caption CDN classification is suffix anchored",()=>{
  assert.equal(captionCdnFamily("v16m-webapp.tiktokcdn-us.com"),"tiktokcdn_us");
  assert.equal(captionCdnFamily("tiktokcdn-us.com.evil.test"),"unknown");
});
test("response length is coarse and cannot identify exact resources",()=>{
  assert.equal(responseSizeBucket(2053),"1_to_10kb");
  assert.equal(responseSizeBucket(0),"none");
});
test("allows useful technical dimensions and rejects arbitrary raw values",()=>{
  const e=sanitizeDiagnostic({traceId:"safe_123",platform:"tiktok",stage:"caption_fetch",status:"failed",code:"PROVIDER_BLOCKED",source:"local_backend",build:"testlab_v1",sourceDomain:"www.tiktok.com",linkType:"creator_video",queryShape:"additional_parameters",cdnFamily:"tiktokcdn_us",responseBucket:"10_to_100kb",httpStatus:403,durationMs:1234,captionTrackCount:1,language:"da",videoId:"123456789",captionText:"secret",error:"raw: private link"});
  const s=JSON.stringify(e);
  for (const forbidden of ["123456789","secret","raw: private"])assert.equal(s.includes(forbidden),false);
  assert.equal(e.sourceDomain,"www.tiktok.com");
  assert.equal(e.httpStatus,403);
  assert.equal(e.cdnFamily,"tiktokcdn_us");
  assert.equal(e.schema,"gs-pen.diagnostic.v2");
});

