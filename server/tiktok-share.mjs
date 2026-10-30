// Resolve only TikTok's public share-link redirects. Never follow a response
// automatically: each Location must be a supported TikTok video or share link.
import { classifyPublicVideoUrl } from '../src/url-classifier.mjs';

const REDIRECTS = new Set([301, 302, 303, 307, 308]);
const MAX_HOPS = 3;
const SHARE_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com']);
const VIDEO_HOSTS = new Set(['www.tiktok.com', 'tiktok.com', 'm.tiktok.com']);

function verifiedHop(candidate) {
  const result = classifyPublicVideoUrl(candidate);
  if (!result.ok || result.platform !== 'tiktok') return null;
  const url = new URL(result.url);
  // A Location is never permitted to dictate the next hostname outside TikTok.
  // Tracking parameters and fragments are not necessary for share tokens.
  url.search = '';
  url.hash = '';
  if (VIDEO_HOSTS.has(url.hostname) && /^\/@[^/]+\/video\/\d{8,30}\/?$/.test(url.pathname)) {
    return { canonical: 'https://www.tiktok.com' + url.pathname };
  }
  if (result.requiresRedirectResolution &&
      (SHARE_HOSTS.has(url.hostname) || (VIDEO_HOSTS.has(url.hostname) && /^\/t\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)))) {
    return { share: url.href };
  }
  return null;
}

function failure(code, redirectCount, httpStatus) {
  return { ok: false, code, redirectCount, ...(httpStatus ? { httpStatus } : {}) };
}

export async function resolveTikTokShareUrl(source, fetchImpl = fetch) {
  const initial = verifiedHop(source);
  if (!initial) return failure('SHORT_LINK_TARGET_REJECTED', 0);
  if (initial.canonical) return { ok: true, url: initial.canonical, redirectCount: 0 };

  let current = initial.share;
  const seen = new Set();
  for (let redirects = 0; redirects < MAX_HOPS; redirects++) {
    if (seen.has(current)) return failure('SHORT_LINK_UNRESOLVED', redirects);
    seen.add(current);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetchImpl(current, {
        method: 'GET', redirect: 'manual', signal: controller.signal,
        headers: { Accept: 'text/html', 'User-Agent': 'GS-Pen-Feasibility/0.1' }
      });
    } catch (error) {
      return failure(error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR', redirects);
    } finally {
      clearTimeout(timeout);
    }

    const { status } = response;
    // Do not read or retain HTML, cookies or signed media from share pages.
    const location = response.headers?.get('location');
    try { await response.body?.cancel(); } catch { /* no response body is needed */ }
    if (!REDIRECTS.has(status)) {
      return failure(status === 200 ? 'SHORT_LINK_UNRESOLVED' : 'PROVIDER_BLOCKED', redirects, status);
    }
    if (!location) return failure('SHORT_LINK_UNRESOLVED', redirects + 1, status);

    let next;
    try {
      const target = new URL(location, current);
      if (target.protocol !== 'https:' || target.port || target.username || target.password) {
        return failure('SHORT_LINK_TARGET_REJECTED', redirects + 1, status);
      }
      next = verifiedHop(target.href);
    } catch {
      return failure('SHORT_LINK_TARGET_REJECTED', redirects + 1, status);
    }
    if (!next) return failure('SHORT_LINK_TARGET_REJECTED', redirects + 1, status);
    if (next.canonical) return { ok: true, url: next.canonical, redirectCount: redirects + 1 };
    current = next.share;
  }
  return failure('SHORT_LINK_UNRESOLVED', MAX_HOPS);
}
