# GS Pen feasibility protocol
Updated 22 October 2026.

## F0 Hosting: partially resolved by documentation, NOT runtime tested
ChatGPT Sites is the preferred owner-private frontend; its published access settings must be verified in a real Site. Static GitHub Pages is not suitable for owner-only privacy by itself and cannot host an ordinary video extraction backend. Site storage, limits and browser inference need real tests. See PLATFORM_ACCESS_RESEARCH.md for evidence.

## F1 Platform caption access: TWO LIVE TIKTOK VIDEOS VERIFIED; four-platform release BLOCKED
Documentation establishes paths for some public metadata/embeds. None of the standard public interfaces reviewed establishes a general, permitted path for reusable speech audio from arbitrary public videos on all four providers. However, on 22 October 2026 GitHub-hosted live probes retrieved two TikTok WebVTT caption files: 15 timed cues from a public Scrub Daddy video and 12 from a public Hank Green video, without retrieving its audio. In the same run, YouTube returned RequestBlocked; Instagram and Facebook were untested. See docs/LIVE_CAPTION_RESULTS.md for evidence. Embedding content is not cross-origin access to audio. See PLATFORM_ACCESS_RESEARCH.md.
Future validation if a permitted approach is found: test 10 rights-cleared public videos per platform on at least two days. Record URL, explicit media rights, method, speech audio, original captions, post text, metadata, outcome, rate limits and permitted use. Proposed gate: at least 8/10 end-to-end success per test date for each advertised platform. Do not use passwords, copied session cookies, anti-bot bypass or proxy evasion.

## F2 Danish/English performance: NOT TESTED
Use short (1 minute), intermediate (5 minute) and 30-minute rights-cleared reference clips. Record browser, device, runtime, model revision, memory, download size, processing duration, accuracy against manually corrected transcript, and cancellation cleanup.

## F3 Owner security and storage: NOT TESTED
Verify unsigned visitor denial, owner-only synchronized records, maximum 50 records, deletion across local cache and synchronized database, and recovery if synchronization fails. Never commit personal media or secrets.

## F4 Compliance and privacy: PARTIAL
Official provider documentation and hosting documentation reviewed 22 October 2026. Platform-by-platform use authorization and specific live retrieval methods remain unverified. A public video is not automatic permission for local copying, transcription or reusable voice samples.

## F5 Decision: HOLD
Do not implement the full four-platform one-paste transcriber until the remaining F1 cases are resolved or the user explicitly approves a narrower input method. Candidate alternatives: owner-authorized media, Chrome extension with explicit audio capture, or permitted media download supported by a properly hosted service. A metadata-only app would NOT satisfy the independent transcript requirement.

## Test evidence and known limitations
Source-only URL classification tested in a local Node.js 22 environment, 29/29 assertions passed. No external video URLs, audio streams, Sites previews, synchronization, full transcription models or provider interfaces were executed. Existing code must not claim media access. Results are not end-to-end verification.
