# PEN-023: creator self-review and test record

Issue #23, branch `chatgpt/pen-023-facebook-short-and-reliability`, stacked on PEN-020. No external independent review was requested; the owner explicitly authorized self-review for this routine retrieval change. This document is the creator's own review, not a substitute for passing test runs or a deployment receipt.

## Defect and scope

Facebook links from mobile sharing, including `fb.watch`, `facebook.com/share/v/` and `facebook.com/share/r/`, were accepted by `src/url-classifier.mjs` but rejected by `server/caption.mjs` as `UNSUPPORTED_LINK_TYPE`. TikTok also stopped on the first published caption track even when later tracks were usable, and searched only one public embedded video-state format. These issues directly reduce extractable public content. No implementation of Facebook audio transcription, independent audio recognition or proprietary TikTok service behavior is claimed.

## Source changes

1. `server/facebook-share.mjs`: up to three manual HTTPS redirect hops, only strictly classified Facebook video/reel/watch or supported Facebook short links. The final video link is normalized and tracking removed. The share page can return a 200 response with an explicit public `og:url` or `rel=canonical` video; HTML inspected is capped at 128 KiB and metadata destinations must pass the same video classifier.
2. `server/tiktok-share.mjs`: support a bounded explicit TikTok canonical metadata hint for a 200 share page, while still rejecting generic sign-in shells and unrelated video recommendations.
3. `server/caption.mjs`: use the Facebook share resolver before fetching its canonical page; try no more than three existing TikTok caption candidates, re-validating each caption network destination, recording only sanitized attempt indices/codes.
4. `server/post-content.mjs`: inspect known public TikTok embedded `SIGI_STATE` and `__NEXT_DATA__` formats in addition to the existing rehydration format. Require exact requested video identifier before returning a post or captions.
5. Synthetic unit/service regression cases for security failures, redirect loops, valid share/watch/reel links, 200 canonical hints, provider blocks, post-only partial output, multiple candidate captions, and diagnostic privacy. No real user video links are committed.

## Self-review checks

- **Server-side request forgery:** all redirects remain manual with explicit platform-specific hostname and video-path validation, no generic URL following; blocked HTTP, credentials, port override, private IPs, lookalike hosts and unrelated websites are tested. The Facebook 200 HTML hint only provides a URL candidate after validation; it never grants media access.
- **Privacy:** no social cookies, log-in credentials, video/audio downloading, raw response logging, arbitrary request URLs, signed subtitle links or exception stack traces are introduced. Diagnostic records remain sanitized, owner-private and separate from content-bearing extraction history. Facebook preview metadata is stored only if an existing owner-scoped extraction result is nonempty.
- **Resource limits:** at most three redirect hops per short link, three existing caption candidates, 12-second per-fetch deadlines and bounded response sizes; no background retries or new rate-budget exemption.
- **Source attribution:** Facebook returns public post/metadata with explicit `page_preview_may_be_truncated` warnings and unavailable captions. TikTok video metadata and subtitle cues must match the exact requested numeric identifier. Login walls and blocked providers cannot be presented as missing speech or generated transcripts.
- **Scope:** no changes to the owner access boundary, service secrets, database schema, retention policy, connector write capabilities, publishing authorization or other GS repositories.

## Verification and publication boundary

Before merge, obtain passing unit tests, production build, lint, TypeScript checks and desktop/mobile browser tests on the final head. Synthetic provider fixtures do not prove live TikTok/Facebook access, Facebook caption support or equivalence to TokScript. The current chat has no ChatGPT Sites source/publication tool, so a GitHub merge alone is **not** a hosted GS Pen release. After an authorized Site publication from the exact merged tree, record the source tree, saved version, deployment receipt, owner-only sharing, anonymous rejection, and real signed-in TikTok/Facebook short-link trials in `docs/DEPLOYMENT.md`. Do not label a GitHub-only change as live.
