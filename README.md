# GS Pen

**Status: a functioning local Test Lab exists on the `chatgpt/pen-007-diagnostics-plan` branch. No private ChatGPT Site has been deployed.**

GS Pen researches public-video caption retrieval for GS Suite. It keeps original platform captions separate from independently generated speech transcriptions. The first experimental native-caption adapter supports canonical public TikTok links in a **loopback-only development server**. Other platform adapters and Whisper speech recognition are not implemented in the Test Lab.

## Try it in a private GitHub Codespace (no home server)

The repository includes `.devcontainer/devcontainer.json` for a temporary GitHub Codespaces preview with a **private** forwarded port and an additional randomly generated development key. See [Codespaces Test Guide](docs/CODESPACES_TEST.md). You must start the Codespace from GitHub yourself; this conversation did not provision or deploy one. Codespaces usage is metered and the feature may be limited by account settings.

## Start the private-computer test

Requires Node.js 22 or newer.

```bash
npm run check
npm start
```

Open `http://127.0.0.1:4173` on that computer. This research server only listens to the local computer and must **not** be exposed on the internet. Existing public TikTok caption retrieval requires a working network connection and may fail as TikTok changes access or imposes restrictions.

## What's implemented

- Self-contained responsive Site frontend in `dist/`, generated from `web/` with `npm run build`.
- Four output tabs, caption extraction results, trace timeline, video URL format recognition, explicit unavailable states for other providers and Whisper.
- Local bounded caption-page and WebVTT retrieval with no redirects, credential bypass, paid transcription service or audiovisual media download.
- Automatic depersonalized diagnostics: allowlisted source domain, video-link category, coarse CDN family, request stage, HTTP status, processing time, response-size bucket, cue count, coarse browser/device category and error classification.
- Automatic browser-local history of sanitized diagnostic events and loopback-server JSON diagnostic persistence with filtering, export and clear. 30-day expiry on read/write. No caption or transcript text in diagnostic storage.
- Automated unit tests and a separate non-content-logging live caption research workflow.

## Verified

The Node.js live GitHub Actions check on 24 October 2026 retrieved 15 WebVTT cues from one public TikTok video and 12 from a second, separately. These are two samples, not evidence of platform-wide reliability or production authorization.

## Automated browser checks

GitHub Actions runs the Test Lab in desktop and mobile Chromium with Playwright. The acceptance suite checks caption result display, truthful errors, unimplemented tabs, sanitized diagnostics, export, 30-day retention, development-key UI and mobile overflow. Latest result: [22/22 browser tests passed](https://github.com/GSGrimoire/gs-pen/actions/runs/40113533641). These use synthetic caption fixtures; the separate live research workflow continues to verify two real TikTok examples.

For eventual private Sites provisioning, see [Work Sites deployment handoff](docs/SITES_DEPLOYMENT_HANDOFF.md). This GitHub connector can prepare code and CI, but cannot create or publish a ChatGPT Site.

## Not implemented or verified

- No ChatGPT Site deployment or verified owner-only remote authentication and database.
- No remotely hosted caption endpoint. The local server is **not safe to expose** beyond loopback.
- No production-quality extraction for TikTok, and no working YouTube, Instagram or Facebook native-caption adapters.
- No Whisper model transcription, metadata provider integration or synced transcript history.
- No complete private Site security review or cross-origin runtime test.

## Project documentation

Read `docs/HANDOFF.md`, `BACKLOG.md`, `docs/ARCHITECTURE_DECISION.md`, `docs/DIAGNOSTICS.md`, and `docs/TEST_SITE_PLAN.md`.

GitHub Actions is a testing environment, not a persistent server. ChatGPT Sites is the preferred eventual owner-private host; first verify private preview, a supported authenticated backend runtime and Site database. Do not publish the raw local Node server. Saving in GitHub is not deployment to Sites.

