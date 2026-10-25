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

## Current state, 25 October 2026

The existing owner-private Site is deployed at https://gs-pen-test-lab.goofyspook.chatgpt.site, project `appgprj_6adce46e22dc81918dab627af382c76a`. Its latest pre-review runtime source is `7675ca656d74160e8d9b668c37f08a3fd2c03ef6`, saved version `appgprj_6adce46e22dc81918dab627af382c76a~appgver_9cf19f0af6c8819194c77cbafb31fef2`, deployment `appgdep_6add0899e1d88191b7db64205c24f7a1`. This receipt is from the existing release, not the corrective changes in pull request #7.

The live Site already contains later stacked changes. Corrective merges must proceed #7, #9, #11, #13, each retargeted to main and rechecked, before publishing a reconciled main tree. Preserve owner-only access. Record the new GitHub main commit, Sites source commit, saved version, deployment and verification results after publication.

Claude's independent review is recorded in pull request #7, combined comment 6393655281, with inline findings on all four pull requests. Fixes are self-reviewed against those findings. Browser acceptance uses synthetic provider fixtures against the loopback research server; hosted authorization, database and provider checks require separate evidence.

## Historical pre-deployment evidence



## Final documentation publication receipt
At 18:29 UTC (20:29 Copenhagen), owner-private publication succeeded for source `8b99ff7755bc0c90af91aa3cdf1d24959c96b4b4`, saved version `appgprj_6adce46e22dc81918dab627af382c76a~appgver_0fa137b2890c8191b137b182ca3f2c59`, deployment `appgdep_6adcf8e207788191bb8023831026c581`. URL unchanged: https://gs-pen-test-lab.goofyspook.chatgpt.site. This final source differs from the hosted-tested runtime commit only in BACKLOG.md, docs/DEPLOYMENT.md and docs/HANDOFF.md. Application code/build output is unchanged; no repeat provider calls were required. This receipt is recorded on the GitHub feature branch after publication.
On 24 October 2026, local preview acceptance passed 22 desktop/mobile checks in run 40113533641. That run preceded Site provisioning and did not establish hosted authentication or database behavior. Later historical publication receipts are preserved in the descendant pull requests and Site source history.

The research Node server remains loopback-only and must never be exposed publicly. The live service instead uses the authenticated Sites worker and owner-private database. Diagnostics have 30-day application retention with hourly physical expiry; infrastructure request logs have independent platform retention.
