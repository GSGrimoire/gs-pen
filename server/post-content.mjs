// Display-only public content. Never pass these objects to diagnostic storage.
export const textValue = (v, max=20000) => typeof v === 'string' && v.trim() ? v.trim().slice(0,max) : null;
const numberValue = v => (typeof v==='number'||typeof v==='string') && v!=='' && Number.isFinite(Number(v)) && Number(v)>=0 ? Number(v) : null;
export function isoDate(v) {
  if(!v)return null;
  const n=numberValue(v),date=new Date(n===null?v:n*1000);
  return Number.isFinite(date.valueOf())?date.toISOString():null;
}
export function hashtags(text) {return [...new Set(text?.match(/#[\p{L}\p{N}_]+/gu)||[])].slice(0,100);}
export function unavailableContent(code='CONTENT_NOT_FOUND') {
  return {post:{status:'unavailable',code,text:null,hashtags:[]},metadata:{status:'unavailable',code,fields:{}}};
}
export function matchedTikTokItem(markup, expectedId) {
  // Try only public embedded page-state formats and select the exact requested
  // video identifier. Never use a recommended video's metadata or captions.
  for(const [name,pick] of [
    ['__UNIVERSAL_DATA_FOR_REHYDRATION__',data=>data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct],
    ['SIGI_STATE',data=>data?.ItemModule?.[expectedId]],
    ['__NEXT_DATA__',data=>data?.props?.pageProps?.itemInfo?.itemStruct]
  ]){
    const scripts=markup.matchAll(/<script\b[^>]*\bid=["']([^"']+)["'][^>]*>([\s\S]*?)<\/script>/gi);
    for(const match of scripts){
      if(match[1]!==name)continue;
      let item;
      try{item=pick(JSON.parse(match[2]));}catch{continue;}
      if(item && String(item.id)===String(expectedId))return item;
    }
  }
  return null;
}
export function tiktokContent(input, expectedId) {
  const missing=unavailableContent();
  const item=typeof input==='string'?matchedTikTokItem(input,expectedId):input;
  if(!item || String(item.id)!==String(expectedId))return missing;
  const text=textValue(item.desc),author=item.author||{},video=item.video||{},stats=item.statsV2||item.stats||{};
  const fields={platform:'TikTok',creator:textValue(author.nickname,200),username:textValue(author.uniqueId,200),publishedAt:isoDate(item.createTime),
    durationSeconds:numberValue(video.duration),width:numberValue(video.width),height:numberValue(video.height),language:textValue(item.textLanguage,30),
    views:numberValue(stats.playCount),likes:numberValue(stats.diggCount),comments:numberValue(stats.commentCount),shares:numberValue(stats.shareCount),saves:numberValue(stats.collectCount)};
  for(const k of Object.keys(fields))if(fields[k]===null)delete fields[k];
  return {post:{status:text?'succeeded':'unavailable',code:text?'OK':'CONTENT_NOT_FOUND',text,hashtags:hashtags(text),provenance:'TikTok public video data',completeness:'platform_field'},
    metadata:{status:'succeeded',code:'OK',fields,provenance:'TikTok public video data'}};
}

function decodeHtml(s) {
  return s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):'';})
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
}
export function facebookContent(markup, expectedId) {
  const missing=unavailableContent();
  // Only recognized video objects for this exact request; never unrelated recommendations.
  const objects=[];let visited=0;
  function walk(n,depth=0){
    if(!n||typeof n!=='object'||depth>60||++visited>35000)return;
    if((n.__typename==='Video'||n['@type']==='VideoObject') && (String(n.id)===expectedId || String(n.video_id)===expectedId || [n.url,n['@id']].some(u=>typeof u==='string'&&new RegExp('(?:/|=)'+expectedId+'(?:[/?&#]|$)').test(u))))objects.push(n);
    for(const v of Object.values(n))walk(v,depth+1);
  }
  for(const m of markup.matchAll(/<script\b[^>]*type=["']application\/(?:ld\+)?json["'][^>]*>([\s\S]*?)<\/script>/gi))try{walk(JSON.parse(m[1]));}catch{}
  const video=objects.find(o=>o.creation_story||o.owner||o.description)||objects[0];
  const meta={};
  for(const m of markup.matchAll(/<meta\b[^>]*>/gi)){
    const attrs={};for(const a of m[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[a[1].toLowerCase()]=decodeHtml(a[2]??a[3]);
    const key=attrs.property||attrs.name;if(key&&attrs.content)meta[key]=attrs.content;
  }
  const title=textValue(meta['og:title'],1000),description=textValue(meta['og:description']);
  // Facebook's public share title can carry a longer post than its description.
  // Accept the known engagement | post | creator layout only, with explicit provenance.
  const longTitle=textValue(meta['og:title']),parts=longTitle?.split(' | ')||[];
  const titleLayout=parts.length>=3 && /\d/.test(parts[0]) && /views|visninger|reactions|reaktioner|likes|reproducciones|vues|Aufrufe/i.test(parts[0]) && parts.at(-1).length<=200 && !parts.at(-1).includes('\n');
  // Login/error shells must never be mistaken for a real post description.
  const generic=s=>!s||/^(Facebook|Log in|Log into Facebook|Facebook - log in or sign up|Watch|Reels)\s*[|.!]?$/i.test(s)||/^Watch (more )?videos|^Log (in|into)|^Connect with|^See posts, photos|^Join Facebook/i.test(s);
  const story=video?.creation_story;
  const fullText=textValue(story?.message?.text||video?.description?.text||video?.description);
  const titleText=titleLayout?parts.slice(1,-1).join(' | '):null;
  const text=fullText||(titleText&&titleText.length>(description?.length||0)?titleText:null)||(!generic(description)?description:null);
  const author=video?.owner||video?.author||story?.actors?.[0];
  const fields={platform:'Facebook',creator:textValue(typeof author==='string'?author:author?.name,200)||(titleLayout?parts.at(-1):null),title:generic(title)?null:(titleText?titleText.split('\n')[0]:title),engagementSummary:titleLayout?parts[0]:null,
    publishedAt:isoDate(video?.publish_time||video?.creation_time||video?.uploadDate),
    durationSeconds:numberValue(video?.length_in_second),width:numberValue(video?.width),height:numberValue(video?.height)};
  for(const k of Object.keys(fields))if(fields[k]===null)delete fields[k];
  const meaningful=Object.keys(fields).length>1;
  return {post:text?{status:'succeeded',code:'OK',text,hashtags:hashtags(text),provenance:fullText?'Facebook public video data':text===titleText?'Facebook public share title':'Facebook public page description',completeness:fullText?'platform_field':'page_preview_may_be_truncated'}:missing.post,
    metadata:meaningful?{status:'succeeded',code:'OK',fields,provenance:video?'Facebook public video data and page metadata':'Facebook public page metadata'}:missing.metadata};
}
