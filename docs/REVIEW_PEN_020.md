# PEN-020 creator self-review and verification gates

Scope: owner-private GS Pen only. Issue #20, branch `chatgpt/pen-020-tiktok-share-links`.

## Finding

`classifyPublicVideoUrl` accepted TikTok `vm`, `vt` and `/t/` share links, but `retrievePublicCaptions` immediately returned `UNSUPPORTED_LINK_TYPE` for every link needing resolution. This failure happened before reading the video or its caption availability. The app already stores automatically sanitized technical events, subject to owner-only authorization. One rate-limit response per minute is now recorded, not every rejected repeat.

## Change

- `server/tiktok-share.mjs` performs up to three manual HTTPS redirects on supported TikTok share links only; rejects arbitrary hostnames, credentials, ports, insecure targets, login pages and unsupported paths. A final video is normalized to the canonical `www.tiktok.com/@.../video/...` page with no tracking parameters. It never silently follows third-party redirects.
- The existing server caption/post parser runs only after a verified canonical video target, with original content provenance retained and no speech recognition claim.
- Safe status codes, redirect counts and a `share_link_resolution` stage extend the strict diagnostic allowlist. A single sanitized `RATE_LIMITED` record is emitted on the first denied request per minute to avoid logging floods.
- No authentication, owner storage isolation, database schema, deletion schedule, provider credentials, audio download, cross-project code or billing changes.

## Threat review

- Redirect-based server-side request forgery: disallow automatic following and validate each destination. Test malicious lookalike, private IP, HTTP, userinfo, port, non-video and unrelated-platform URLs.
- Privacy: the database retains event categories, trace identifiers and counts, not the original or redirected URL, tokens, video identifiers, captions, creator or source text. Tests assert no synthetic private fields in diagnostic rows.
- Resource limits: at most three redirect requests and the existing bounded page/caption requests, each with timeout. Retry flooding is not introduced; rate-limit telemetry is bounded to one event per minute.
- Provider limitations: redirects may be absent, blocked or change format. Short-link success is not guaranteed; the error is explicit. Video without native caption track remains unavailable as transcript.

## Verification checklist

- Automated unit tests covering successful direct and two-step redirection, `/t/` links, safe destination validation, loops, hop cap, no redirect, blocked provider, network error, post-only fallback, output and diagnostic separation.
- Hosted service tests covering database storage and rate-limit event bound.
- Existing project-required unit tests, production build, lint, TypeScript check and desktop/mobile browser checks must pass on the pull-request head.
- Fresh owner-signed-in hosted test with a real share link is **not performed here**. Confirm private access, real provider redirect behavior, history persistence and accurate diagnostics after any approved deployment. Do not equate a GitHub commit or test fixture with a deployed site.
- No independent review is claimed. This is routine retrieval handling under the 25 October risk-based project policy, subject to reviewable pull request and checks before merge. Escalate if a security/owner boundary issue is found.
