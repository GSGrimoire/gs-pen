# Privacy-safe diagnostic event contract
GS Pen Test Lab, draft version 1, 23 October 2026.

## Data model
All event fields are structured and allowlisted. See `src/diagnostics.mjs`. Required: schema, time, traceId, platform, stage, status, code, source, build. Optional: durationMs, httpStatus, captionCueCount, retryable. A backend implementation **must** derive authorized identity from its authenticated session, not from client-supplied owner IDs.

## Prohibited event content
Do not record the original video URL or query string, username/handle, any caption or transcript text, signed resource URL, cookies, access token, raw user agent, IP address, arbitrary exception.message, stack trace or audio bytes. Never send diagnostics to public GitHub issues automatically. A hash of a video URL can still disclose/link activity and is not part of the initial schema. Logs must not be used as a shadow transcript store.

## Storage and retention
Start with owner-private Site database and 30-day retention if supported. The test Site may use an ephemeral local fallback for log submission errors. Do not claim automatic deletion until scheduled/transactional purging is verified. Diagnostic retention is independent of the 50 most recent saved transcript records. Allow exporting a scrubbed JSON report for a support discussion with explicit user action.

## Error handling
The diagnostic write must never cause the primary caption extraction to fail. A failed write produces visible STORAGE_FAILED and local copy/export option. Add a rate cap and server-side validation. All exceptions are mapped to stable safe codes, e.g., NETWORK_ERROR, PROVIDER_BLOCKED, CAPTIONS_NOT_FOUND, CAPTION_HOST_REJECTED, CAPTION_PARSE_FAILED, CORS_DENIED, TIMEOUT, STORAGE_FAILED and INTERNAL_ERROR. Success and failure records must be distinguishable.

## User interface
Show the complete processing timeline in test mode. Each stage displays status, duration and a short explanation. A trace ID links events across frontend, Site server and optional retrieval service. Provide "Copy sanitized report" and "Clear local diagnostics" operations. Diagnostic delivery status must be visible separately from the user's transcription outcome.

## Future expansion
Model ID, audio duration, processing speed, recognition error and device performance may be added in a reviewed version, but never raw audio or private speech text by default. Enable any verbose diagnostic bundle with an explicit opt-in for that particular request.

## Runtime caveat
This repository module does not itself transmit or save events. Actual backend storage, identity checks, error forwarding and retention must be built and tested in a private Site before calling telemetry automatic.
