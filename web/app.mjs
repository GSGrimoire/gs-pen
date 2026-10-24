// GS Pen Test Lab user interface v1. No telemetry endpoint other than same-origin local research backend.
import {classifyPublicVideoUrl} from "./modules/url-classifier.mjs";
import {diagnosticLinkContext,sanitizeDiagnostic} from "./modules/diagnostics.mjs";
import {exportRecord,exportText,tabText} from "./modules/extraction-export.mjs";
const $=id=>document.getElementById(id);
const BUILD="workspace_v02_sites_1", KEY="gs-pen-testlab-diag-v2", MAX=1000, MAX_AGE=30*86400000;
const state={backend:false,serverCount:null,serverEvents:[],events:[],trace:[],result:null,tab:"captions",currentTrace:null,busy:false,authRequired:false,accessKey:"",site:false,storageFailed:false,history:[],historyAvailable:false,sourceUrl:"",pendingDelete:null};
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
function displayStatus(message,type="muted"){for(const id of ["trace-status","extraction-status"]){$(id).textContent=message;$(id).dataset.state=type;}}
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
    const tr=node("tr");tr.tabIndex=0;tr.title="Show processing timeline for this trace";const selectTrace=()=>{state.currentTrace=e.traceId;state.trace=combined.filter(x=>x.traceId===e.traceId).sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));$("trace-id").textContent=e.traceId;drawTrace();location.hash="diagnostics";$("timeline").scrollIntoView({behavior:"smooth"});};tr.addEventListener("click",selectTrace);tr.addEventListener("keydown",k=>{if(k.key==="Enter")selectTrace();});
    const context=[e.sourceDomain,e.linkType,e.queryShape,e.cdnFamily,e.responseBucket,e.httpStatus?("HTTP "+e.httpStatus):null,e.captionCueCount!=null?(e.captionCueCount+" cues"):null].filter(x=>x&&x!=="unknown").join(" · ")||"N/A";
    const vals=[new Date(e.timestamp).toLocaleTimeString(),e.location,e.platform,e.stage.replace(/_/g," "),e.status,e.code,context,e.durationMs!=null?e.durationMs+" ms":"N/A"];
    for(const val of vals)tr.append(node("td",val));tbody.append(tr);
  }
}
function plainEmpty(title,detail){const el=node("div",undefined,"empty");el.append(node("span","▤","empty-icon"),node("h3",title),node("p",detail));return el;}
function renderTab(){
  document.querySelectorAll(".tab").forEach(b=>{const selected=b.dataset.tab===state.tab;b.classList.toggle("selected",selected);b.setAttribute("aria-selected",String(selected));});
  const panel=$("tab-panel");panel.replaceChildren();
  const result=state.result;
  $("tab-panel").setAttribute("aria-labelledby","tab-"+state.tab);
  const hasContent=!!result&&(result.cues?.length||result.post?.text||result.metadata?.status==='succeeded');
  $("copy-output").disabled=!result||!tabText(result,state.tab);
  $("export-text").disabled=!hasContent;$("export-json").disabled=!hasContent;
  const summary=$("result-summary");summary.replaceChildren();
  if(result){
    const rows=[['Original captions',result.ok?result.cues.length+' timed cues':'Not available'],['Post text',result.post?.text?'Available':'Unavailable'],['Metadata',result.metadata?.status==='succeeded'?'Available':'Unavailable'],['Whisper','Not implemented']];
    for(const [label,value] of rows)summary.append(node('p',label+': '+value));
  }
  if(state.tab==="whisper"){panel.append(plainEmpty("Independent Whisper is not active","Audio capture and speech recognition are planned for a future release. This tab never displays platform captions as Whisper output."));return;}
  if(state.tab==="post"){
    if(!result){panel.append(plainEmpty('No post request yet','Inspect a TikTok or Facebook video to retrieve public post text and hashtags.'));return;}
    if(!result.post?.text){panel.append(plainEmpty('Post text unavailable',explain(result.post?.code||result.code)));return;}
    panel.append(node('p',result.post.provenance,'output-note'),node('div',result.post.text,'post-output'));
    if(result.post.hashtags?.length)panel.append(node('p',result.post.hashtags.join(' '),'output-note'));
    if(result.post.completeness==='page_preview_may_be_truncated')panel.append(node('p','Facebook exposes this text in its public share preview. It may be shortened. It is post text, not an independently generated transcript.','output-note'));
    return;
  }
  if(state.tab==="metadata"){
    if(!result){panel.append(plainEmpty('No metadata request yet','Inspect a TikTok or Facebook video to retrieve available public metadata.'));return;}
    if(result.metadata?.status!=='succeeded'){panel.append(plainEmpty('Metadata unavailable',explain(result.metadata?.code||result.code)));return;}
    const labels={platform:'Platform',creator:'Creator',username:'Username',publishedAt:'Published',durationSeconds:'Duration (seconds)',width:'Width (pixels)',height:'Height (pixels)',language:'Language',views:'Views',likes:'Likes',comments:'Comments',shares:'Shares',saves:'Saves',title:'Title',engagementSummary:'Engagement shown by Facebook'};
    const list=node('dl',undefined,'detail-list');for(const [key,value] of Object.entries(result.metadata.fields))list.append(node('dt',labels[key]||key),node('dd',value));
    panel.append(node('p',result.metadata.provenance+'. Only fields returned by the public page are shown; counts reflect retrieval time.','output-note'),list);return;
  }
  if(!state.result){panel.append(plainEmpty("No caption request yet","Paste a TikTok or Facebook link above. Available captions, post text and metadata will appear here."));return;}
  if(!state.result.ok){panel.append(plainEmpty("Native captions unavailable",explain(state.result.code)));return;}
  const wrap=node("div",undefined,"caption-output");
  for(const cue of state.result.cues){const line=node("div",undefined,"cue");line.append(node("time",cue.start),node("span",cue.text));wrap.append(line);}
  const note=node("p",state.result.cues.length+" caption cues from an existing platform track. Not independently transcribed.","output-note");
  panel.append(wrap,note);
}
const errorText={
  CONTENT_NOT_FOUND:"The public page did not expose this information in a supported format. It may still be visible on the platform.",
  AUTH_DENIED:"Owner authentication was rejected. Sign in again to this private Site.",
  RATE_LIMITED:"The research request limit was reached. Wait one minute and retry.",
  INVALID_URL:"The link is invalid or outside the supported video formats.",
  NOT_IMPLEMENTED:"Native caption retrieval is not implemented for this platform or link style. Post text and metadata may still be available in their tabs.",
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
function setBusy(flag){state.busy=flag;$("probe-button").disabled=flag;$("probe-button").textContent=flag?"Inspecting…":"Extract video ↗";}
async function doProbe(event){
  event.preventDefault();if(state.busy)return;
  const input=$("video-url").value.trim(),context=diagnosticLinkContext(input);
  state.currentTrace=makeTrace();state.trace=[];state.result=null;state.sourceUrl=input;$("output-action-status").textContent="";$("history-save-status").textContent="Extracting. Available content will be saved privately.";
  $("trace-id").textContent=state.currentTrace;
  setContext(context);renderTab();setBusy(true);displayStatus("Validating");
  const base={traceId:state.currentTrace,...context,source:"browser",transport:state.backend?(state.site?"site_backend":"local_backend"):"browser_direct"};
  const result=classifyPublicVideoUrl(input);
  record({...base,stage:"url_validate",status:result.ok?"succeeded":"failed",code:result.ok?"OK":"INVALID_URL",durationMs:0});
  if(!result.ok){$("history-save-status").textContent="No extraction saved. Check the video link.";state.result={ok:false,code:"INVALID_URL"};displayStatus("Invalid link","error");renderTab();setBusy(false);return;}
  if(!state.backend){$("history-save-status").textContent="No extraction saved. The backend is unavailable.";record({...base,stage:"request_start",status:"unavailable",code:"BACKEND_UNAVAILABLE"});state.result={ok:false,code:"BACKEND_UNAVAILABLE"};displayStatus("Backend offline","error");renderTab();setBusy(false);return;}
  if(!['tiktok','facebook'].includes(result.platform)){$("history-save-status").textContent="No extraction saved. This platform is not supported yet.";record({...base,stage:"provider_identify",status:"unavailable",code:"NOT_IMPLEMENTED"});state.result={ok:false,code:"NOT_IMPLEMENTED"};displayStatus("Not supported yet");renderTab();setBusy(false);return;}
  record({...base,stage:"request_start",status:"started",code:"STARTED"});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),35000);const started=performance.now();
  try{
    const response=await fetch("/api/captions",{method:"POST",headers:authHeaders(true),body:JSON.stringify({url:input,traceId:state.currentTrace}),signal:controller.signal});
    if(!response.ok){$("history-save-status").textContent="No extraction saved. The request was rejected.";const problem=await response.json();const code=problem.code||"BACKEND_UNAVAILABLE";state.result={ok:false,code};displayStatus("Request rejected","error");record({...base,stage:"request_start",status:"failed",code,durationMs:Math.round(performance.now()-started)});return;}
    const outcome=await response.json();
    for(const serverEvent of Array.isArray(outcome.events)?outcome.events:[])record(serverEvent,{sync:false});
    state.result=outcome;
    $("history-save-status").textContent=outcome.historyStatus==='saved'?'Saved to Recent. Available for 30 days.':outcome.historyStatus==='failed'?'Could not save to Recent. Copy or export this result before leaving.':state.site?'No available content to save.':'Private history is available on the hosted Site.';
    if(state.site)void refreshHistory();
    const partial=!outcome.ok&&(!!outcome.post?.text||outcome.metadata?.status==='succeeded');
    if(partial){state.tab=outcome.post?.text?'post':'metadata';}
    if(outcome.unpersistedCaptionHost)setContext(context,{"Rejected caption host (not stored)":outcome.unpersistedCaptionHost});
    if(outcome.ok){displayStatus("Captions retrieved","ok");setContext(context,{"Caption tracks":outcome.captionTrackCount,"Caption cues":outcome.cues.length});}
    else if(partial)displayStatus('Post information retrieved; captions unavailable','ok');
    else displayStatus(outcome.code==="CAPTIONS_NOT_FOUND"?"No track found":"Retrieval failed","error");
    if(!outcome.diagnosticsStored){state.storageFailed=true;$("storage-indicator").textContent="Storage failed; browser copy only";}
    record({...base,stage:"result_render",status:outcome.ok||partial?"succeeded":"failed",code:partial?'PARTIAL_RESULT':outcome.code||"INTERNAL_ERROR",durationMs:Math.round(performance.now()-started),captionCueCount:outcome.ok?outcome.cues.length:undefined,postTextFound:!!outcome.post?.text,metadataFound:outcome.metadata?.status==='succeeded'});
  }catch(e){
    const code=e?.name==="AbortError"?"TIMEOUT":"BACKEND_UNAVAILABLE";
    $("history-save-status").textContent="No extraction saved. The request could not finish.";state.result={ok:false,code};displayStatus("Connection failed","error");
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
    state.site=data.backend==="sites_private";state.historyAvailable=!!data.historyAvailable;void refreshHistory();
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
    $("storage-check-result").textContent=response.ok&&['writePassed','privacyPassed','deletePassed','expiryPassed','historyWritePassed','historyIsolationPassed','historyDeletePassed','historyExpiryPassed'].every(k=>data[k])?'Passed: diagnostics and history write, isolation, expiry and deletion.':'Storage checks failed. Check backend storage status.';
  }catch{$("storage-check-result").textContent='Storage checks could not reach the authenticated backend.';}
  finally{$("storage-check").disabled=false;}
});
restoreLocal();drawEvents();renderTab();drawTrace();setContext(diagnosticLinkContext(""));navigate();void checkBackend();


