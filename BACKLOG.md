# GS Pen backlog
Updated 25 October 2026. The owner-private Site is live. Historical deployment-pending statements have been superseded.

## Current delivery
- PEN-011 / issue #12: complete assistant handoffs for Claude and ChatGPT, with clipboard-first web launch, optional bounded Claude desktop prefill, and explicit failure fallbacks. Deployed owner-private as reviewed main version 10. Final verification: 89 unit tests, 48 desktop/mobile browser checks, build/lint/types and fresh hosted checks passed. Required review corrections and sequential merges are complete.
- PEN-010 / issue #10 / pull request #11: orange Extract/Recent/Diagnostics workspace, owner-private latest-50 history, 30-day expiry, search/reopen/delete and text/structured exports are deployed.
- PEN-009 / issue #8 / pull request #9: TikTok captions, post text/hashtags and metadata; initial Facebook public-preview post/creator/metadata retrieval are deployed. Facebook text may be shortened.
- PEN-007 / pull request #7: authenticated Sites backend, sanitized automatic diagnostics, owner-private database and hourly physical expiration are deployed. Independent review completed by Claude; required corrections, all four main merges and private version 10 publication are complete. Receipt: docs/DEPLOYMENT.md.

## Next priorities
1. Google Drive saving: explicit durable text export containing every output, source and availability/provenance warnings, with a confirmed file link. Reuse Scribe patterns where suitable, but authorize Pen separately.
2. Asana task creation: editable title, selected project and optional due date, with source and a durable saved-content link. Do not rely only on expiring Pen history.
3. PEN-101: Facebook ordinary shared/short links and broader video formats, safe canonical resolution, more reliable partial results, and permitted native caption feasibility.
4. PEN-101: YouTube Shorts and standard-video hosted feasibility, then captions, descriptions and metadata where permitted. Earlier cloud-runner access was blocked; no hosted support promised.
5. PEN-101: Instagram Reels public caption/post/metadata feasibility. Currently recognized only.
6. PEN-002B / PEN-005 / PEN-006: Broader permitted provider sample testing across dates, availability measurements, retrieval rights/privacy review and full-product feasibility decision. Current live examples do not establish universal compatibility.
7. PEN-002 / PEN-102: Independent browser-local Whisper pipeline when authorized audio is available, separate from platform captions; arbitrary-audio retrieval remains unverified.
8. PEN-220: Text recognition from video frames.
9. PEN-003 / PEN-200 / PEN-201: Danish/English accuracy, speed and 30-minute processing benchmarks, rights-cleared manual reference corpus, technical vocabulary and GS Scribe benchmark exports/model comparisons.
10. PEN-221: Translation, summaries and full-text search across saved extraction content. Recent currently searches title, creator and platform.
11. PEN-222: Batch extraction and timestamped subtitle exports.
12. PEN-223: Optional browser extension with explicit tab-audio capture.
13. PEN-210: Future consent-based GS VoiceStudio audio/voice reference workflows.

## Deferred alternatives and limits
- PEN-007D: Codespaces preview was prepared but not provisioned. Low priority now the private Site works.
- Keep diagnostics data-minimized and separate from saved output; hosting infrastructure logs have independent platform retention.
- No native Facebook captions, independent Whisper, frame-text recognition, YouTube or Instagram retrieval yet. Never infer a transcript from post text.
- No unreviewed merges. Do not commit media, captions, credentials, signed resource links or raw diagnostic records.

## Review follow-ups that do not block the release
- Store or select compact history summaries instead of reading up to 50 full payloads when listing Recent.
- Consider a dedicated retention-task secret before any change to the owner-private service boundary.
- Add diagnostic row ownership before any second user is allowed.

PEN-105 release completed on 25 October 2026. Native mobile app delivery and real second-account access remain verification follow-ups.
