// GS Pen diagnostic event sanitization v1. Structured output only; no network writes.
const ENUMS = Object.freeze({
  platform: ["youtube", "tiktok", "instagram", "facebook", "unknown"],
  stage: ["url_validate", "provider_identify", "auth_check", "request_start", "provider_page_fetch", "caption_track_discovery", "caption_host_validation", "caption_fetch", "caption_parse", "result_render", "history_write", "diagnostics_write", "finished"],
  status: ["started", "succeeded", "failed", "unavailable", "skipped"],
  source: ["browser", "site", "retrieval_service"],
  code: ["OK", "STARTED", "INVALID_URL", "UNSUPPORTED_PLATFORM", "AUTH_DENIED", "NETWORK_ERROR", "PROVIDER_BLOCKED", "CAPTIONS_NOT_FOUND", "CAPTION_HOST_REJECTED", "CAPTION_PARSE_FAILED", "CORS_DENIED", "TIMEOUT", "AUDIO_UNAVAILABLE", "STORAGE_FAILED", "INTERNAL_ERROR", "NOT_IMPLEMENTED"]
});
function fixed(value, values, fallback) {
  return typeof value === "string" && values.includes(value) ? value : fallback;
}
function safeId(value, max) {
  return typeof value === "string" && value.length <= max && /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}
function nonnegative(value, max) {
  return Number.isInteger(value) && value >= 0 && value <= max ? value : null;
}
/**
 * Rejects unrecognized properties by construction, including URL, transcript
 * text, signed track URLs, cookies, stack traces, and exception messages.
 */
export function sanitizeDiagnostic(input, now = new Date()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Structured input required");
  const traceId = safeId(input.traceId, 64);
  if (!traceId) throw new TypeError("Safe trace identifier required");
  const date = now instanceof Date && Number.isFinite(now.valueOf()) ? now.toISOString() : new Date(0).toISOString();
  const out = {
    schema: "gs-pen.diagnostic.v1",
    timestamp: date,
    traceId,
    platform: fixed(input.platform, ENUMS.platform, "unknown"),
    stage: fixed(input.stage, ENUMS.stage, "finished"),
    status: fixed(input.status, ENUMS.status, "failed"),
    code: fixed(input.code, ENUMS.code, "INTERNAL_ERROR"),
    source: fixed(input.source, ENUMS.source, "browser"),
    build: safeId(input.build, 32) ?? "unknown"
  };
  const durationMs = nonnegative(input.durationMs, 3600000);
  const captionCueCount = nonnegative(input.captionCueCount, 500000);
  const httpStatus = Number.isInteger(input.httpStatus) && input.httpStatus >= 100 && input.httpStatus <= 599 ? input.httpStatus : null;
  if (durationMs !== null) out.durationMs = durationMs;
  if (captionCueCount !== null) out.captionCueCount = captionCueCount;
  if (httpStatus !== null) out.httpStatus = httpStatus;
  if (typeof input.retryable === "boolean") out.retryable = input.retryable;
  return out;
}
