# GS Pen handoff
Updated 24 October 2026. Next milestone: review and create owner-private ChatGPT Sites preview.

## Current branch and pull request
- Main contains research PRs #2-#4, including two distinct live TikTok caption extraction cases from GitHub-hosted Python probes.
- Open PR **#7** on `chatgpt/pen-007-diagnostics-plan` now contains the **working local Test Lab** and implementation of granular depersonalized diagnostics. This branch is not merged and must not be publicly deployed.
- Source: `web/` frontend, `src/` shared validation and diagnostics, `server/` loopback backend, `scripts/build-site.mjs`; `dist/` generated.
- `npm run check` builds static assets and runs unit tests; `npm start` launches local loopback Test Lab on port 4173.

## Proven
- GitHub Actions unit check: 56 / 56 passed on 24 October 2026, including server HTTP, sanitization, caption parser, and metadata classification. Latest passing run: https://github.com/GSGrimoire/gs-pen/actions/runs/40090272982.
- Node.js live public-caption research check: two distinct TikTok examples returned valid WebVTT caption files with 15 and 12 cues without saving text. Run: https://github.com/GSGrimoire/gs-pen/actions/runs/40090424854.
- No paid speech recognition or third-party transcript service; Whisper remains unimplemented.

## Diagnostic privacy decision
Collect maximum useful structured **non-identifying** technical metadata: allowlisted source hostname, link format, coarse query shape, provider name, CDN family, broad browser/device category, stage/status/error code, elapsed times, HTTP status, response size category, counts and random trace ID. No raw video IDs, creator handles, video URLs, subtitles, speech, signed asset URLs, arbitrary error strings, IP addresses or raw agent strings. Docs: `docs/DIAGNOSTICS.md`.

## Still unverified
- Private Sites deployment, supported backend runtime, authenticated Site database, cross-account access controls.
- Hosted Site caption retrieval, including outbound network permission and platform rights.
- Browser visual quality assurance, real device tests, provider success ratios across days.
- Real metadata and Whisper extraction. Do not claim the local loopback server is an authenticated production service.

## Security / review rule
PR #7 includes local request handling and diagnostic storage and should receive independent security review before merger into main or adaptation to a real private Site. This conversation cannot independently approve its own work. The local Node server listens only on 127.0.0.1 and is **not** a remotely deployable API.

## Optional remote test without a home server

A private GitHub Codespaces development configuration and additional per-start development access key are now included in PR #7. Live endpoint access requires the private Codespaces port and this key; local mode remains loopback-only. Security checks include a unit test for unauthorized log read/caption requests. **A Codespace has not been provisioned or tested for port forwarding**. See docs/CODESPACES_TEST.md. Final unit run: 57/57 passing after auth-key changes on 24 October 2026.

## Next implementation sequence
1. Review PR #7 security and Test Lab tests.
2. In ChatGPT Work/Sites, create **GS Pen Test Lab** from this repo as a *private preview*, keeping `dist/` static frontend; do not expose `server/local-server.mjs` to the internet.
3. Build a narrow authenticated Site-compatible caption service and owner-only Site diagnostic database, verify access/retention with real Site runtime.
4. Publish privately only after negative auth and data-exfiltration tests, and document the actual deployment receipt in `docs/DEPLOYMENT.md`.

## PEN-008 automated QA and Work Sites handoff (24 October 2026)
On development branch `chatgpt/pen-007-diagnostics-plan`, Playwright 1.64.1 is pinned, with desktop Chromium and mobile Chromium acceptance suite in `e2e/test-lab.spec.mjs`, Playwright configuration and `.github/workflows/browser-e2e.yml`. GitHub Actions run https://github.com/GSGrimoire/gs-pen/actions/runs/40113533641 passed **22/22 real browser tests**, including four tabs, success/error caption displays with synthetic fixtures, cross-provider no-op, backend missing state, diagnostic redaction/export, no horizontal overflow, Codespaces-key behavior, expiry of >30-day records, and HTML-safe caption presentation. Separate unit and real TikTok research workflows also passed on that commit. Browser tests use synthetic/mocked caption responses; live caption retrieval was separately verified for two TikTok examples through GitHub Actions.

Private ChatGPT Sites project cannot be created or deployed using the GitHub-only connector tools available in this chat. The exact Work / @Sites deployment handoff is `docs/SITES_DEPLOYMENT_HANDOFF.md`. A saved Site version is not yet created. Remote authenticated endpoints/diagnostic database not implemented, so do not publish or claim Site readiness. PR #7 remains open pending independent security review of remote integration; no user manual testing required.
