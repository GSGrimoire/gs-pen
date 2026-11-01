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

Synthetic tests cover ordinary Facebook post shares, canonical hints, strict URL validation, sanitized telemetry and partial public previews. After correcting an incomplete /share/p/ route incorrectly classified as a generic token, final pull-request head `9b5fae3df315043e41a8640620731997d1a7a516` passed all 143 unit tests (run 41346101335), 68 desktop/mobile browser tests (run 41346101377), hosted build/lint/types and Node research workflow (run 41346101419). These are GitHub test fixtures, not local full-repository or owner-private provider tests. Some Facebook posts may be unavailable without platform authentication even when their links are recognized; no access bypass is proposed. Validate signed-in Site access, nonowner refusal, existing history, the user-supplied TikTok short link and real Facebook share links after private deployment.

## Release gate

Issue #25 and pull request #26 used the normal risk-based workflow, documented creator self-review and required passing checks. The change merged as `2a5fb303a83f232d04a6e1ff5a8532876187abca`. No Site deployment or real hosted verification was possible through the GitHub-only tools; preserve the existing Sites project and private audience.
