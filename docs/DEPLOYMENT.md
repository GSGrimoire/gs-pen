# GS Pen deployment ledger

## Current state, 25 October 2026

The existing owner-private Site is deployed at https://gs-pen-test-lab.goofyspook.chatgpt.site, project `appgprj_6adce46e22dc81918dab627af382c76a`. Its latest pre-review runtime source is `7675ca656d74160e8d9b668c37f08a3fd2c03ef6`, saved version `appgprj_6adce46e22dc81918dab627af382c76a~appgver_9cf19f0af6c8819194c77cbafb31fef2`, deployment `appgdep_6add0899e1d88191b7db64205c24f7a1`. This receipt is from the existing release, not the corrective changes in pull request #7.

The live Site already contains later stacked changes. Corrective merges must proceed #7, #9, #11, #13, each retargeted to main and rechecked, before publishing a reconciled main tree. Preserve owner-only access. Record the new GitHub main commit, Sites source commit, saved version, deployment and verification results after publication.

Claude's independent review is recorded in pull request #7, combined comment 6393655281, with inline findings on all four pull requests. Fixes are self-reviewed against those findings. Browser acceptance uses synthetic provider fixtures against the loopback research server; hosted authorization, database and provider checks require separate evidence.

## Historical pre-deployment evidence

On 24 October 2026, local preview acceptance passed 22 desktop/mobile checks in run 40113533641. That run preceded Site provisioning and did not establish hosted authentication or database behavior. Later historical publication receipts are preserved in the descendant pull requests and Site source history.

The research Node server remains loopback-only and must never be exposed publicly. The live service instead uses the authenticated Sites worker and owner-private database. Diagnostics have 30-day application retention with hourly physical expiry; infrastructure request logs have independent platform retention.
