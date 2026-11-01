# PEN-024 creator self-review, 1 November 2026

## Scope and reason

The existing GitHub main accepts TikTok vm/vt short links and Facebook video/reel shares (PEN-020, PEN-023), but the last documented private Site deployment predates those changes. This patch adds common ordinary Facebook public post-sharing forms and meaningful error text, without introducing new external providers, permissions, media downloads, cookies or speech recognition. It does not change authentication, retention, history isolation, social publishing or the separate GS Poster service.

## Interface and retrieval behavior

- URL classifier accepts `/share/p/<token>`, `/share/<token>`, direct `/<page>/posts/<id>`, `/story.php` and `/permalink.php` with a single public story and owner identifier, and `/photo.php?fbid=<id>`. It rejects malformed IDs, duplicate required parameters, unsupported paths and lookalike domains.
- Share resolution remains same-host-family, manual-redirect-only, maximum three hops, bounded public HTML canonical metadata, HTTPS only, no credentials or custom ports. Tracking parameters are stripped before requesting the canonical page.
- Facebook post previews are explicitly partial. The existing parser uses public metadata; it does not retrieve native captions or independently transcribe audio. Provider blocks and missing public content remain unavailable, not fabricated.
- User-visible messages now distinguish an unresolvable share link, an unsupported redirect target and a provider block. UI explicitly permits public Facebook posts as well as videos.
- Sanitized diagnostics use a generic `post` category, never record a share token, canonical post URL, author, post text or URL query.

## Verification and residual risks

Synthetic tests added for Facebook ordinary post shares, canonical hints, strict URL validation, sanitized telemetry, and partial public-preview behavior. Existing Facebook rejection test updated to remain meaningful. Unit and browser workflow results are pending at review creation; no local full-repository test or real owner-private Facebook/TikTok provider test is claimed. Some public Facebook posts may be unavailable to unauthenticated requests, even with accepted URLs; no access bypass is proposed. Validate the signed-in Site, nonowner access refusal, existing history, the user-supplied TikTok short link and representative real Facebook share links after reviewed merge and private deployment.

## Release gate

One focused issue (#25), reviewable pull request, required continuous integration checks and creator self-review. Merge only after review. No automatic Site deployment or verification is possible through the currently connected GitHub tools; preserve the existing Sites project and private audience.
