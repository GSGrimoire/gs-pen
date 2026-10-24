# GS Pen deployment ledger

## 24 October 2026

An owner-private ChatGPT Site has **not** been created or published through this conversation. The Test Lab static frontend and local-only Node.js research backend exist in GitHub pull request #7. Automated tests and research runner results are referenced in docs/TEST_SITE_PLAN.md.

Do not publicly host `server/local-server.mjs`. It intentionally has **no remote owner authentication**, binds to 127.0.0.1, and uses a local JSON file. The future private Site must supply an authenticated backend and owner-scoped storage or remain browser-local only.

When publishing, record Site project ID, exact private URL, deployed commit, version, permission checks, request egress results, live native-caption results, database validation and known limitations. A GitHub commit is not a Site deployment.

## 24 October 2026 automated preview readiness
The GitHub Test Lab's static build and Playwright browser suite passed 22/22 desktop/mobile tests: https://github.com/GSGrimoire/gs-pen/actions/runs/40113533641. This is **not a deployed Site**. No Sites project ID, private URL, authenticated server function or cloud diagnostic database exists from this workflow. The deployment brief to hand to ChatGPT Work / @Sites is docs/SITES_DEPLOYMENT_HANDOFF.md.

