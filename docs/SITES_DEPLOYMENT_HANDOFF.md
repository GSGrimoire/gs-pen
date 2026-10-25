# GS Pen: Sites maintenance handoff

The existing owner-private Site is deployed: https://gs-pen-test-lab.goofyspook.chatgpt.site.
Project: `appgprj_6adce46e22dc81918dab627af382c76a`. Preserve this identity and audience. Receipts and verification limits are in `docs/DEPLOYMENT.md`.

## Source and build

Continue the existing `GSGrimoire/gs-pen` repository and reviewed pull-request workflow. Use main after approved changes merge. The frontend is `web/` and shared modules are `src/`; the hosted service is `server/site-service.mjs`, exposed through `app/api/[...path]/route.ts`. `worker/index.ts` and the retained Sites Vite integration produce the authenticated worker.

Run `npm run install:ci`, `npm run check`, `npm run build`, `npm run lint`, `pnpm exec tsc --noEmit` and `npm run test:e2e`. `npm run build` emits the Sites worker under `dist/`; the separate research build is `npm run build:local` under `local-dist/`. Never deploy the Node loopback server.

## Access and storage invariants

- Require trusted dispatcher user identity and configured `GS_PEN_OWNER_EMAIL` plus `GS_PEN_OWNER_ID`. Reject missing or mismatched identity on all content and diagnostic endpoints.
- Keep exactly one allowed owner. Diagnostics intentionally have no owner column: reads and deletion cover the single owner's store. Add ownership isolation before permitting a second user.
- Sanitized diagnostics have a 10,000-record cap and 30-day expiry. Expired records are excluded on access and physically deleted by housekeeping. Hourly cleanup depends on the separate configured automation; verify that automation when releasing.
- The identity-less service retention route can only delete already expired rows using server time. It returns no records and depends on the private dispatcher boundary. It is not a general data service.
- Hosting request metadata has independent platform retention. Application diagnostic privacy does not promise control of those logs.
- Keep platform captions, post text, metadata and independent transcripts distinct. Preserve partial-result and provenance warnings.

## Release

Use the Sites source helper to open the existing source repository, synchronize the verified main application tree, build and package it, and save/deploy privately. Do not change sharing. Record GitHub main commit, runtime source commit, saved version, deployment identifier, URL and checks in `docs/DEPLOYMENT.md`. A GitHub commit is not itself a Site deployment.

Test owner access, anonymous/forged access rejection and disposable database write/delete/expiry separately from the loopback browser suite. Record any unavailable second-account checks and provider blocking truthfully. Live provider probes must avoid logging extracted text. No cookie acquisition, authentication bypass or proxy evasion.
