# GS Pen

GS Pen Test Lab is deployed owner-private at https://gs-pen-test-lab.goofyspook.chatgpt.site. Exact version, source and verification receipts are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). This experimental service keeps native platform captions separate from independent speech transcription, which is not implemented.

**Current release status, 3 November 2026:** the last documented owner-private Site deployment is **version 11 from 25 October**. It already pauses automatic record deletion while preserving explicit owner deletion. GitHub `main` also contains reviewed PEN-018 paging, PEN-020 TikTok share-link, PEN-023 Facebook video/reel reliability and PEN-024 Facebook post-share changes, but there is **no verified newer Site deployment receipt** for them. PEN-026 recovery guidance remains in draft PR #29. Private publication and hosted checks are tracked by issue #27 and [the 4 November readiness checklist](docs/RELEASE_READINESS_2026-11-04.md).

## Hosted application

The Sites worker uses `app/`, `worker/` and `server/site-service.mjs`, with trusted dispatcher identity and an owner-restricted database. Both `GS_PEN_OWNER_EMAIL` and `GS_PEN_OWNER_ID` are required. Keep the Site owner-private. Diagnostic records exclude extracted content. Automatic age-based deletion and count-based pruning are paused; explicit owner deletion remains available. Legacy expiry timestamps are ignored without a destructive migration. Hosting infrastructure logs have separate platform-controlled retention.

The current **repository source** (which may be ahead of the published Site) uses bounded TikTok and Facebook requests and strictly validated, manually inspected short-link redirects; they do not follow arbitrary redirects, use social-account cookies, download media or evade provider restrictions. Two documented live examples returned 15 and 12 native caption cues. These samples do not establish universal reliability or retrieval rights. Facebook public-preview post text and creator/metadata retrieval are also implemented, with explicit shortening warnings. Facebook fb.watch and share/video/reel links have a bounded resolution path. TikTok may try up to three published caption assets and exact-ID public page-state formats. Facebook captions, YouTube and Instagram retrieval, independent Whisper and frame-text recognition remain unavailable.

The orange workspace provides Extract, Recent, Create and Diagnostics. Successful and partial results save in a separate owner-scoped content store. The published version 11 displays the latest 50; newer merged GitHub source includes owner-scoped paging of older retained work, which still needs private publication. Records remain retained until explicit owner deletion, with search/reopen/delete and copy/export controls. Complete assistant handoffs copy all outputs and open Claude or ChatGPT, with optional bounded Claude desktop links. Native app delivery remains unverified.

## Local research server

Requires Node.js 22.13 or newer. This is distinct from the authenticated Sites worker:

```bash
npm run check
npm run start:local
```

Open http://127.0.0.1:4173. Never expose `server/local-server.mjs` publicly. The optional private development-key Codespaces flow is documented in [docs/CODESPACES_TEST.md](docs/CODESPACES_TEST.md); an actual Codespace has not been verified.

## Hosted build and verification

```bash
npm run install:ci
npm run build
npm run lint
pnpm exec tsc --noEmit
npm run test:e2e
```

Dependencies use the committed pnpm lockfile and package policy. `npm start` runs the built Sites worker locally through Wrangler, not the loopback research server. `npm run build:local` emits `local-dist/`; `npm run build` builds the Sites runtime under `dist/`.

Unit and desktop/mobile browser checks use synthetic provider fixtures. Browser tests start the loopback server and do not verify hosted authentication, real provider access or the hosted database. Hosted checks must be recorded separately. Automated workflows cover every pull request, including base retargeting, and pushes to main; the hosted job builds, lints and checks types with frozen dependencies.

Read `AGENTS.md`, `docs/HANDOFF.md`, `BACKLOG.md`, `docs/DIAGNOSTICS.md` and `docs/SITES_DEPLOYMENT_HANDOFF.md` before continuing. GitHub Actions is for verification, never an interactive extraction backend.
