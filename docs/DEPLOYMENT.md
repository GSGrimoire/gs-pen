# PEN-010 release verification (24 October 2026)

Orange workspace and separate owner-private saved extraction history are deployed and verified. Site identity and owner-only audience are preserved. Migration `0001_mighty_captain_britain.sql` was generated through Drizzle, inspected, applied to the local preview database and applied by Sites during deployment.

Hosted-tested source: `36694bf049339b93f9d8a4fa0c4c70f38016c1fe`. Private deployment: `appgdep_6add0498c4c481919bf60c5172b187e2`. Saved version: `appgprj_6adce46e22dc81918dab627af382c76a~appgver_53c878f914c48191860cb25fda9a5156`. URL: https://gs-pen-test-lab.goofyspook.chatgpt.site. GitHub implementation: `75751063a983f1b63538014abbcbe9aca703ec10` plus state fixes `053810cdc42bb5de04646c8a8f4c01c8e7600bf6`; pull request #11 stacked on #9, unmerged.

Verification:
- 80 unit checks passed locally and in GitHub. Final functional-head browser run passed 34/34 desktop/mobile Chromium checks: https://github.com/GSGrimoire/gs-pen/actions/runs/40124648711. Includes navigation, filtering, reopening after reload, deletion/cancel confirmation, output safety, export structure, save failures and mobile layout. Those provider responses are synthetic.
- Separate real hosted TikTok request returned 62 caption cues, post text and metadata; saved automatically, survived reload and reopened without another provider request. Current-tab clipboard copy reported success.
- Real hosted Facebook request returned 1,528 post characters, five hashtags and metadata, saved as a partial result without native captions. Structured export downloaded and was inspected: platform captions empty, independent transcript not implemented, preview warning preserved, diagnostic events excluded.
- Actual database has two owner extraction rows with exactly 30-day expiry. Hosted disposable-record self-check passed diagnostics/history write, owner isolation, physical delete and expiry. No user extraction was deleted during hosted testing; individual deletion/cancel was verified through synthetic browser acceptance tests and real SQL unit checks.
- Service retention request returned 200 with expiredDeleted true. Service history read and forged-identity history read returned 403; anonymous history read returned 401. No second signed-in account was available; row isolation is covered by actual database self-check and unit tests, with missing/alternate identity rejection.
- Existing hourly cleanup automation `6adcf46e17b481919332f80387ddacfb` was retained and extended to saved history. Its schedule and enabled state were preserved; successful runs are silent. Cleanup deletes expired rows on access and through the hourly unattended endpoint, so physical removal while closed can lag expiry by up to the next successful hourly run.
- Desktop visual review completed. A final logo alignment correction and documentation publication follow this functional release; no retrieval, storage or authorization changes are included in that correction.

This is self-review only, with independent review still required before merge. Facebook captions, YouTube, independent Whisper and frame text recognition remain unimplemented. No new provider support is claimed.

---

# Current deployment ledger: 24 October 2026

Historical records below predate the actual Sites deployment and are superseded here.

Existing Site: https://gs-pen-test-lab.goofyspook.chatgpt.site
Project: `appgprj_6adce46e22dc81918dab627af382c76a`
Audience: custom access restricted to the owner, no external visitors or editors (confirmed via Sites).
Baseline: private Site version 4, source `4a99dc9aec629ff2813d9a17a9c48ad834a594e2`.

PEN-009 build: `testlab_v01_sites_2`. Adds TikTok post/metadata and initial Facebook public post retrieval. 75 unit tests pass. Live Node probes returned 62 TikTok caption cues plus post data and 1,528 Facebook post characters plus creator/title. These probes do not substitute for hosted verification. Private deployment succeeded at 18:25 UTC on 24 October 2026 (20:25 Copenhagen). Saved version ID: `appgprj_6adce46e22dc81918dab627af382c76a~appgver_2c9ab98f65b081919d8020bf1dce70d3`. Deployment ID: `appgdep_6adcf7edb9b0819199c82aeb65ff5861`. Runtime source commit: `e12c086d14522fd49c8d50469cd29bee767b32a4`. GitHub implementation commit: `2b138b442ed2f2a4d954799e44911c8c61edb447`, pull request https://github.com/GSGrimoire/gs-pen/pull/9 (stacked on #7; unmerged).

Hosted signed-in verification passed:
- Supplied TikTok: 62 native timed cues, post text with three hashtags, creator/username, publication time, 136-second duration, dimensions, language and engagement fields displayed in independent tabs.
- Supplied Facebook: 1,528 post characters and five hashtags from the public share title, creator The Dungeon’s Loot, post title and engagement summary. Public-preview completeness warning displayed. Native captions and Whisper correctly remain unavailable. Partial-result state selects post text automatically.
- Automatic database logging: new `post_parse`, `metadata_parse` and `PARTIAL_RESULT` events present, with boolean availability fields. Inspected 82 stored events; extracted source text, creator handles/names and requested video identifiers absent.
- Actual database write/privacy/deletion/expiration self-check passed. Anonymous diagnostic request returned 401. No alternate-account browser test in this increment; existing negative-identity unit tests pass and authorization was unchanged.
- Hosted desktop page has no horizontal overflow at 1,348 pixels. GitHub desktop/mobile Chromium suite passed 30/30 synthetic acceptance checks: https://github.com/GSGrimoire/gs-pen/actions/runs/40120557480. Unit workflow and segregated two-sample TikTok live research workflow also passed on the implementation commit: runs 40120557439 and 40120557556.
- Browser tests use synthetic responses; live hosted requests above were verified separately. Review remains self-review, not independent approval.

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

