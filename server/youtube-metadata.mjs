// YouTube's public oEmbed endpoint provides limited embed metadata, not captions.
// No watch-page scraping, cookies, redirects or audiovisual downloads.
import {classifyPublicVideoUrl} from '../src/url-classifier.mjs';
import {discardBody} from './discard-body.mjs';

const ID = /^[A-Za-z0-9_-]{11}$/;
const MAX_BYTES = 32_768;
const REQUEST_MS = 12_000;
const encoder = new TextDecoder();

export function youtubeVideoId(rawUrl) {
  const classified = classifyPublicVideoUrl(rawUrl);
  if (!classified.ok || classified.platform !== 'youtube') return null;
  const url = new URL(classified.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = url.hostname === 'youtu.be' ? segments[0]
    : segments[0] === 'shorts' ? segments[1] : url.searchParams.get('v');
  return ID.test(id || '') ? id : null;
}
function safeText(value, limit) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : null;
}
function safeChannelUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password ||
      !['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname)) return null;
    return url.origin + url.pathname;
  } catch { return null; }
}
function safeThumbnail(value, expectedId) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'i.ytimg.com' || url.port ||
      url.username || url.password || url.search || url.hash ||
      !url.pathname.startsWith('/vi/' + expectedId + '/')) return null;
    return url.href;
  } catch { return null; }
}
async function boundedJsonResponse(response) {
  if (!response.body) return {code:'CONTENT_NOT_FOUND'};
  const sizeHeader = Number(response.headers?.get('content-length'));
  if (Number.isFinite(sizeHeader) && sizeHeader > MAX_BYTES) {
    discardBody(response.body);
    return {code:'RESPONSE_TOO_LARGE'};
  }
  const reader = response.body.getReader(), chunks = [];
  let total = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) {
        discardBody(reader);
        return {code:'RESPONSE_TOO_LARGE'};
      }
      chunks.push(value);
    }
  } finally { try { reader.releaseLock(); } catch {} }
  const all = new Uint8Array(total);
  let position = 0;
  for (const chunk of chunks) { all.set(chunk, position); position += chunk.length; }
  try { return {value:JSON.parse(encoder.decode(all))}; }
  catch { return {code:'CONTENT_NOT_FOUND'}; }
}

export async function readYoutubeEmbedMetadata(rawUrl,{fetchImpl=fetch}={}) {
  const videoId = youtubeVideoId(rawUrl);
  if (!videoId) return {ok:false,code:'INVALID_URL'};
  // All provider requests use this fixed host and canonical, tracking-free video ID.
  const canonical = 'https://www.youtube.com/watch?v=' + videoId;
  const endpoint = 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(canonical);
  const controller = new AbortController();
  let deadline;
  const timeout = new Promise((_, reject) => {
    deadline = setTimeout(() => {
      controller.abort();
      reject(Object.assign(new Error('deadline'),{name:'AbortError'}));
    },REQUEST_MS);
  });
  const attempt = async () => {
    const response = await fetchImpl(endpoint,{
      method:'GET',redirect:'manual',credentials:'omit',signal:controller.signal,
      headers:{Accept:'application/json'}
    });
    if (response.status !== 200) {
      discardBody(response.body);
      return {ok:false,code:response.status === 404 ? 'CONTENT_NOT_FOUND' : 'PROVIDER_BLOCKED'};
    }
    const read = await boundedJsonResponse(response);
    if (read.code) return {ok:false,code:read.code};
    const payload = read.value;
    if (!payload || Array.isArray(payload) || typeof payload !== 'object' ||
      payload.type !== 'video' || payload.provider_name !== 'YouTube') {
      return {ok:false,code:'CONTENT_NOT_FOUND'};
    }
    const title = safeText(payload.title, 600), creator = safeText(payload.author_name, 200);
    if (!title && !creator) return {ok:false,code:'CONTENT_NOT_FOUND'};
    const fields = {platform:'YouTube',videoId};
    if (title) fields.title = title;
    if (creator) fields.creator = creator;
    const channelUrl = safeChannelUrl(payload.author_url);
    const thumbnailUrl = safeThumbnail(payload.thumbnail_url,videoId);
    if (channelUrl) fields.channelUrl = channelUrl;
    if (thumbnailUrl) fields.thumbnailUrl = thumbnailUrl;
    return {ok:true,fields,provenance:'YouTube public oEmbed metadata'};
  };
  try { return await Promise.race([attempt(),timeout]); }
  catch (error) { return {ok:false,code:error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR'}; }
  finally { clearTimeout(deadline); controller.abort(); }
}
