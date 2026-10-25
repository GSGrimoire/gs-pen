# GS Pen: idea-to-draft plan and first implementation

25 October 2026. Issue #16. Branch `chatgpt/pen-idea-to-draft`, now targeting main after reviewed retention pause #15 merged. Deployed owner-private as version 11 after Claude review and the required C1 correction. The actual release and remaining live-integration limits are recorded in docs/DEPLOYMENT.md. GS Poster is being developed separately and has not been modified.

## Design decision

Use deterministic code for operations that do not need creative judgment. Use one bounded creative text pass to turn an idea and optional selected source into a draft package. New image generation is opt-in future work. No model client, model key, background model schedule or paid model invocation is added to Pen.

| Stage | Ordinary code | Generative work |
|---|---|---|
| Input | Validate idea, constraints, format and source ownership | None |
| Source preparation | Read saved extraction, keep provenance, remove exact repeated caption cues from the selected brief | None |
| Budget | Select at most 2,000, 4,000 or 8,000 source characters; default 4,000; flag omissions | None |
| Reuse | Hash the normalized brief and reuse its owner-scoped job and saved draft | None |
| Creative pass | Prepare a compact structured prompt | Original post copy, title, hashtags, visual brief; reel script only when selected |
| Validation | Check field types/lengths, house rules, approved asset-link shape and expected version | None; invalid output is reported without starting a model retry |
| Packaging | Add caption/hashtag formatting and exact Poster draft fields | None |
| Delivery | Authenticated Poster draft tool, once connected, with duplicate reconciliation and a receipt | None |
| Approval | Existing owner approval in Poster | Human decision |
| Reel production, later | Template layout, subtitles, transitions, rendering and media upload | Optional artwork/voice generation only when requested |

The creative pass is an architectural target, not a promise about a provider's billed tokens or an externally controlled assistant's decisions. Character limits are not token estimates. The existing full extraction remains stored and available; shortening is explicit. Native captions, post text and an unavailable independent transcript retain distinct provenance.

## Implemented first slice

- Create workspace: standalone idea or a saved extraction selected with “Make something from this”. Optional constraints, Facebook post or reel-script format, and source budget.
- Separate owner-scoped `content_jobs` storage. Additive migration `0002_same_hawkeye.sql`; no existing data is migrated or deleted.
- Exact brief identity reuses jobs. Draft writes require the current job identifier, input hash and version; stale writes are rejected rather than overwriting newer work.
- Draft validation is deterministic. Default outputs are deliberately small: title 120 characters; post message 1,800; visual brief 800; reel script 2,500; up to eight hashtags and ten existing GitHub image links.
- Reel scripts are saved as scripts only. The Poster export rejects reel jobs instead of pretending to support video uploads.
- Poster fields match the existing `draft_post` interface: message, images, label and release. No publish/schedule operation is exposed. The stable release value is `Pen <jobId>` for future duplicate reconciliation. Image accessibility/type checks still belong to Poster.
- Prepared payloads always say `submissionStatus: not_sent`. Exporting a payload is not a live external write.
- Browser fallback: copy/download the compact brief, save the assistant's structured response, inspect the text safely, and export Poster fields. This fallback is usable without a model service inside Pen, but requires the explicit handoff.

## Authenticated assistant connection

The branch exposes an owner-only `/mcp` endpoint and declares the Sites `mcp` capability. Sites publication succeeded and plugin management reports the generated plugin installed; tools were not exposed in this active chat, so a live read-only call in a fresh chat is still required. The endpoint reuses the existing trusted owner identity and origin protections; missing identity and service-only callers cannot read or write jobs.

Tools:

1. `create_content_job`: return the compact creative prompt once, or an existing saved draft for reuse.
2. `list_content_jobs`: summaries only, without source bodies.
3. `get_content_brief`: resume a job; an existing completed draft is returned without repeating the source prompt.
4. `save_content_draft`: validate and persist, returning only a small receipt rather than repeating source/draft content.
5. `get_poster_draft`: return exact draft arguments, never send or publish.

Owners can explicitly delete a content job through the confirmed Create control and owner-scoped DELETE endpoint. This deletes the brief/source excerpt/draft only. Extraction deletion preserves separately saved jobs and says so in its confirmation. No destructive assistant tool is exposed.

Tool results are returned once as JSON text, rather than duplicating the same source in both text and structured representations. ChatGPT's Sites-hosted connection is the supported first target. Claude access to the owner-private Sites authentication boundary must be separately tested; do not invent a cross-provider sign-in bypass or copy credentials.

## Live integration boundary

The current task's plugin discovery returned no GS Poster plugin, and no native Poster tools were available. Its main branch `68d452f87ff41513fd23a27f36c700c1e93cc23b` defines `draft_post`, `update_draft` and a separate approval interface. Its current code handles Facebook text/images and lacks video upload/rendering. No live Poster submission or account setup is claimed here.

Once Poster is operational and connected, prove one authenticated draft write to the intended Page. First inspect existing posts for release `Pen <jobId>`. After an uncertain write, reconcile against Poster instead of automatically repeating a non-idempotent create. Record the returned review link and draft identifier only after a verified provider result. A server-side “Generate” button while no assistant task is active would need a separately chosen model service and approved usage budget; it is not implemented by the copy button or this connector.

## Verification and release

Local tests exercise source budgets and provenance, caption deduplication, exact reuse, output rules, stale-write protection, cross-owner rejection, hostile fields and bounded requests, compact assistant receipts, owner authentication, and unsent Poster exports. Production build, lint, types and additive migration checks are required. Desktop/mobile browser fixtures cover creating a brief, safely displaying a draft, invalid response recovery, exported payloads and selecting an archived source.

These fixtures do not verify hosted sign-in, real D1 migration, Sites tool discovery, Claude compatibility, model generation quality, live Poster writes, image delivery or video production. Verify those independently when the reviewed branch is published. No synthetic test should be described as end-to-end live generation/publication.

Claude reviewed both changes; #15 and #17 merged in order after C1 was corrected and checks reran. Version 11 was published once from the final main tree. Keep the current Site owner-private. Pure background maintenance should use ordinary worker/database scheduling where supported, rather than model-driven recurring tasks. Retention cleanup remains paused.
