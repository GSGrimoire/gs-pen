# GS Pen architecture decision 001
Status: selected for an owner-only diagnostic test Site, not yet deployed.
Date: 23 October 2026.

## Decision
1. Main user experience: private ChatGPT Site with owner-only access. Source, tests and release history in private GitHub repository.
2. Live native captions: first try an authenticated Site server action requesting authorized public caption resources. Expose a narrow `resolveCaptions(provider, videoId)` interface, never an unrestricted user-defined URL fetcher. If the Site runtime blocks the necessary requests, evaluate a separate lightweight permitted retrieval service as a fallback. No third-party paid transcription service.
3. GitHub Actions: scheduled/repeatable feasibility tests and validation only; not a live worker behind a Transcribe button. Jobs are temporary and are decommissioned.
4. Future Whisper: speech recognition in the browser via a worker, where devices support the model and performance requirements. Audio retrieval is a separate capability and may require a persistent container service if authorized. Never assume caption access implies audio access.
5. Results: platform caption track, independent Whisper transcript, post text, metadata; each has its own provenance and error status.
6. Persistence: saved transcripts and sanitized diagnostic events in an owner-restricted Site database if the actual runtime verifies it. Until server storage is working, diagnostics may be local/exportable but not claimed as synchronized.

## Rejected starting points
- GitHub Pages alone: publicly accessible static site and no private processing.
- GitHub Actions as request-response processing server: ephemeral jobs, queue latency, no public API, inappropriate for interactive data.
- Hosted large audio/Whisper service before validating demand: recurring cost and private audio-handling burden.
- Direct browser TikTok/other network access as an assumed capability: browser cross-origin constraints may prohibit it.

## External fallback choices
For short request-response caption retrieval, a small edge function such as Cloudflare Workers is an engineering candidate, subject to network limits, provider permissions and privacy review. As of October 2026 its Free tier allows up to 100,000 requests/day but has 10 milliseconds CPU per request and 128 MB memory; not suitable for running a 30-minute Whisper pipeline or ordinary long-running Python media extraction. A container service would be a separate future decision if necessary. No Cloudflare account or service is provisioned.

## Site gate before publication
- Verify the Sites deployment path and owner-only audience; deny anonymous and second-account access.
- Verify server-side outgoing requests for the narrow caption endpoint, and correctly report blocked fetches.
- Verify server-side database persistence, identity scoping and deletion, not merely a local mock.
- Publish only a test experience with conspicuous non-production status.
- Review provider access rules and actual rights before testing media beyond permitted examples.
- Confirm logging secrets never go into client JavaScript or GitHub; server determines authorization itself.
- Document real Site URL, version, code commit, storage scope, logs and failures in docs/DEPLOYMENT.md.
- Do not promise four-platform coverage or active Whisper transcription at this stage.

## Source references reviewed
- https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://docs.github.com/en/actions/concepts/runners/github-hosted-runners
- https://developers.cloudflare.com/workers/platform/limits/
- GitHub Actions run 39856854166: TikTok 15 and 12 native caption cues on two different public videos. No browser or Site test yet.

