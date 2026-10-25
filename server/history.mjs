import { classifyPublicVideoUrl } from '../src/url-classifier.mjs';
// Legacy age retained only for compatibility tests; HISTORY_LIMIT is a list window.
export const HISTORY_AGE = 30 * 86400000, HISTORY_LIMIT = 50;
// Automatic deletion is paused. Legacy expires_at values must not hide or purge rows.
export async function expireHistory() { return {paused:true}; }
// This input comes directly from the server resolver, never from a client-submitted result.
export function historyPayload(result) {
  const payload={ok:!!result.ok,code:result.code,cues:result.cues||[],captionTrackCount:result.captionTrackCount||0,captionType:'platform',post:result.post,metadata:result.metadata};
  if(!(payload.cues.length||payload.post?.text||payload.metadata?.status==='succeeded'))return null;
  const text=JSON.stringify(payload);
  if(new TextEncoder().encode(text).length>512000)throw Error('history_size');
  return text;
}
export async function saveExtraction(db,ownerId,rawUrl,result,now=Date.now()) {
  const payload=historyPayload(result);if(!payload)return null;
  const verdict=classifyPublicVideoUrl(rawUrl);if(!verdict.ok)return null;
  const u=new URL(verdict.url);u.hash='';u.search='';
  const original=new URL(verdict.url);if(original.pathname.startsWith('/watch'))u.searchParams.set('v',original.searchParams.get('v'));
  const id=crypto.randomUUID();
  await db.batch([
    db.prepare('INSERT INTO extractions (id,owner_id,source_url,platform,created_at,expires_at,payload) VALUES (?,?,?,?,?,?,?)').bind(id,ownerId,u.href,verdict.platform,now,Number.MAX_SAFE_INTEGER,payload)
  ]);
  return id;
}
export function summarizeExtraction(row) {
  const result=JSON.parse(row.payload),fields=result.metadata?.fields||{};
  return {id:row.id,sourceUrl:row.source_url,platform:row.platform,createdAt:row.created_at,expiresAt:null,
    title:fields.title||result.post?.text?.split('\n')[0]?.slice(0,160)||'Video extraction',creator:fields.creator||fields.username||null,
    captionCueCount:result.cues?.length||0,postAvailable:!!result.post?.text,metadataAvailable:result.metadata?.status==='succeeded',code:result.code};
}
export async function listExtractions(db,ownerId,now=Date.now()) {
  await expireHistory(db,now);
  const rows=await db.prepare('SELECT * FROM extractions WHERE owner_id=? ORDER BY created_at DESC,id DESC LIMIT 50').bind(ownerId).all();
  return rows.results.map(summarizeExtraction);
}
export async function readExtraction(db,ownerId,id,now=Date.now()) {
  await expireHistory(db,now);
  const row=await db.prepare('SELECT * FROM extractions WHERE id=? AND owner_id=?').bind(id,ownerId).first();
  return row?{...summarizeExtraction(row),result:JSON.parse(row.payload)}:null;
}
export async function deleteExtraction(db,ownerId,id) {
  const result=await db.prepare('DELETE FROM extractions WHERE id=? AND owner_id=?').bind(id,ownerId).run();
  return Number(result.meta?.changes??result.changes??0)>0;
}
