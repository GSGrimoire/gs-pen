# GS Pen backlog
Updated 25 October 2026. The owner-private Site is live. Historical deployment-pending statements have been superseded.

## Current delivery
- PEN-011 / issue #12: complete assistant handoffs for Claude and ChatGPT, with clipboard-first web launch, optional bounded Claude desktop prefill, and explicit failure fallbacks. Deployed owner-private as reviewed main version 10. Final verification: 89 unit tests, 48 desktop/mobile browser checks, build/lint/types and fresh hosted checks passed. Required review corrections and sequential merges are complete.
- PEN-010 / issue #10 / pull request #11: orange Extract/Recent/Diagnostics workspace, owner-private latest-50 history, 30-day expiry, search/reopen/delete and text/structured exports are deployed.
- PEN-009 / issue #8 / pull request #9: TikTok captions, post text/hashtags and metadata; initial Facebook public-preview post/creator/metadata retrieval are deployed. Facebook text may be shortened.
- PEN-007 / pull request #7: authenticated Sites backend, sanitized automatic diagnostics, owner-private database and hourly physical expiration are deployed. Independent review completed by Claude; required corrections, all four main merges and private version 10 publication are complete. Receipt: docs/DEPLOYMENT.md.

## Current content workflow implementation
- Issue #16: Create workspace, bounded deterministic briefs, owner-private jobs, validated creative responses, authenticated assistant tools and exact unsent Poster draft payloads are implemented on `chatgpt/pen-idea-to-draft`, stacked on #15. Plan and verification boundaries: docs/IDEA_TO_DRAFT_PLAN.md. No model calls, model service, paid generation or live Poster write has been added. Independent review and private release remain pending.

## Current change
- Issue #14: pause automatic time-based deletion and count-based pruning of stored diagnostics/extractions. The cleanup schedule is paused. Application changes are on `chatgpt/pen-retention-pause`, pending independent review and release; the live version 10 still expires data during normal use until then.

## Proposed next integration
The user's new goal is source link → Pen extraction → assistant creates an original GS Grimoire post or reel brief → Poster draft → owner approval. Prioritize a first complete text/image Facebook draft flow once Poster is working. Add authenticated Pen extraction/read tools, a shared content brief with source/provenance and missing-output flags, and a tested connection to Poster's existing draft tools. Preserve Poster's separate approval requirement. Never treat a shortened preview or post description as a verified video transcript. Generate fresh wording and approved/original assets rather than copying source footage or narration.

GS Poster source inspected on 25 October 2026: `src/mcp.ts` provides draft_post/update_draft/list_posts and related tools; `src/publish.ts` publishes only after approval. The current repository handles Facebook feed text/images, not video rendering or reel uploads. Do not modify Poster while the user is building it. A Sites-hosted Pen connector can serve ChatGPT; compatibility/authentication for Claude must be separately established. An unattended button invoking a model outside an assistant task needs a separate supported model integration and approved usage budget.

Other previously agreed priorities remain:
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

- Add pagination/search for retained history older than the latest-50 display window; do not reintroduce deletion as a pagination shortcut.
