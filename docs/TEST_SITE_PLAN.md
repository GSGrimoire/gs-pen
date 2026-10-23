# GS Pen test Site implementation and acceptance plan
Date: 23 October 2026. **No Site has been created or deployed.**

## Release label
"GS Pen Test Lab | Native captions". Owner only. Not a production transcription service.

## Layout
1. **Input**: Public URL field, recognized platform, processing status. One URL at a time. Inapplicable source URLs rejected before any outgoing request.
2. **Results**: Original caption text and available timestamps, separate post-text and metadata tabs. Whisper tab explicitly labeled "Not available in this test build"; never copy captions into it.
3. **Debug panel**: Per-stage timeline with started/completed/failed states, duration in milliseconds and stable error code; expand for safe technical metadata. Copy sanitized report action.
4. **Run history**: Latest 50 user-generated results, separately from short-lived diagnostics. Clear and delete. History must be owner-scoped before cloud persistence is enabled.
5. **Test status**: Build revision; frontend environment and backend connection; caption strategy; last safe storage result; privacy notice; no provider access claims without real evidence.

## Required debug stages
url_validate; provider_identify; auth_check; request_start; provider_page_fetch; caption_track_discovery; caption_host_validation; caption_fetch; caption_parse; result_render; history_write; diagnostics_write; finished.

## Visible errors
Every failure shows: human-readable problem, stage, short error code, trace identifier, suggested next step, and whether native captions might be genuinely absent versus merely inaccessible. Examples:
- "The video page could not be reached from our retrieval service. [PROVIDER_BLOCKED]. The video may still have captions."
- "The video has no discoverable subtitle track. [CAPTIONS_NOT_FOUND]."
- "The caption file was found, but the delivery host is not yet recognized. [CAPTION_HOST_REJECTED]."
- "The diagnostic event could not be saved centrally. [STORAGE_FAILED]. You may copy a local report."
Never display raw stack traces, signed media URLs, cookies, access tokens or user-specific network paths.

## Automatic event storage
Store only schema-validated events from src/diagnostics.mjs. Server revalidates, authenticates and authorizes requests, timestamps events and applies rate limits. Owner-only event reader supports filters by time, stage, provider, error code, build and trace identifier. Retain events 30 days initially; expire using a scheduled cleanup if supported or enforce cutoff on read/write with background cleanup later. Delete diagnostic records independently of the 50-item transcript history. Successful attempts should record high-level stage and duration, not content. For storage failures, preserve a short local diagnostic queue for manual export, without sending sensitive data to an external service.

## Acceptance tests before first private publish
- [ ] Anonymous visitor cannot access the site or event endpoint.
- [ ] Non-owner cannot read, write or list diagnostic records.
- [ ] Sanitization discards raw URL, user handle, signed caption URLs, original transcript, audio, cookies, token, arbitrary exception message and stack.
- [ ] Provider blocked, caption absent, invalid URL, network timeout, unsupported asset host and parse failure are distinguished.
- [ ] Each processing attempt has one trace identifier linking all stage events.
- [ ] Test build never calls a Whisper model or fabricates independent transcription.
- [ ] Browser and server diagnostics are visible and connected to backend persistence; storage failure is explicit.
- [ ] The real browser's cross-origin and the Sites backend's outbound network behavior are measured rather than assumed.
- [ ] Native caption retrieval on two previously successful TikTok examples attempted only with permitted data use, and result independently recorded.
- [ ] Basic mobile layout, keyboard operation and WCAG contrast requirements checked.
- [ ] Deployment receipt stored with version, commit and user-visible limitations.

## Exit gate
A private Site can be made available as an internal **diagnostic laboratory** even if caption extraction is blocked, provided it never claims successful transcription and accurately shows the failure. A functional product release still requires broader coverage tests, security review, and a permitted provider access method.
