# PEN-035: YouTube public metadata, not speech transcription

Status: implementation branch only. Never infer that this is published to the owner-private Site. Related issue: #53; roadmap: #47; reliability benchmark: #22.

## Implemented on this branch
- GS Pen recognizes an existing allowlisted YouTube watch, Shorts or youtu.be URL, derives its exact 11-character video identifier and constructs its own canonical watch link with no arbitrary query forwarding.
- The authenticated Test Lab backend uses the fixed public YouTube oEmbed endpoint with manual redirects, omitted credentials, a 12-second overall deadline and a 32,768-byte response ceiling. It does not parse the YouTube watch page, fetch video/audio, retrieve a caption asset, use a paid service or add a key.
- The metadata allowlist is video ID, title, creator/channel name, and validated optional channel and thumbnail links. The provider's HTML embed is never exposed to the browser or stored.
- Caption and post fields remain unavailable, with no cues or invented words. The response is a useful partial result, saved to existing owner-scoped history, with diagnostic telemetry stripped of source identifiers, URLs and content.
- The Test Lab interface provides a YouTube link input, metadata details, appropriate recovery text, export and assistant handoff, and YouTube in Recent filtering.

## Not implemented
- Publication date, description, category, language, duration, counts/statistics, comments or broader channel information. Those are not in the oEmbed payload. The official YouTube Data API `videos.list` could cover some later, if API key/quota and compliance/refresh conditions are approved.
- General native caption downloading, automatic YouTube speech transcription or user-provided file transcription. The YouTube Data API `captions.download` requires permission to edit the underlying video. Access to an embed does not give access to media audio.
- Any capability to download from arbitrary YouTube video links. No attempt to bypass service restrictions or scrape the watch page.
- Real-world provider and signed-in hosted acceptance, even if synthetic unit/browser tests pass.

## Follow-up design
1. Review YouTube API developer terms, usage rights, metadata caching and removal/update obligations before merging. Paused Pen retention may need a compliant *metadata refresh/removal* policy, but this change makes no destructive migration or retention alteration.
2. Decide whether to add a configured YouTube Data API metadata adapter for richer public fields. Add secrets and quota caps only after independent access review; no credentials in the browser or repository.
3. Build a distinct owner-authorized transcript import from WebVTT/SubRip or separately supplied media, retaining cue timing and provenance. A free local speech-recognition engine must process only user-authorized audio supplied independently of unauthorized platform downloads; any browser-only machine learning integration requires performance and privacy testing.
4. Evaluate legitimate caption access on owner-controlled videos with authorized account permissions, separately from third-party videos. Record exact language, track type and original timed cues when available.
5. Benchmark actual owner-permitted examples privately and publish only after standard exact-head, risk-based and Site acceptance gates.

## Verification
Synthetic tests are in `tests/youtube-metadata.test.mjs`, `tests/site-service.test.mjs`, and `e2e/test-lab.spec.mjs`. Required commands:
- `npm run check`
- `npm run build`
- `npm run lint`
- `pnpm exec tsc --noEmit`
- `npm run test:e2e`

Run on the final pull-request head. No real user URLs, titles, captions or identifiers are committed. Do not deploy without independent review of provider terms and source-control head.
