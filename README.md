# GS Pen

GS Pen Test Lab is deployed owner-private at https://gs-pen-test-lab.goofyspook.chatgpt.site. Exact version, source and verification receipts are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). This experimental service keeps native platform captions separate from independent speech transcription, which is not implemented.

## Hosted application

The Sites worker uses `app/`, `worker/` and `server/site-service.mjs`, with trusted dispatcher identity and an owner-restricted database. Both `GS_PEN_OWNER_EMAIL` and `GS_PEN_OWNER_ID` are required. Keep the Site owner-private. Diagnostic records exclude extracted content and expire after 30 days; hourly housekeeping physically removes expired rows. Hosting infrastructure logs have separate platform-controlled retention.

The canonical public TikTok adapter uses bounded requests with no redirects, social-account cookies, media downloading or proxy evasion. Two documented live examples returned 15 and 12 native caption cues. These samples do not establish universal reliability or retrieval rights. Other provider captions and independent Whisper remain unavailable at this baseline.

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
