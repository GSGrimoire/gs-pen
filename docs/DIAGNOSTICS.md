# GS Pen Test Lab diagnostics contract

Version 2, 24 October 2026. Implemented in `src/diagnostics.mjs`. Diagnostics are **data-minimized and pseudonymous, not guaranteed fully anonymous**: timestamp, trace ID and domain categories can still carry some contextual information.

## Collect as much safe technical context as practical

- Provider: TikTok, YouTube, Instagram, Facebook or unknown.
- **Source hostname** from a strict social-domain allowlist, such as `www.tiktok.com` or `youtu.be`. Never arbitrary hostnames.
- **Video link pattern**: creator_video, reel, watch, shorts, share, short_link, video or unknown.
- **Query shape**: none, video_id_only, additional_parameters, unknown. No query contents.
- Short-link redirect requirement: boolean, not its target URL.
- Transport: browser_direct, site_backend, local_backend or none.
- Browser family: Chromium, Safari, Firefox, other, unknown; device class: desktop, mobile, tablet, unknown. No raw user agent.
- Stage: validation, page request, track discovery, caption hostname validation, caption request, parsing, result display, storage and completion.
- Status and stable error code: failed/unavailable/succeeded/started/skipped; PROVIDER_BLOCKED, CAPTION_HOST_REJECTED, CAPTIONS_NOT_FOUND and similar.
- Exact HTTP status, stage timing in milliseconds, download timing, retry and redirect counts if known.
- Broad caption content delivery network family, e.g. `tiktokcdn_us`, but **not exact individual asset hostname, signed URL, path or query**.
- Coarse response size category, broad content-type class, caption track count, caption cue count, caption type (automatic/human/unknown) and language family (Danish/English/other/unknown) where actually available.
- Random trace ID unique to each request and application build identifier.

Unknown or unmeasured values must remain unknown, not invented.

## Strictly prohibited in automatic diagnostic records

Full video URLs, video IDs, creator handles, transcript or subtitle text, signed caption-file URLs, referrer, cookies, API keys, OAuth tokens, personal account IDs, IP addresses, precise device identifiers, raw browser agent strings, unrestricted exception messages and stack traces. Server logs must not contain request bodies or full URLs either.

Events are built by `sanitizeDiagnostic()`, with allowlisted enumerable properties and canonical values. Unrecognized fields are discarded on the browser and **again on each backend**. Sanitized JSON is all that can enter the diagnostic store. Captions are returned to the browser in the response and not included in diagnostic storage.

## Storage modes actually implemented

- **Browser:** automatic localStorage cache capped at 1,000 events; age alone does not discard events. Cache eviction is separate from server record retention. Browser diagnostics can be viewed, filtered, exported and cleared.
- **Loopback backend:** `server/local-server.mjs` listens only on 127.0.0.1 and writes sanitized events to ignored `.local/diagnostics.json`, with a 2,500-event response window. Stored records are not deleted by age or list-window limits. The file has user-only write permissions where the operating system supports them.
- **Private ChatGPT Site database:** implemented in `server/site-service.mjs`, restricted to one configured owner by trusted dispatcher identity. Automatic diagnostic deletion is paused. The latest 10,000 rows are returned as a bounded list window; older stored rows are retained. Legacy expiry timestamps no longer exclude rows. The scheduled cleanup task was paused. Diagnostic rows have no owner column; add row ownership before allowing a second user. The loopback server remains unsuitable for public hosting.

The interface distinguishes browser-only, local-backend and hosted database diagnostics and reports save failures. In test mode, copy or export produces sanitized JSON. A video transcript never enters the automatically saved events.

## Review conditions before private Sites deployment

Authenticated user context must come from the Sites server, not client-provided IDs; enforce owner-only event read/write/delete on the server. Limit event rate and event JSON size. Perform retention and actual purging checks. Red-team query strings, malicious domains, injected error messages and caption text to ensure no data appears in diagnostic storage or platform logs.

## Limits

Diagnostic data is useful for seeing systematic failure patterns. It cannot prove why a request was blocked, nor establish that a caption track truly does not exist when a provider request fails. The user controls any optional content-rich bug report separately and explicitly.



## PEN-009 output availability
`post_parse` and `metadata_parse` record fixed statuses/codes; `postTextFound` and `metadataFound` are booleans. `PARTIAL_RESULT` identifies a displayed post or metadata result without caption success. Post text, hashtags, creator details, engagement values, dates, and media URLs never enter diagnostic records. Saved output content is retained only in the separate owner-scoped extraction history; it is excluded from diagnostic events.


## PEN-010 saved extraction history
User-approved history is intentionally content-bearing and stored in `extractions`, scoped to the trusted Sites visitor identifier. It contains canonical source links and supported output fields, never diagnostic traces or provider resource URLs. It is not diagnostic telemetry. Latest 50 displayed per owner, with no automatic expiry or count-based deletion. Explicit individual physical deletion remains available. Diagnostic-clear does not clear extraction history. History status is returned to the interface without sending stored content to logging.
## Infrastructure logging

Sites infrastructure request metadata is separate from application diagnostics and has platform-controlled retention. Disabling worker application logging does not remove all hosting metadata. The application does not claim 30-day control over platform logs.


## PEN-020 TikTok share-link attempts

Recognized public TikTok share tokens (vm.tiktok.com, vt.tiktok.com and TikTok /t/ links) may be resolved using up to three manual HTTPS redirects. Every destination is validated as an exact supported TikTok short-link or public video URL before any follow-up request. Query strings and fragments do not reach subsequent page fetches. No browser cookies, arbitrary redirect following, media downloads or third-party hosts are involved.

Diagnostics now distinguish `share_link_resolution` events and the codes `SHORT_LINK_UNRESOLVED` (no valid video target reached) and `SHORT_LINK_TARGET_REJECTED` (an unsafe/unrecognized destination). `PROVIDER_BLOCKED`, `TIMEOUT` and `NETWORK_ERROR` remain distinct. Redirect counts and permitted HTTP response codes may be logged, but no share tokens, destination URLs, video IDs, creator handles or caption text. A rate-limited request creates one sanitized `RATE_LIMITED` event when its minute window is first exceeded; later rejected requests in that same window are not stored individually to prevent unbounded diagnostic writes. Malformed JSON and unauthenticated requests are not extraction telemetry.

A resolved video without a native published caption track still returns `CAPTIONS_NOT_FOUND`, potentially alongside post text and metadata. It must not be described as an audio transcript. TokScript's published speech-recognition fallback is a separate capability that GS Pen does not currently implement.

The user's reported real short URL is not part of regression fixtures, diagnostics or source code. Unit tests use fabricated TikTok identifiers and responses. Live provider resolution and the hosted deployment must be verified separately; code or browser fixture success does not imply that the provider currently permits real-world retrieval.
