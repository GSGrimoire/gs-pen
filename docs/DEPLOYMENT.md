# Current deployment ledger: 24 October 2026

Historical records below predate the actual Sites deployment and are superseded here.

Existing Site: https://gs-pen-test-lab.goofyspook.chatgpt.site
Project: `appgprj_6adce46e22dc81918dab627af382c76a`
Audience: custom access restricted to the owner, no external visitors or editors (confirmed via Sites).
Baseline: private Site version 4, source `4a99dc9aec629ff2813d9a17a9c48ad834a594e2`.

PEN-009 build: `testlab_v01_sites_2`. Adds TikTok post/metadata and initial Facebook public post retrieval. 75 unit tests pass. Live Node probes returned 62 TikTok caption cues plus post data and 1,528 Facebook post characters plus creator/title. These probes do not substitute for hosted verification. New Site version and hosted receipts will be appended after deployment.

Automatic diagnostic storage uses the existing Sites database with owner authorization and 30-day deletion; new post/metadata outputs are excluded. Hosting infrastructure retains separate request metadata under platform policy. No change to authentication, sharing, credentials, or retention in this increment.

Review is self-review only. GitHub change remains unmerged pending independent review. Facebook native captions, frame text recognition and Whisper are not implemented.

---

# GS Pen deployment ledger

## 24 October 2026

An owner-private ChatGPT Site has **not** been created or published through this conversation. The Test Lab static frontend and local-only Node.js research backend exist in GitHub pull request #7. Automated tests and research runner results are referenced in docs/TEST_SITE_PLAN.md.

Do not publicly host `server/local-server.mjs`. It intentionally has **no remote owner authentication**, binds to 127.0.0.1, and uses a local JSON file. The future private Site must supply an authenticated backend and owner-scoped storage or remain browser-local only.

When publishing, record Site project ID, exact private URL, deployed commit, version, permission checks, request egress results, live native-caption results, database validation and known limitations. A GitHub commit is not a Site deployment.

## 24 October 2026 automated preview readiness
The GitHub Test Lab's static build and Playwright browser suite passed 22/22 desktop/mobile tests: https://github.com/GSGrimoire/gs-pen/actions/runs/40113533641. This is **not a deployed Site**. No Sites project ID, private URL, authenticated server function or cloud diagnostic database exists from this workflow. The deployment brief to hand to ChatGPT Work / @Sites is docs/SITES_DEPLOYMENT_HANDOFF.md.

