// GS Pen experimental caption resolver v1. Ordinary unauthenticated fetch only.
// NOT an authorized general-purpose extractor. No redirects, cookies, proxies or video download.
import { classifyPublicVideoUrl } from "../src/url-classifier.mjs";
import { diagnosticLinkContext, captionCdnFamily, responseSizeBucket, sanitizeDiagnostic } from "../src/diagnostics.mjs";

const LIMIT_PAGE = 2_000_000, LIMIT_VTT = 256_000;
const APPROVED_CDN = new Set(["tiktokcdn","tiktokcdn_us","tiktokv","byteoversea","ibytedtos","tiktok"]);
function fail(code, status = "failed") { return { ok:false, status, code, cues:[], captionTrackCount:0 }; }
function cleanToken(raw) { return raw.replace(/<[^>]*>/g, "").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim(); }

export function parseWebVtt(raw) {
  if (typeof raw !== "string" || !raw.replace(/^\uFEFF/,"").trimStart().startsWith("WEBVTT")) return [];
  const blocks = raw.replace(/\r/g,"").split(/\n{2,}/).slice(1);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const idx = lines.findIndex(s => /^\d{2}:\d{2}(?::\d{2})?\.\d{3}\s+-->\s+\d{2}:\d{2}(?::\d{2})?\.\d{3}/.test(s));
    if (idx < 0) continue;
    const [start,endPart] = lines[idx].split(/\s+-->\s+/);
    const end = endPart.split(/\s+/)[0];
    const text = cleanToken(lines.slice(idx+1).join("\n"));
    if (text && cues.length < 2000) cues.push({ start, end, text });
  }
  return cues;
}
export function findCaptionUrls(markup) {
  const match = markup.match(/<script\b[^>]*\bid=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return [];
  let payload;
  try { payload = JSON.parse(match[1]); } catch { return []; }
  const urls = [];
  const seen = new WeakSet();
  function walk(node, depth = 0) {
    if (!node || typeof node !== "object" || depth > 30 || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { for (const item of node.slice(0,150)) walk(item,depth+1); return; }
    for (const [key,value] of Object.entries(node).slice(0,100)) {
      if (["caption_infos","captionInfos","subtitleInfos"].includes(key) && Array.isArray(value)) {
        for (const t of value.slice(0,15)) if (t && typeof t.url === "string") urls.push(t.url);
      }
      walk(value,depth+1);
    }
  }
  walk(payload);
  return [...new Set(urls)].slice(0,15);
}
export function validateCaptionAsset(candidate) {
  try {
    const u = new URL(candidate);
    if (u.protocol !== "https:" || u.port || u.username || u.password || u.hash) return null;
    const cdnFamily = captionCdnFamily(u.hostname);
    return APPROVED_CDN.has(cdnFamily) ? { url:u.href, cdnFamily } : null;
  } catch { return null; }
}
async function limitedResponse(response, maxSize) {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks = []; let size=0;
  try {
    while(true) {
      const {done,value}=await reader.read();
      if(done) break;
      size+=value.length;
      if(size>maxSize) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes=new Uint8Array(size); let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset); offset+=chunk.length;}
  return {text:new TextDecoder().decode(bytes),size};
}
async function fetchBounded(url, limit, fetchImpl) {
  const controller = new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try {
    const result=await fetchImpl(url,{method:"GET",redirect:"manual",signal:controller.signal,headers:{"Accept":"text/html, text/vtt, text/plain","User-Agent":"GS-Pen-Feasibility/0.1"}});
    if(result.status!==200) return {status:result.status,body:null};
    const response=await limitedResponse(result,limit);
    return {status:200,body:response};
  } finally {clearTimeout(timeout);}
}
export async function retrievePublicCaptions(rawUrl,{fetchImpl=fetch,traceId="research",build="testlab_v1",onEvent=()=>{}}={}) {
  const start=Date.now(), context=diagnosticLinkContext(rawUrl);
  const baseline={...context,traceId,build,transport:"local_backend",source:"local_backend",attempt:1};
  const report=(stage,status,code,extras={})=>{
    const event=sanitizeDiagnostic({...baseline,stage,status,code,durationMs:Date.now()-start,...extras});
    try {onEvent(event);} catch { /* telemetry is never a retrieval prerequisite */ }
    return event;
  };
  const verdict=classifyPublicVideoUrl(rawUrl);
  if(!verdict.ok){report("url_validate","failed","INVALID_URL"); return fail("INVALID_URL");}
  report("url_validate","succeeded","OK");
  if(verdict.platform!=="tiktok" || verdict.requiresRedirectResolution || !["www.tiktok.com","tiktok.com"].includes(new URL(verdict.url).hostname)){
    report("provider_identify","unavailable","NOT_IMPLEMENTED");
    return fail("NOT_IMPLEMENTED","unavailable");
  }
  report("provider_identify","succeeded","OK");
  const u=new URL(verdict.url);
  if(!/^\/@[^/]+\/video\/\d{8,30}\/?$/.test(u.pathname)){
    report("provider_identify","failed","UNSUPPORTED_LINK_TYPE");
    return fail("UNSUPPORTED_LINK_TYPE");
  }
  // Do not forward tracking parameters or arbitrary query strings to the provider.
  const canonical="https://www.tiktok.com"+u.pathname;
  let page;
  report("provider_page_fetch","started","STARTED");
  try {page=await fetchBounded(canonical,LIMIT_PAGE,fetchImpl);}
  catch(e){const code=e?.name==="AbortError"?"TIMEOUT":"NETWORK_ERROR"; report("provider_page_fetch","failed",code);return fail(code);}
  if(page.status!==200){report("provider_page_fetch","failed","PROVIDER_BLOCKED",{httpStatus:page.status});return fail("PROVIDER_BLOCKED");}
  if(!page.body){report("provider_page_fetch","failed","NETWORK_ERROR");return fail("NETWORK_ERROR");}
  report("provider_page_fetch","succeeded","OK",{responseBucket:responseSizeBucket(page.body.size),contentType:"html",httpStatus:200});
  const candidates=findCaptionUrls(page.body.text);
  if(!candidates.length){report("caption_track_discovery","unavailable","CAPTIONS_NOT_FOUND");return fail("CAPTIONS_NOT_FOUND","unavailable");}
  report("caption_track_discovery","succeeded","OK",{captionTrackCount:candidates.length});
  const asset=validateCaptionAsset(candidates[0]);
  if(!asset){report("caption_host_validation","failed","CAPTION_HOST_REJECTED",{captionTrackCount:candidates.length});return fail("CAPTION_HOST_REJECTED");}
  report("caption_host_validation","succeeded","OK",{cdnFamily:asset.cdnFamily});
  let track;
  report("caption_fetch","started","STARTED",{cdnFamily:asset.cdnFamily});
  try {track=await fetchBounded(asset.url,LIMIT_VTT,fetchImpl);}
  catch(e){const code=e?.name==="AbortError"?"TIMEOUT":"NETWORK_ERROR";report("caption_fetch","failed",code,{cdnFamily:asset.cdnFamily});return fail(code);}
  if(track.status!==200){report("caption_fetch","failed","PROVIDER_BLOCKED",{cdnFamily:asset.cdnFamily,httpStatus:track.status});return fail("PROVIDER_BLOCKED");}
  if(!track.body){report("caption_fetch","failed","NETWORK_ERROR",{cdnFamily:asset.cdnFamily});return fail("NETWORK_ERROR");}
  report("caption_fetch","succeeded","OK",{cdnFamily:asset.cdnFamily,contentType:"vtt",responseBucket:responseSizeBucket(track.body.size)});
  const cues=parseWebVtt(track.body.text);
  if(!cues.length){report("caption_parse","failed","CAPTION_PARSE_FAILED",{cdnFamily:asset.cdnFamily});return fail("CAPTION_PARSE_FAILED");}
  report("caption_parse","succeeded","OK",{captionCueCount:cues.length,captionTrackCount:candidates.length,cdnFamily:asset.cdnFamily});
  return {ok:true,status:"succeeded",code:"OK",cues,captionTrackCount:candidates.length,captionType:"platform"};
}