function navigate(){
  const view=['extract','recent','diagnostics'].includes(location.hash.slice(1))?location.hash.slice(1):'extract';
  document.querySelectorAll('[data-page]').forEach(p=>p.hidden=p.dataset.page!==view);
  document.querySelectorAll('[data-view]').forEach(a=>{const active=a.dataset.view===view;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  $('view-label').textContent=view[0].toUpperCase()+view.slice(1);
  if(view==='recent')void refreshHistory();
}
function drawHistory(){
  $('history-count').textContent=String(state.history.length);
  const query=$('history-search').value.trim().toLowerCase(),platform=$('history-platform').value;
  const list=$('history-items');list.replaceChildren();
  const items=state.history.filter(x=>(platform==='all'||x.platform===platform)&&(!query||[x.title,x.creator,x.platform].join(' ').toLowerCase().includes(query)));
  if(!items.length){list.append(plainEmpty(state.history.length?'No matching extractions':'Your next good find goes here.',state.history.length?'Try another search or platform.':'Extract a TikTok or Facebook video. Available content will save here automatically.'));}
  for(const item of items){
    const card=node('article',undefined,'history-card'),open=node('button',undefined,'history-open');open.type='button';open.setAttribute('aria-label','Open extraction: '+item.title);
    open.append(node('span',item.platform,'platform-tag'),node('strong',item.title),node('small',(item.creator||'Creator unavailable')+' · '+new Date(item.createdAt).toLocaleString()),node('div',[item.captionCueCount?item.captionCueCount+' caption cues':null,item.postAvailable?'Post text':null,item.metadataAvailable?'Metadata':null].filter(Boolean).join(' · '),'history-badges'));
    open.addEventListener('click',()=>openExtraction(item.id));
    const del=node('button','Delete','outline danger');del.type='button';del.setAttribute('aria-label','Delete extraction: '+item.title);del.addEventListener('click',()=>{state.pendingDelete=item.id;$('delete-dialog').showModal();});
    card.append(open,del);list.append(card);
  }
  const preview=$('recent-preview');preview.replaceChildren();
  if(!state.history.length)preview.append(node('p','Your next good find goes here.','muted-text'));
  for(const item of state.history.slice(0,3)){
    const a=node('a',undefined,'preview-item');a.href='#extract';a.append(node('strong',item.title),node('small',item.platform+' · '+(item.creator||'Saved extraction')));a.addEventListener('click',e=>{e.preventDefault();void openExtraction(item.id);});preview.append(a);
  }
}
async function refreshHistory(){
  if(!state.site||!state.historyAvailable){$('history-status').textContent=state.site?'Private history is unavailable. New extractions can still be copied or exported.':'Private history is available on the hosted Site.';drawHistory();return;}
  try{const response=await fetch('/api/history',{cache:'no-store',headers:authHeaders()});if(!response.ok)throw Error('history');const data=await response.json();state.history=data.items||[];$('history-status').textContent=state.history.length+' saved '+(state.history.length===1?'extraction':'extractions')+' · Latest 50 · Automatically expire after 30 days';drawHistory();}
  catch{$('history-status').textContent='Could not load Recent. Refresh to try again.';}
}
async function openExtraction(id){
  if(state.busy)return;
  try{const response=await fetch('/api/history/'+id,{cache:'no-store',headers:authHeaders()});if(!response.ok)throw Error('missing');const {item}=await response.json();state.result={...item.result,historyId:item.id};state.sourceUrl=item.sourceUrl;state.currentTrace=null;state.trace=[];$('trace-id').textContent='Saved extraction';drawTrace();setContext(diagnosticLinkContext(item.sourceUrl));$('video-url').value=item.sourceUrl;state.tab=item.result.ok?'captions':item.result.post?.text?'post':'metadata';$('output-action-status').textContent='';$('history-save-status').textContent='Saved extraction · Expires '+new Date(item.expiresAt).toLocaleDateString();displayStatus('Opened saved extraction','ok');renderTab();location.hash='extract';window.scrollTo({top:0,behavior:'smooth'});}
  catch{$('history-status').textContent='This extraction is unavailable or has expired. Refresh Recent.';}
}
function downloadOutput(filename,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=node('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);}
window.addEventListener('hashchange',navigate);
$('history-search').addEventListener('input',drawHistory);$('history-platform').addEventListener('change',drawHistory);$('refresh-history').addEventListener('click',refreshHistory);
$('copy-output').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(tabText(state.result,state.tab));$('output-action-status').textContent='Copied to clipboard.';}catch{$('output-action-status').textContent='Clipboard unavailable. Use Export text instead.';}});
$('export-text').addEventListener('click',()=>{if(state.result)downloadOutput('gs-pen-extraction.txt',exportText(state.result,state.sourceUrl),'text/plain;charset=utf-8');});
$('export-json').addEventListener('click',()=>{if(state.result)downloadOutput('gs-pen-extraction.json',JSON.stringify(exportRecord(state.result,state.sourceUrl),null,2),'application/json');});
$('delete-dialog').addEventListener('close',async()=>{
 const id=state.pendingDelete;state.pendingDelete=null;if($('delete-dialog').returnValue!=='delete'||!id)return;
 try{const response=await fetch('/api/history/'+id,{method:'DELETE',headers:authHeaders()});if(!response.ok)throw Error('delete');state.history=state.history.filter(x=>x.id!==id);drawHistory();$('history-status').textContent='Extraction deleted.';if(state.result?.historyId===id)$('history-save-status').textContent='Deleted from Recent. Current result remains open until you leave.';}
 catch{$('history-status').textContent='Could not delete the extraction. Your saved content has not been cleared.';}
});
