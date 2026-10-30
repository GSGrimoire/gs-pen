// Public Facebook share-link resolver. It fetches only whitelisted share URLs,
// validates every hop and discards the response body except a small 200-HTML
// canonical hint. It does not fetch media, use credentials or follow redirects.
import { classifyPublicVideoUrl } from '../src/url-classifier.mjs';

const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const HOSTS = new Set(['www.facebook.com','facebook.com','m.facebook.com']);
const MAX_HOPS = 3, HTML_LIMIT = 131072;

export function canonicalFacebookVideoUrl(input) {
  const v=classifyPublicVideoUrl(input);
  if(!v.ok || v.platform!=='facebook' || v.requiresRedirectResolution) return null;
  const u=new URL(v.url), host=u.hostname;
  if(!HOSTS.has(host))return null;
  const p=u.pathname.split('/').filter(Boolean);
  if(p[0]==='reel'&&p.length===2&&/^\d{8,30}$/.test(p[1]))
    return 'https://www.facebook.com/reel/'+p[1];
  if(p[0]==='watch'&&p.length===1&&/^\d{8,30}$/.test(u.searchParams.get('v')||''))
    return 'https://www.facebook.com/watch/?v='+u.searchParams.get('v');
  if(p.length>=3&&p.length<=4&&p[1]==='videos'&&/^\d{8,30}$/.test(p.at(-1)))
    return 'https://www.facebook.com/'+p.join('/');
  return null;
}
function classifiedShare(input) {
  const v=classifyPublicVideoUrl(input);
  if(!v.ok||v.platform!=='facebook'||!v.requiresRedirectResolution)return null;
  const u=new URL(v.url);
  if(u.hostname!=='fb.watch'&&!HOSTS.has(u.hostname))return null;
  u.search='';u.hash='';
  return u.href;
}
function resultError(code,redirectCount,httpStatus) {
  return {ok:false,code,redirectCount,...(httpStatus?{httpStatus}:{})};
}
async function canonicalHint(response,base) {
  if(!response.body)return null;
  const reader=response.body.getReader();
  const chunks=[];let size=0;
  try {
    while(true){
      const {value,done}=await reader.read();if(done)break;
      size+=value.length;
      if(size>HTML_LIMIT){await reader.cancel();return null;}
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size),decoder=new TextDecoder();
  let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  const html=decoder.decode(bytes);
  const tags=html.match(/<(?:meta|link)\b[^>]*>/gi)||[];
  for(const tag of tags.slice(0,250)){
    const attrs={};
    for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[m[1].toLowerCase()]=m[2]??m[3];
    const candidate=(attrs.property||'').toLowerCase()==='og:url'?attrs.content:
      (attrs.rel||'').toLowerCase()==='canonical'?attrs.href:null;
    if(!candidate)continue;
    let target;try{target=new URL(candidate.replace(/&amp;/g,'&'),base).href;}catch{continue;}
    const canonical=canonicalFacebookVideoUrl(target);
    if(canonical)return canonical;
  }
  return null;
}
export async function resolveFacebookShareUrl(source,fetchImpl=fetch) {
  const start=canonicalFacebookVideoUrl(source);
  if(start)return {ok:true,url:start,redirectCount:0};
  let current=classifiedShare(source);
  if(!current)return resultError('SHORT_LINK_TARGET_REJECTED',0);
  const seen=new Set();
  for(let count=0;count<MAX_HOPS;count++){
    if(seen.has(current))return resultError('SHORT_LINK_UNRESOLVED',count);
    seen.add(current);
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    let response;
    try{
      response=await fetchImpl(current,{method:'GET',redirect:'manual',signal:controller.signal,
        headers:{Accept:'text/html','User-Agent':'GS-Pen-Feasibility/0.1'}});
    }catch(error){
      return resultError(error?.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR',count);
    }finally{clearTimeout(timeout);}
    if(response.status===200){
      const canonical=await canonicalHint(response,current);
      return canonical?{ok:true,url:canonical,redirectCount:count}:resultError('SHORT_LINK_UNRESOLVED',count,200);
    }
    const location=response.headers?.get('location');
    try{await response.body?.cancel();}catch{}
    if(!REDIRECTS.has(response.status))
      return resultError('PROVIDER_BLOCKED',count,response.status);
    if(!location)return resultError('SHORT_LINK_UNRESOLVED',count+1,response.status);
    let dest;try{
      const u=new URL(location,current);
      if(u.protocol!=='https:'||u.username||u.password||u.port)
        return resultError('SHORT_LINK_TARGET_REJECTED',count+1,response.status);
      dest=u.href;
    }catch{return resultError('SHORT_LINK_TARGET_REJECTED',count+1,response.status);}
    const canonical=canonicalFacebookVideoUrl(dest);
    if(canonical)return {ok:true,url:canonical,redirectCount:count+1};
    const share=classifiedShare(dest);
    if(!share)return resultError('SHORT_LINK_TARGET_REJECTED',count+1,response.status);
    current=share;
  }
  return resultError('SHORT_LINK_UNRESOLVED',MAX_HOPS);
}
