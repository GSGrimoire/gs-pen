// GS Pen Test Lab user interface v1. No telemetry endpoint other than same-origin local research backend.
import {classifyPublicVideoUrl} from "./modules/url-classifier.mjs";
import {diagnosticLinkContext,sanitizeDiagnostic} from "./modules/diagnostics.mjs";
const $=id=>document.getElementById(id);
const BUILD="testlab_v01_sites_1", KEY="gs-pen-testlab-diag-v2", MAX=1000, MAX_AGE=30*86400000;
const state={backend:false,serverCount:null,serverEvents:[],events:[],trace:[],result:null,tab:"captions",currentTrace:null,busy:false,authRequired:false,accessKey:"",site:false,storageFailed:false};
function authHeaders(json=false){const h={};if(json)h["Content-Type"]="application/json";if(state.accessKey)h["X-GS-Pen-Dev-Key"]=state.accessKey;return h;}
function browserFamily(){const u=navigator.userAgent;return /Firefox\//.test(u)?"firefox":/Edg\/|Chrome\/|Chromium\//.test(u)?"chromium":/Safari\//.test(u)?"safari":"other";}
function deviceClass(){const u=navigator.userAgent;return /iPad|Tablet/.test(u)?"tablet":/Mobile|Android|iPhone/.test(u)?"mobile":"desktop";}
function node(type,text,cls){const e=document.createElement(type);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e;}
function makeTrace(){return crypto.randomUUID();}
function cleanEvents(items){
  const since=Date.now()-MAX_AGE;
  return (Array.isArray(items)?items:[]).filter(e=>e?.schema==="gs-pen.diagnostic.v2" && Date.parse(e.timestamp)>=since).slice(-MAX);
}
function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(state.events));return true;}catch{$("storage-indicator").textContent="Local storage blocked";return false;}}
function restoreLocal(){try{state.events=cleanEvents(JSON.parse(localStorage.getItem(KEY)||"[]"));saveLocal();}catch{state.events=[];}}
function displayStatus(message,type="muted"){$("trace-status").textContent=message;$("trace-status").style.color=type==="error"?"#f1a196":type==="ok"?"#8ed4bc":"";}
async function syncEvent(event){
  if(!state.backend)return false;
  try{
    const resp=await fetch("/api/diagnostics",{method:"POST",headers:authHeaders(true),body:JSON.stringify(event)});
    const data=await resp.json();
    if(!resp.ok||!data.saved){state.storageFailed=true;return false;}
    return true;
  }catch{return false;}
}
function record(input,{sync=true,trace=true}={}){
  const event=sanitizeDiagnostic({build:BUILD,browserFamily:browserFamily(),deviceClass:deviceClass(),...input});
  state.events=cleanEvents([...state.events,event]);
  saveLocal();
  if(trace && state.currentTrace===event.traceId){state.trace.push(event);drawTrace();}
  drawEvents();
  if(sync)void syncEvent(event).then(ok=>{
    if(state.backend && !ok){$("storage-indicator").textContent="Local only (sync failed)";}
    else if(ok && !state.storageFailed){$("storage-indicator").textContent=state.site?"Site database connected":"Local file connected";}
  });
  return event;
}
function setContext(context,extras={}){
  const details=$("context-details");details.replaceChildren();
  const rows={
    "Source domain":context.sourceDomain||"unknown",
    "Video/link type":context.linkType||"unknown",
    "Platform":context.platform||"unknown",
    "URL query class":context.queryShape||"unknown",
    "Short-link redirect":context.requiresRedirect?"Yes":"No",
    "Request transport":state.backend?(state.site?"Authenticated Site backend":"Local backend"):"Browser only",
    "Browser family":browserFamily(),
    "Device category":deviceClass(),
    ...extras
  };
  for(const [key,value] of Object.entries(rows)){details.append(node("dt",key),node("dd",value));}
}
function drawTrace(){
  const el=$("timeline");el.replaceChildren();
  if(!state.trace.length){el.append(node("div","No processing events yet.","timeline-empty"));return;}
  for(const item of state.trace){
    const line=node("div",undefined,"time-event "+(item.status==="failed"?"failed":""));
    const mark=node("span",undefined,"marker");
    const body=node("div");body.append(node("b",item.stage.replace(/_/g," ")),node("small",item.code+" · "+item.status));
    const duration=node("em",Number.isInteger(item.durationMs)?item.durationMs+" ms":"N/A");
    line.append(mark,body,duration);el.append(line);
  }
}
function drawEvents(){
  $("local-event-count").textContent=String(state.events.length);
  $("server-event-count").textContent=state.serverCount===null?"N/A":String(state.serverCount);
  const platform=$("filter-platform").value,status=$("filter-status").value,search=$("filter-search").value.trim().toLowerCase();
  const combined=[...state.events.map(e=>({...e,location:"browser"})),...state.serverEvents.map(e=>({...e,location:"backend"}))];
  const items=combined.filter(e=>(platform==="all"||e.platform===platform)&&(status==="all"||e.status===status)&&(!search||JSON.stringify(e).toLowerCase().includes(search))).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)).slice(0,120);
  const tbody=$("diagnostic-rows");tbody.replaceChildren();
  if(!items.length){const tr=node("tr"),td=node("td","No diagnostic records in this view.","no-rows");td.colSpan=8;tr.append(td);tbody.append(tr);return;}
  for(const e of items){
    const tr=node("tr");tr.tabIndex=0;tr.title="Show processing timeline for this trace";const selectTrace=()=>{state.currentTrace=e.traceId;state.trace=combined.filter(x=>x.traceId===e.traceId).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));$("trace-id").textContent=e.traceId;drawTrace();$("timeline").scrollIntoView({behavior:"smooth"});};tr.addEventListener("click",selectTrace);tr.addEventListener("keydown",k=>{if(k.key==="Enter")selectTrace();});
    const context=[e.sourceDomain,e.linkType,e.queryShape,e.cdnFamily,e.responseBucket,e.httpStatus?("HTTP "+e.httpStatus):null,e.captionCueCount!=null?(e.captionCueCount+" cues"):null].filter(x=>x&&x!=="unknown").join(" · ")||"N/A";
    const vals=[new Date(e.timestamp).toLocaleTimeString(),e.location,e.platform,e.stage.replace(/_/g," "),e.status,e.code,context,e.durationMs!=null?e.durationMs+" ms":"N/A"];
    for(const val of vals)tr.append(node("td",val));tbody.append(tr);
  }
}
function plainEmpty(title,detail){const el=node("div",undefined,"empty");el.append(node("span","▤","empty-icon"),node("h3",title),node("p",detail));return el;}
function renderTab(){
  document.querySelectorAll(".tab").forEach(b=>{const selected=b.dataset.tab===state.tab;b.classList.toggle("selected",selected);b.setAttribute("aria-selected",String(selected));});
  const panel=$("tab-panel");panel.replaceChildren();
  if(state.tab==="whisper"){panel.append(plainEmpty("Independent Whisper is not active","Audio capture and speech recognition are planned for a future release. This tab never displays platform captions as Whisper output."));return;}
  if(state.tab==="post"){panel.append(plainEmpty("Post descriptions not implemented","Descriptions, hashtags and mentions are a separate metadata-retrieval capability; they are not inferred from captions."));return;}
  if(state.tab==="metadata"){panel.append(plainEmpty("Metadata retrieval not implemented","Only limited technical video-link classification is available. Creator details and engagement counts are not fetched."));return;}
  if(!state.result){panel.append(plainEmpty("No caption request yet","Inspect a public TikTok video to test native caption retrieval."));return;}
  if(!state.result.ok){panel.append(plainEmpty("Native captions unavailable",explain(state.result.code)));return;}
  const wrap=node("div",undefined,"caption-output");
  for(const cue of state.result.cues){const line=node("div",undefined,"cue");line.append(node("time",cue.start),node("span",cue.text));wrap.append(line);}
  const note=node("p",state.result.cues.length+" caption cues from an existing platform track. Not independently transcribed.","output-note");
  panel.append(wrap,note);
}
const errorText={
  AUTH_DENIED:"Owner authentication was rejected. Sign in again to this private Site.",
  RATE_LIMITED:"The research request limit was reached. Wait one minute and retry.",
  INVALID_URL:"The link is invalid or outside the supported video formats.",
  NOT_IMPLEMENTED:"This platform or link style has no caption adapter in the current test build.",
  UNSUPPORTED_LINK_TYPE:"The link is recognized, but the experimental caption resolver requires a canonical public video URL.",
  PROVIDER_BLOCKED:"The platform or caption asset rejected the request. Captions might still exist.",
  CAPTIONS_NOT_FOUND:"The page was retrieved, but no caption track was discovered. This is not proof that captions do not exist.",
  CAPTION_HOST_REJECTED:"A caption track was found, but its delivery domain was not on our narrowly reviewed list.",
  CAPTION_PARSE_FAILED:"A caption file was accessed, but it did not contain recognizable timed cues.",
  NETWORK_ERROR:"The network request could not be completed; this may be connectivity, a platform block or a host limitation.",
  TIMEOUT:"The retrieval exceeded the request time limit.",
  BACKEND_UNAVAILABLE:"The private caption retrieval backend could not be reached. Check the backend and authentication status.",
  INTERNAL_ERROR:"The research backend encountered a safe, unclassified internal failure."
};
function explain(code){return (errorText[code]||"The request did not return an available caption track.")+" Error code: "+code+".";}
function setBusy(flag){state.busy=flag;$("probe-button").disabled=flag;$("probe-button").textContent=flag?"Inspecting…":"Inspect captions →";}
async function doProbe(event){
  event.preventDefault();if(state.busy)return;
  const input=$("video-url").value.trim(),context=diagnosticLinkContext(input);
  state.currentTrace=makeTrace();state.trace=[];state.result=null;
  $("trace-id").textContent=state.currentTrace;
  setContext(context);renderTab();setBusy(true);displayStatus("Validating");
  const base={traceId:state.currentTrace,...context,source:"browser",transport:state.backend?(state.site?"site_backend":"local_backend"):"browser_direct"};
  const result=classifyPublicVideoUrl(input);
  record({...base,stage:"url_validate",status:result.ok?"succeeded":"failed",code:result.ok?"OK":"INVALID_URL",durationMs:0});
  if(!result.ok){state.result={ok:false,code:"INVALID_URL"};displayStatus("Invalid link","error");renderTab();setBusy(false);return;}
  if(!state.backend){record({...base,stage:"request_start",status:"unavailable",code:"BACKEND_UNAVAILABLE"});state.result={ok:false,code:"BACKEND_UNAVAILABLE"};displayStatus("Backend offline","error");renderTab();setBusy(false);return;}
  if(result.platform!=="tiktok"){record({...base,stage:"provider_identify",status:"unavailable",code:"NOT_IMPLEMENTED"});state.result={ok:false,code:"NOT_IMPLEMENTED"};displayStatus("Not supported yet");renderTab();setBusy(false);return;}
  record({...base,stage:"request_start",status:"started",code:"STARTED"});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),35000);const started=performance.now();
  try{
    const response=await fetch("/api/captions",{method:"POST",headers:authHeaders(true),body:JSON.stringify({url:input,traceId:state.currentTrace}),signal:controller.signal});
    if(!response.ok){const problem=await response.json();const code=problem.code||"BACKEND_UNAVAILABLE";state.result={ok:false,code};displayStatus("Request rejected","error");record({...base,stage:"request_start",status:"failed",code,durationMs:Math.round(performance.now()-started)});return;}
    const outcome=await response.json();
    for(const serverEvent of Array.isArray(outcome.events)?outcome.events:[])record(serverEvent,{sync:false});
    state.result=outcome;
    if(outcome.unpersistedCaptionHost)setContext(context,{"Rejected caption host (not stored)":outcome.unpersistedCaptionHost});
    if(outcome.ok){displayStatus("Captions retrieved","ok");setContext(context,{"Caption tracks":outcome.captionTrackCount,"Caption cues":outcome.cues.length});}
    else displayStatus(outcome.code==="CAPTIONS_NOT_FOUND"?"No track found":"Retrieval failed","error");
    if(!outcome.diagnosticsStored){state.storageFailed=true;$("storage-indicator").textContent="Storage failed; browser copy only";}
    record({...base,stage:"result_render",status:outcome.ok?"succeeded":"failed",code:outcome.code||"INTERNAL_ERROR",durationMs:Math.round(performance.now()-started),captionCueCount:outcome.ok?outcome.cues.length:undefined});
  }catch(e){
    const code=e?.name==="AbortError"?"TIMEOUT":"BACKEND_UNAVAILABLE";
    state.result={ok:false,code};displayStatus("Connection failed","error");
    record({...base,stage:"request_start",status:"failed",code,durationMs:Math.round(performance.now()-started)});
  }finally{clearTimeout(timer);renderTab();setBusy(false);void refreshServerCount();}
}
async function refreshServerCount(){
  if(!state.backend){state.serverCount=null;state.serverEvents=[];drawEvents();return;}
  try{const response=await fetch("/api/diagnostics",{cache:"no-store",headers:authHeaders()});if(!response.ok)throw Error("bad_status");const data=await response.json();state.serverEvents=Array.isArray(data.events)?cleanEvents(data.events):[];state.serverCount=state.serverEvents.length;}
  catch{state.serverCount=null;state.serverEvents=[];$("storage-indicator").textContent="Unable to read backend logs";}
  drawEvents();
}
async function connectBackend() {
  const key=$("dev-key").value.trim();
  if(!/^[a-f0-9]{48}$/.test(key)){$("dev-key-status").textContent="A 48-character key from the terminal is required.";return;}
  state.accessKey=key;
  try {
    const response=await fetch("/api/diagnostics",{cache:"no-store",headers:authHeaders()});
    if(!response.ok)throw Error("not_authenticated");
    state.backend=true;
    try{sessionStorage.setItem("gs-pen-dev-key",key);}catch{}
    $("dev-key").value="";$("dev-key-status").textContent="";
    $("dev-access").hidden=true;
    $("backend-badge").textContent="Private Codespaces probe connected";$("backend-badge").className="pill";
    $("storage-indicator").textContent="Codespaces local file";
    await refreshServerCount();
  } catch {
    state.backend=false;state.accessKey="";
    $("dev-key-status").textContent="Invalid key or backend unavailable. Check the terminal and port visibility.";
    $("backend-badge").textContent="Access key required";$("backend-badge").className="pill error";
  }
}
async function checkBackend(){
  try{
    const response=await fetch("/api/health",{cache:"no-store"});
    if(!response.ok)throw Error("bad_status");
    const data=await response.json();
    if(!["local_only","codespaces_private","sites_private"].includes(data.backend))throw Error("unrecognized_backend");
    state.site=data.backend==="sites_private";
    if(state.site){state.backend=true;$("backend-badge").textContent="Owner-private Site backend";$("storage-indicator").textContent=data.centralSiteStorage?"Site database connected":"Site database unavailable";state.storageFailed=!data.centralSiteStorage;await refreshServerCount();return;}
    state.authRequired=!!data.authRequired;
    if(state.authRequired){
      $("dev-access").hidden=false;
      try{state.accessKey=sessionStorage.getItem("gs-pen-dev-key")||"";}catch{}
      if(state.accessKey){$("dev-key").value=state.accessKey;await connectBackend();}
      else{$("backend-badge").textContent="Development key required";$("backend-badge").className="pill error";$("storage-indicator").textContent="Access key needed";}
      return;
    }
    state.backend=true;$("backend-badge").textContent="Local probe connected";$("backend-badge").className="pill";
    $("storage-indicator").textContent=state.site?"Site database connected":"Local file connected";await refreshServerCount();
  }catch{
    state.backend=false;$("backend-badge").textContent="Retrieval backend offline";$("backend-badge").className="pill error";
    $("storage-indicator").textContent="Browser only";
  }
}
function exportDiagnostics(){
  const data={schema:"gs-pen.debug-export.v1",exportedAt:new Date().toISOString(),source:state.site?"browser_and_site":"browser_local",events:[...state.events,...state.serverEvents]};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=node("a");a.href=url;a.download="gs-pen-sanitized-diagnostics.json";document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
}
async function clearDiagnostics(){
  if(!confirm("Delete browser and backend diagnostic records?"))return;
  state.events=[];state.trace=[];state.serverCount=null;state.serverEvents=[];
  try{localStorage.removeItem(KEY);}catch{}
  if(state.backend)try{const response=await fetch("/api/diagnostics",{method:"DELETE",headers:authHeaders()});if(!response.ok)throw Error("not_cleared");}catch{$("storage-indicator").textContent="Backend clear failed";}
  drawTrace();drawEvents();await refreshServerCount();
}
document.querySelectorAll(".tab").forEach(button=>button.addEventListener("click",()=>{state.tab=button.dataset.tab;renderTab();}));
document.querySelectorAll("[data-example]").forEach(button=>button.addEventListener("click",()=>{$("video-url").value=button.dataset.example;$("source-summary").textContent="Example ready";$("video-url").focus();}));
$("video-url").addEventListener("input",()=>{const c=diagnosticLinkContext($("video-url").value);$("source-summary").textContent=c.platform==="unknown"?"Paste a supported public video link":c.platform+" · "+c.linkType+" · "+c.sourceDomain;});
$("probe-form").addEventListener("submit",doProbe);
$("connect-backend").addEventListener("click",connectBackend);
$("filter-search").addEventListener("input",drawEvents);
$("filter-platform").addEventListener("change",drawEvents);
$("filter-status").addEventListener("change",drawEvents);
$("refresh-diagnostics").addEventListener("click",refreshServerCount);
$("export-diagnostics").addEventListener("click",exportDiagnostics);
$("clear-diagnostics").addEventListener("click",clearDiagnostics);
$("storage-check").addEventListener("click",async()=>{
  $("storage-check").disabled=true;
  try{const response=await fetch('/api/storage-check',{method:'POST',headers:authHeaders(true),body:'{}'});const data=await response.json();
    $("storage-check-result").textContent=response.ok&&['writePassed','privacyPassed','deletePassed','expiryPassed'].every(k=>data[k])?'Passed: write, privacy, expiry and deletion.':'Storage checks failed. Check backend storage status.';
  }catch{$("storage-check-result").textContent='Storage checks could not reach the authenticated backend.';}
  finally{$("storage-check").disabled=false;}
});
restoreLocal();drawEvents();renderTab();drawTrace();setContext(diagnosticLinkContext(""));void checkBackend();

