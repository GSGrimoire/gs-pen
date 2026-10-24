// GS Pen local-only Test Lab backend. NOT remotely deployable authentication.
import {createServer} from "node:http";
import {randomBytes,timingSafeEqual} from "node:crypto";
import {readFile,writeFile,mkdir,rename} from "node:fs/promises";
import {fileURLToPath,pathToFileURL} from "node:url";
import path from "node:path";
import {sanitizeDiagnostic} from "../src/diagnostics.mjs";
import {retrievePublicCaptions} from "./caption.mjs";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const STORE=path.join(ROOT,".local","diagnostics.json");
const MAX_EVENTS=2500, DAYS=30;
const CODESPACE_MODE=process.env.CODESPACES==="true" || process.env.CODESPACES==="1";
const CODE_NAME=process.env.CODESPACE_NAME||"";
const CODE_DOMAIN=process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN||"app.github.dev";
const CODE_PORT=Number(process.env.PORT||4173);
const CODESPACE_HOST=CODESPACE_MODE && /^[a-z0-9-]+$/i.test(CODE_NAME) ? (CODE_NAME+"-"+CODE_PORT+"."+CODE_DOMAIN) : null;
const DEVELOPMENT_KEY=CODESPACE_MODE ? randomBytes(24).toString("hex") : null;
function authorizedKey(value) {
  if(!DEVELOPMENT_KEY) return true;
  if(typeof value!=="string" || !/^[a-f0-9]{48}$/.test(value))return false;
  return timingSafeEqual(Buffer.from(value),Buffer.from(DEVELOPMENT_KEY));
}
const files=new Map([
  ["/","dist/index.html"],["/index.html","dist/index.html"],
  ["/app.mjs","dist/app.mjs"],["/styles.css","dist/styles.css"],
  ["/modules/url-classifier.mjs","dist/modules/url-classifier.mjs"],
  ["/modules/diagnostics.mjs","dist/modules/diagnostics.mjs"]
]);
let queue=Promise.resolve();
const now=()=>Date.now();
const cutoff=()=>now()-DAYS*86400000;
function filterFresh(events) {
  return events.filter(e=>typeof e.timestamp==="string" && Date.parse(e.timestamp)>=cutoff()).slice(-MAX_EVENTS);
}
async function getEvents() {
  try{const raw=JSON.parse(await readFile(STORE,"utf8"));return filterFresh(Array.isArray(raw)?raw:[]);}
  catch{return [];}
}
async function commitEvents(batch) {
  const writing=queue.then(async ()=>{
    const items=filterFresh([...(await getEvents()),...batch.map(item=>sanitizeDiagnostic(item))]);
    await mkdir(path.dirname(STORE),{recursive:true,mode:0o700});
    const tmp=STORE+".tmp";
    await writeFile(tmp,JSON.stringify(items),{mode:0o600});
    await rename(tmp,STORE);
  });
  queue=writing.catch(()=>{});
  return writing;
}
function headers(res,status,type="application/json; charset=utf-8"){
  res.writeHead(status,{"Content-Type":type,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer",
    "Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'",
    "X-Frame-Options":"DENY"});
}
function reply(res,status,body){headers(res,status);res.end(JSON.stringify(body));}
async function readJson(req){
  if(!String(req.headers["content-type"]||"").startsWith("application/json"))throw Error("content_type");
  const chunks=[];let count=0;
  for await (const chunk of req) {count+=chunk.length;if(count>4096)throw Error("too_large");chunks.push(chunk);}
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
let windowStart=now(), used=0;
export function createLocalTestServer(){
  return createServer(async(req,res)=>{
    // Loopback binding is intentional, not a general security system.
    const remote=req.socket.remoteAddress;
    const host=req.headers.host||"";
    const localHost=/^((127\.0\.0\.1)|(localhost)):\d{2,5}$/.test(host);
    const trustedForward=!!CODESPACE_HOST && host===CODESPACE_HOST;
    if(!["127.0.0.1","::1","::ffff:127.0.0.1"].includes(remote) || !(localHost||trustedForward)){
      reply(res,403,{code:"AUTH_DENIED"});return;
    }
    const origin=req.headers.origin;
    if(origin && origin!==((trustedForward?"https://":"http://")+host)){reply(res,403,{code:"AUTH_DENIED"});return;}
    const route=new URL(req.url||"/","http://"+host).pathname;
    if(req.method==="GET" && route==="/api/health"){
      reply(res,200,{build:"testlab_v1",backend:CODESPACE_MODE?"codespaces_private":"local_only",ownerAuth:CODESPACE_MODE?"github_private_forward_plus_development_key":"not_available",authRequired:!!DEVELOPMENT_KEY,diagnosticStorage:"local_file",captionAdapter:"tiktok_experimental",centralSiteStorage:false});return;
    }
    if(route.startsWith("/api/") && !authorizedKey(req.headers["x-gs-pen-dev-key"])) {reply(res,401,{code:"AUTH_DENIED"});return;}
    if(req.method==="GET" && route==="/api/diagnostics"){
      try {await queue;reply(res,200,{events:await getEvents(),retentionDays:DAYS,storage:"local_file"});}
      catch {reply(res,503,{code:"STORAGE_FAILED"});}
      return;
    }
    if(req.method==="DELETE" && route==="/api/diagnostics"){
      try{await queue;await mkdir(path.dirname(STORE),{recursive:true});await writeFile(STORE,"[]",{mode:0o600});reply(res,200,{cleared:true});}
      catch{reply(res,503,{code:"STORAGE_FAILED"});}return;
    }
    if(req.method==="POST" && ["/api/captions","/api/diagnostics"].includes(route)){
      if(now()-windowStart>60000){windowStart=now();used=0;}
      if(++used>60){reply(res,429,{code:"PROVIDER_BLOCKED"});return;}
      let data;try{data=await readJson(req);}catch{reply(res,400,{code:"INVALID_URL"});return;}
      if(route==="/api/diagnostics"){
        try{const event=sanitizeDiagnostic(data);await commitEvents([event]);reply(res,200,{saved:true,storage:"local_file"});}
        catch{reply(res,400,{code:"STORAGE_FAILED"});}return;
      }
      const events=[];
      let result;
      try{
        result=await retrievePublicCaptions(data.url,{traceId:data.traceId,build:"testlab_v1",onEvent:event=>events.push(event)});
      }catch{reply(res,500,{code:"INTERNAL_ERROR"});return;}
      let stored=false;
      try{await commitEvents(events);stored=true;}catch{/* response remains useful when logging fails */}
      reply(res,200,{...result,traceId:data.traceId,events,diagnosticsStored:stored,diagnosticsStorage:"local_file"});
      return;
    }
    if(req.method==="GET" && files.has(route)){
      try {
        const file=path.join(ROOT,files.get(route));
        const bytes=await readFile(file);
        const type=route.endsWith(".css")?"text/css; charset=utf-8":route.endsWith(".mjs")?"text/javascript; charset=utf-8":"text/html; charset=utf-8";
        headers(res,200,type);res.end(bytes);
      } catch {reply(res,404,{code:"NOT_IMPLEMENTED"});}
      return;
    }
    reply(res,404,{code:"NOT_IMPLEMENTED"});
  });
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const port=Number(process.env.PORT||4173);
  createLocalTestServer().listen(port,"127.0.0.1",()=>{
    process.stdout.write("GS Pen local Test Lab at http://127.0.0.1:"+port+"\n");
    if(CODESPACE_MODE)process.stdout.write("Codespaces development access key (paste into Test Lab): "+DEVELOPMENT_KEY+"\n");
  });
}
