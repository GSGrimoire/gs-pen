# GS Pen handoff
Updated 22 October 2026 after merging pull request #3.

## Current state
Repository: GSGrimoire/gs-pen (private). Main contains the feasibility research, specifications, backlog, URL classifier, and now a small parallel caption/Whisper orchestration prototype. Pull request #2 merged as `9ddfbb54cf7c688e2fdddaa62383bac2ffedf958`. Pull request #3 merged as `b91526924c88880fe1587cf08b9ddfd22264b68a`.

## Validated locally
- URL classifier: 29/29 synthetic tests in previous validation.
- Parallel transcript orchestration: 10/10 synthetic tests passed locally using Node.js and a local copy of the source URL classifier. This includes caption-only, Whisper-only, both available, error isolation, audio disposal and reporting captions before the independent Whisper task finishes.
- Source-based research: TokScript publicly states it retrieves existing auto-generated platform captions when available. Research is in docs/DUAL_TRANSCRIPTION_RESEARCH.md.

## Unverified
No real YouTube, TikTok, Facebook or Instagram caption track was retrieved. No platform audio stream was acquired. No speech recognition model executed. No Site deployed, and no login or synchronized storage validated. No third-party transcript service was integrated.

## Release blocker and next action
Validate rights-cleared access to existing platform transcripts independently of audio download. The caption retrieval path may succeed even when Whisper is blocked. Test documented official interfaces and consent-based browser methods on real public examples, logging only non-personal results. Test live browser capture or a permissioned hosted extraction route separately. Do not claim TokScript's proprietary method is openly available, or that platform captions are ground truth for GS Scribe model evaluation.

## Review and deployment
Both merges were self-reviewed and locally tested, not independently approved. Future authentication, media retrieval and storage integrations warrant independent security review. No website has been published; deployment record remains empty.


## 22 October 2026 caption access breakthrough
On branch `chatgpt/pen-002b-live-caption-probes`, GitHub Actions run https://github.com/GSGrimoire/gs-pen/actions/runs/39855712437 confirmed a TikTok WebVTT caption track with **15 timed cues** for the public @scrubdaddy video `7538539956029902111`. The workflow printed only status and counts, not captions. YouTube `jNQXAC9IVRw` returned `RequestBlocked`; no Instagram or Facebook samples were used. See docs/LIVE_CAPTION_RESULTS.md. This supersedes the earlier blanket description of all platform caption access as unverified: *one TikTok sample is now verified*, but platform-wide access and production permissions remain unproven. No browser Site or independent Whisper audio processing has been tested.

Next: repeat on multiple rights-cleared TikTok videos, verify cross-origin behavior in the actual browser environment, and investigate the other three platforms without circumvention.

## Second live TikTok caption example (22 October 2026)
GitHub Actions run https://github.com/GSGrimoire/gs-pen/actions/runs/39856616103 confirms two public TikTok captions: Scrub Daddy (15 WebVTT cues) and Hank Green (12 WebVTT cues). YouTube remains RequestBlocked from cloud runner, while Instagram and Facebook have no verified caption path. Research branch now requires both live TikTok samples to pass. This is not a multi-day reliability assessment, permission signoff, deployed app, or production-compatible browser demonstration.

## Merged caption live-test milestone
PR #4 merged to main at `4605f20338e79be85802086a63c690e41a9e51ea` on 22 October 2026. Final required-live-tests run: https://github.com/GSGrimoire/gs-pen/actions/runs/39856854166 . It passed 39 JavaScript and 4 Python offline tests and retrieved 15 WebVTT cues from the Scrub Daddy TikTok and 12 from the Hank Green TikTok. YouTube from cloud runner returned `RequestBlocked`. Facebook/Instagram remain untested. No production Site has been deployed. Continue with multi-day/multi-video access sampling, platform permissions, and private browser cross-origin proof before proceeding to product build.

## Architecture decision for diagnostic Test Lab, 23 October 2026
Plan approved for research (not deployed): choose a private ChatGPT Site for the frontend, owner-only test data and diagnostics if runtime capabilities verify. Use GitHub for versioning and scheduled research tests, not interactive jobs. Start with narrow server-side caption retrieval and browser-side future Whisper. If Site outbound caption requests prove unavailable, investigate a separate small permissioned retrieval service. See docs/ARCHITECTURE_DECISION.md.

Branch chatgpt/pen-007-diagnostics-plan adds diagnostic event sanitization code and tests, test-site runbook and a private-data minimization design. No Site, backend logging endpoint, persistent database or actual server-side caption adapter exists yet. The test Site must never claim these have passed before live verification.

Next task: review/test/merge the plan and sanitizer; open Work -> Sites to create a private Test Lab from this repository design, explicitly validate browser and backend access, deploy only after owner-audience and storage tests are complete, record evidence in docs/DEPLOYMENT.md.
