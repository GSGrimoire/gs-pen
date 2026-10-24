// GS Pen diagnostics v2: allowlisted metadata, never raw URLs or transcript text.
import { classifyPublicVideoUrl } from "./url-classifier.mjs";

const choices = {
  platform: ["youtube", "tiktok", "instagram", "facebook", "unknown"],
  stage: ["post_parse", "metadata_parse", "url_validate", "provider_identify", "auth_check", "request_start", "provider_page_fetch", "caption_track_discovery", "caption_host_validation", "caption_fetch", "caption_parse", "result_render", "history_write", "diagnostics_write", "finished"],
  status: ["started", "succeeded", "failed", "unavailable", "skipped"],
  source: ["browser", "site", "retrieval_service", "local_backend"],
  code: ["PARTIAL_RESULT", "CONTENT_NOT_FOUND", "OK", "STARTED", "INVALID_URL", "UNSUPPORTED_PLATFORM", "UNSUPPORTED_LINK_TYPE", "AUTH_DENIED", "NETWORK_ERROR", "PROVIDER_BLOCKED", "CAPTIONS_NOT_FOUND", "CAPTION_HOST_REJECTED", "CAPTION_PARSE_FAILED", "CORS_DENIED", "TIMEOUT", "AUDIO_UNAVAILABLE", "STORAGE_FAILED", "BACKEND_UNAVAILABLE", "INTERNAL_ERROR", "NOT_IMPLEMENTED", "RATE_LIMITED", "RESPONSE_TOO_LARGE"],
  linkType: ["watch", "shorts", "short_link", "reel", "creator_video", "share", "video", "unknown"],
  queryShape: ["none", "video_id_only", "additional_parameters", "unknown"],
  cdnFamily: ["tiktokcdn", "tiktokcdn_us", "tiktokcdn_eu", "tiktokv", "byteoversea", "ibytedtos", "tiktok", "unknown", "none"],
  transport: ["browser_direct", "site_backend", "local_backend", "none"],
  browserFamily: ["chromium", "firefox", "safari", "other", "unknown"],
  deviceClass: ["desktop", "mobile", "tablet", "unknown"],
  trackType: ["automatic", "human", "unknown", "none"],
  language: ["da", "en", "other", "unknown"],
  responseBucket: ["none", "under_1kb", "1_to_10kb", "10_to_100kb", "100kb_to_1mb", "over_1mb", "unknown"],
  contentType: ["html", "vtt", "json", "text", "other", "unknown"]
};
const pick = (field, value, fallback) => choices[field].includes(value) ? value : fallback;
const bounded = (v, max) => Number.isInteger(v) && v >= 0 && v <= max ? v : null;
const safeId = (v, max) => typeof v === "string" && /^[A-Za-z0-9_-]+$/.test(v) && v.length <= max ? v : null;
const HOSTS = new Set(["youtube.com","www.youtube.com","m.youtube.com","youtu.be","tiktok.com","www.tiktok.com","m.tiktok.com","vm.tiktok.com","vt.tiktok.com","instagram.com","www.instagram.com","facebook.com","www.facebook.com","m.facebook.com","fb.watch"]);
function family(host, root) { return host === root || host.endsWith("." + root); }

export function captionCdnFamily(hostname) {
  if (typeof hostname !== "string" || !/^[a-z0-9.-]{1,253}$/i.test(hostname)) return "unknown";
  const host = hostname.toLowerCase();
  if (family(host, "tiktokcdn-eu.com")) return "tiktokcdn_eu";
  if (family(host, "tiktokcdn-us.com")) return "tiktokcdn_us";
  if (family(host, "tiktokcdn.com")) return "tiktokcdn";
  if (family(host, "tiktokv.com")) return "tiktokv";
  if (family(host, "byteoversea.com")) return "byteoversea";
  if (family(host, "ibytedtos.com")) return "ibytedtos";
  if (family(host, "tiktok.com")) return "tiktok";
  return "unknown";
}

export function diagnosticLinkContext(input) {
  const verdict = classifyPublicVideoUrl(input);
  if (!verdict.ok) return { platform: "unknown", sourceDomain: "unknown", linkType: "unknown", queryShape: "unknown", requiresRedirect: false };
  const u = new URL(verdict.url);
  const p = u.pathname.split("/").filter(Boolean);
  let linkType = "video";
  if (["youtu.be", "fb.watch", "vm.tiktok.com", "vt.tiktok.com"].includes(u.hostname)) linkType = "short_link";
  else if (p.includes("shorts")) linkType = "shorts";
  else if (p.includes("reel")) linkType = "reel";
  else if (p.includes("share") || p.includes("t")) linkType = "share";
  else if (u.pathname.startsWith("/watch")) linkType = "watch";
  else if (verdict.platform === "tiktok") linkType = "creator_video";
  const queryShape = !u.search ? "none" :
    (u.searchParams.size === 1 && u.searchParams.has("v")) ? "video_id_only" : "additional_parameters";
  return {
    platform: verdict.platform, sourceDomain: HOSTS.has(u.hostname) ? u.hostname : "unknown",
    linkType, queryShape, requiresRedirect: !!verdict.requiresRedirectResolution
  };
}

export function responseSizeBucket(byteCount) {
  if (!Number.isFinite(byteCount) || byteCount < 0) return "unknown";
  if (byteCount === 0) return "none";
  if (byteCount < 1024) return "under_1kb";
  if (byteCount < 10 * 1024) return "1_to_10kb";
  if (byteCount < 100 * 1024) return "10_to_100kb";
  if (byteCount < 1024 * 1024) return "100kb_to_1mb";
  return "over_1mb";
}

/** Strict whitelist. No value derived from arbitrary text goes into logs. */
export function sanitizeDiagnostic(input, now = new Date()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Structured input required");
  const traceId = safeId(input.traceId, 64);
  if (!traceId) throw new TypeError("Safe trace identifier required");
  const date = now instanceof Date && Number.isFinite(now.valueOf()) ? now.toISOString() : new Date(0).toISOString();
  const out = {
    schema: "gs-pen.diagnostic.v2", timestamp: date, traceId,
    platform: pick("platform", input.platform, "unknown"),
    stage: pick("stage", input.stage, "finished"),
    status: pick("status", input.status, "failed"),
    code: pick("code", input.code, "INTERNAL_ERROR"),
    source: pick("source", input.source, "browser"),
    build: safeId(input.build, 32) ?? "unknown"
  };
  const optional = {
    linkType: "unknown", queryShape: "unknown", cdnFamily: "unknown",
    transport: "none", browserFamily: "unknown", deviceClass: "unknown",
    trackType: "unknown", language: "unknown", responseBucket: "unknown",
    contentType: "unknown"
  };
  for (const [name, fallback] of Object.entries(optional)) {
    if (Object.hasOwn(input, name)) out[name] = pick(name, input[name], fallback);
  }
  if (Object.hasOwn(input, "sourceDomain")) out.sourceDomain = HOSTS.has(input.sourceDomain) ? input.sourceDomain : "unknown";
  for (const [name, max] of [["durationMs",3600000],["captionCueCount",500000],["captionTrackCount",100],["attempt",10],["redirectCount",10],["downloadMs",3600000]]) {
    const value = bounded(input[name], max);
    if (value !== null) out[name] = value;
  }
  const httpStatus = bounded(input.httpStatus, 599);
  if (httpStatus !== null && httpStatus >= 100) out.httpStatus = httpStatus;
  for (const name of ["retryable","requiresRedirect","postTextFound","metadataFound"]) if (typeof input[name] === "boolean") out[name] = input[name];
  return out;
}

