import test from "node:test";
import assert from "node:assert/strict";
import {createLocalTestServer} from "../server/local-server.mjs";

test("local Test Lab serves UI, rejects arbitrary content, persists only sanitized events", async t => {
  const server=createLocalTestServer();
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const root="http://127.0.0.1:"+server.address().port;
  const health=await fetch(root+"/api/health");
  assert.equal(health.status,200);
  const meta=await health.json();
  assert.equal(meta.ownerAuth,"not_available");
  assert.equal(meta.centralSiteStorage,false);
  const html=await fetch(root+"/");
  assert.equal(html.status,200);
  assert.match(await html.text(),/Native captions laboratory/);
  const blocked=await fetch(root+"/api/diagnostics",{
    method:"POST",headers:{"Content-Type":"application/json","Origin":"https://evil.test"},
    body:JSON.stringify({traceId:"testing",stage:"finished"})
  });
  assert.equal(blocked.status,403);
  const event={
    traceId:"server_test_001",platform:"tiktok",sourceDomain:"www.tiktok.com",
    linkType:"creator_video",stage:"provider_page_fetch",status:"failed",code:"PROVIDER_BLOCKED",
    source:"browser",build:"testlab_v1",httpStatus:403,captionText:"DO NOT STORE SECRET",
    url:"https://www.tiktok.com/@creator/video/7538539956029902111"
  };
  const saved=await fetch(root+"/api/diagnostics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(event)});
  assert.equal(saved.status,200);
  assert.equal((await saved.json()).saved,true);
  const logs=await fetch(root+"/api/diagnostics");
  const body=await logs.text();
  assert.equal(body.includes("DO NOT STORE SECRET"),false);
  assert.equal(body.includes("7538539956029902111"),false);
  assert.ok(body.includes("creator_video"));
  assert.ok(body.includes("www.tiktok.com"));
  const unsupported=await fetch(root+"/api/captions",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({url:"https://www.youtube.com/watch?v=J---aiyznGQ",traceId:"server_test_002"})
  });
  const response=await unsupported.json();
  assert.equal(response.code,"NOT_IMPLEMENTED");
  assert.equal(response.diagnosticsStored,true);
  const clear=await fetch(root+"/api/diagnostics",{method:"DELETE"});
  assert.equal(clear.status,200);
});
