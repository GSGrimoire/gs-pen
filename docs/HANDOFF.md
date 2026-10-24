# PEN-010 current work: 24 October 2026

Orange workspace and owner-private history replace the laboratory-first interface. Three destinations: Extract, Recent, Diagnostics. Native captions, post text, metadata and future Whisper remain separate. Source and provider limits unchanged.

- Branch `chatgpt/pen-010-workspace-history`, stacked on pull request #9, issue #10. Keep unmerged pending independent review.
- New schema migration `0001_mighty_captain_britain.sql` adds `extractions`, separate from diagnostic records. Rows are scoped by the trusted Sites user identifier. No client result-write endpoint. Successful and partial extractions auto-save, newest 50 per owner, expire after 30 days. History failure never blocks retrieval.
- History contains canonical source links and extracted captions/post/metadata; tracking queries, raw provider pages, signed resource URLs, logs, cookies and credentials are not stored. Diagnostics continue to exclude output content.
- Read/list/delete enforce owner authorization and row ownership. Individual permanent deletion has a confirmation dialog. Deleted content can remain in the currently open in-memory result until navigation/reload. Copy/export are explicit user actions.
- Exports: current-tab copy, plain text and structured data. Provenance and platform-caption/Whisper separation preserved, including shortened Facebook preview warning.
- Housekeeping deletes expired diagnostic and extraction rows; storage self-check verifies history write, isolation, delete and expiry with isolated disposable fixture rows.
- Unit verification currently 80 passing. Browser acceptance tests cover navigation, searching, reopening, deletion confirmation, export provenance, failed saves and mobile overflow. Hosted/automation results go in docs/DEPLOYMENT.md.
- Self-review only. New database migration, owner isolation and retention require independent review before merge. No changes to other GS projects.

---

# Current handoff: PEN-009 (24 October 2026)

The historical handoff below predates the private Sites deployment and is superseded by this section.

- Existing owner-private Site: https://gs-pen-test-lab.goofyspook.chatgpt.site (project `appgprj_6adce46e22dc81918dab627af382c76a`). Preserve its access policy.
- Feature branch: `chatgpt/pen-009-post-metadata-facebook`, based on PR #7 head `568e3cf01d97921147503f8fd39d4089883823a8`. Issue #8. Keep PR #7 and this change unmerged until independent review.
- TikTok now returns independent post text/hashtags and public creator, date, duration, dimensions, language and engagement fields, from the same public page used for captions.
- Facebook now attempts a bounded public-page request for canonical reel/watch/video links. Reads public share text, creator/title/engagement summary and matching structured video metadata when available. Share previews are explicitly marked as potentially shortened.
- Native Facebook captions, text recognition from frames, and independent Whisper transcription remain unimplemented. No media download, platform cookies, proxy or private Graph endpoints.
- Caption success remains `ok`; `post` and `metadata` have independent statuses/provenance. Caption failure preserves successfully retrieved post data. Browser selects a successful output for partial results.
- Output text/creator/media identifiers remain memory-only. Diagnostic additions are fixed stages/codes and availability booleans only. Database storage still uses the existing owner checks and 30-day retention.
- Local live probes: supplied TikTok returned 62 timed cues, 237 post characters and public metadata; supplied Facebook returned 1,528 post characters, five hashtags, creator and title. These are sample results, not universal coverage.
- Verification: 75 unit tests and 30 desktop/mobile browser acceptance checks pass, including synthetic post/caption independence, matching-video scoping, provider failure, tracking stripping, diagnostic exclusion and existing owner authorization/retention tests. Browser suite extended for TikTok output safety and Facebook partial results. Hosted signed-in TikTok and Facebook verification, database checks, anonymous rejection, source/version and build receipts are recorded in docs/DEPLOYMENT.md. Pull request #9 remains unmerged.
- Review: self-review of request bounds, fixed-host requests, untrusted text rendering, data exclusion and unchanged authentication. No independent review completed in this session.
- Next: verify broader Facebook variants and permitted native-caption tracks, support safe canonical resolution for shared/short links, then work on independent speech and frame text recognition as separate capabilities.

---

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

