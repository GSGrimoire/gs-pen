# Dual transcription: platform transcript + independent Whisper

Research and prototype status: 22 October 2026.

## Evidence
TokScript's public frequently asked questions state that an existing platform-generated transcript must be present and enabled, otherwise it cannot extract it: https://tokscript.com/
TokScript's current troubleshooting guide explicitly says it extracts platform-embedded transcripts and reports no transcript when absent: https://help.tokscript.com/en/articles/1258372-what-do-i-do-if-a-video-wont-transcribe
This is evidence of a product behavior and claimed mechanism, **not a verified or officially authorized general extraction interface**, nor proof that most videos have subtitles. TokScript's method is proprietary and its success rate is not audited here.

## Proposed GS Pen behavior
Run caption retrieval, audio acquisition/Whisper, and post metadata acquisition independently. Both transcript paths may be started concurrently when permitted and available. Captions can be shown immediately before Whisper completes.

- Platform transcript: original platform captions/subtitles, with source label, language, human/auto status if known, timestamps if exposed; missing when inaccessible or nonexistent.
- Whisper transcript: generated solely from accessible audio; preserve model identity, language, and raw transcript internally while presenting clean text.
- Post text and hashtags: from post metadata, not from speech or invented output.
- Never present metadata or source captions as independent Whisper speech output.
- Either transcript path may succeed while the other fails. Missing audio is not a reason to discard captions.
- Platform transcript is comparison material, not automatically a verified word-for-word reference for GS Scribe quality measurement.
- No external transcription services are called.

## Offline validation prototype
`src/dual-transcript.mjs` accepts injected caption, audio, independent transcription and post-data adapters. It makes no network requests, and includes no extractor or model inference. It starts independent tasks concurrently, labels provenance, and exposes partial success or failure. Synthetic tests cover successes, missing audio, missing captions, independent errors, emptiness, post-data separation, concurrency and adapter validation.

Executed with Node.js test runner: 10/10 offline synthetic tests passed. This demonstrates orchestration and status behavior ONLY.

## Still unverified
A practical, terms-compliant method of obtaining existing transcript tracks from arbitrary public TikTok, Instagram, YouTube and Facebook URLs; independent audio retrieval; actual Whisper model processing and access permissions. We must not assume that because TokScript offers this behavior, all platform captions are available via a public documented interface.

## Validation plan for real captions
For each of the four platforms, test 10 authorized public examples twice, with and without human/automatic caption tracks if possible. Log original caption status, extraction permission, retrieval route, duration, language, timestamps and transcript completeness. Verify independent model output only when permitted audio access exists. Never store personal test captions or video in GitHub.
