// Authorized public test examples only. No caption content, signed URLs or video identifiers are logged.
import {retrievePublicCaptions} from "../server/caption.mjs";
const cases=[
  ["sample_A","https://www.tiktok.com/@scrubdaddy/video/7538539956029902111"],
  ["sample_B","https://www.tiktok.com/@hankgreen1/video/7047596209028074758"]
];
let verified=0;
for (const [label,url] of cases){
  const result=await retrievePublicCaptions(url,{traceId:"probe_"+label,build:"testlab_v1"});
  if(result.ok)verified++;
  console.log(JSON.stringify({sample:label,retrieved:result.ok,code:result.code,cueCount:result.ok?result.cues.length:0}));
}
console.log(JSON.stringify({samples:cases.length,verified,kind:"single-run-node-caption-access",productionReadiness:"unverified"}));
