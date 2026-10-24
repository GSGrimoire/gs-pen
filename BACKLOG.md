# Current backlog update: 24 October 2026

Earlier deployment-pending statements below are historical. The owner-private Site is live; see docs/DEPLOYMENT.md.

- PEN-009 / issue #8: TikTok post text/hashtags and public metadata; first Facebook public post adapter implemented, release verification in progress.
- Facebook captions: unimplemented. Do not infer a transcript from post text.
- Facebook short/shared links and broader provider formats: pending.
- Frame text recognition and independent Whisper: pending.
- Independent security/code review and merge: pending. No unreviewed merge.

---

# GS Pen backlog
Updated 24 October 2026. **The owner-only remote Test Site is NOT published.**

## Priority 0: feasibility
- PEN-001 [partially resolved] Private ChatGPT Sites selected over ordinary public GitHub Pages. Sites runtime, authentication, private storage and deployed request egress are not yet validated.
- PEN-002 [partial] General arbitrary-audio retrieval remains blocked/unverified. Keep independent Whisper as a future path.
- PEN-002A [verified on two samples only] Native TikTok WebVTT caption extraction worked from Python and JavaScript GitHub runners. No blanket availability or permission claim.
- PEN-002B [ongoing] Repeat provider access against 10 permitted samples across two separate dates, plus real browser and Site deployment verification. YouTube cloud runner blocked; Meta caption endpoints not verified.
- PEN-003 [planned] Danish and English Whisper accuracy, speed and 30-minute processing benchmarks on rights-cleared recordings.
- PEN-004 [planned] Verify owner-only Site authentication, synchronized 50-result history and delete/retention.
- PEN-005 [partial] Review permitted platform retrieval, rights, privacy and external services.
- PEN-006 [blocked] Full-product go/no-go follows platform and privacy testing.

## Priority 1: test laboratory
- PEN-007 [code built, independent review pending] Responsive Test Lab static frontend, local TikTok caption research adapter, trace timeline, output tabs and automated diagnostics. Implementation in PR #7, requires private Site deployment work.
- PEN-007A [local proof complete] Strict v2 diagnostic allowlist including domain and video type, sanitization tests, local browser and loopback backend diagnostics storage with 30-day read/write expiry.
- PEN-007B [Work Sites execution required; deployment not started] Owner-only Sites preview, authenticated backend port, Site database storage, authentication/retention test, real Site caption access and deployment receipt.
- PEN-007C [browser regression automated; visual/real Site accessibility pending] Playwright headless Chromium desktop and mobile suite is passing 22/22 in GitHub Actions, including diagnostics sanitization, error messages, access-key UI and responsive layout. Real Sites browser/runtime test remains pending.
- PEN-007D [prepared, actual Codespaces run pending] Temporary owner-private GitHub Codespaces preview with private port 4173 and ephemeral development access key. Docs: docs/CODESPACES_TEST.md. No Codespace provisioned yet.
- PEN-100 [pending] Private Site production readiness, release labels and error safety.

## Priority 2: actual product and future GS features
- PEN-101 Permitted provider caption/metadata adapters and accurate provenance
- PEN-102 Browser-local Whisper transcription where authorized audio exists
- PEN-103 Final four-tab outputs and structured export
- PEN-104 Account-scoped 50-result transcript history
- PEN-105 Production access security, accessibility, monitoring and release receipts
- PEN-200 GS Scribe verified benchmark exports, manual reference corpus and model error analysis
- PEN-201 Model speed/word-error comparisons, Danish and English technical vocabulary
- PEN-210 Consent-based GS VoiceStudio audio/voice reference workflows
- PEN-220 On-screen text extraction
- PEN-221 Translation, summaries, full text search
- PEN-222 Batch processing and timestamped subtitles
- PEN-223 Optional browser extension with explicit tab audio capture

Never commit personal media, transcripts, signed asset URLs, credentials or raw diagnostic payloads. A passing synthetic test does not establish rights to process real videos.

- PEN-008 [completed for GitHub test environment] Browser regression automation: 22/22 desktop/mobile Playwright tests on 24 October 2026, run https://github.com/GSGrimoire/gs-pen/actions/runs/40113533641. Work deployment brief: docs/SITES_DEPLOYMENT_HANDOFF.md.

