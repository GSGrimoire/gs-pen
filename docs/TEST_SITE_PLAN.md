# GS Pen Test Lab: development build

Updated 24 October 2026. The **code is built and tested**, but a private ChatGPT Site is **not deployed**.

## Available development build

- `web/index.html`, `web/styles.css`, `web/app.mjs`: responsive dark research console, input validation, four distinct result tabs, stage trace, technical context, automatic local diagnostics, filters, safe export and clear actions.
- `src/diagnostics.mjs`: strict granular depersonalized diagnostic schema v2 and source domain/link-type classification.
- `server/caption.mjs`: experimental direct no-login TikTok public-page and WebVTT caption access, bounded downloads, no redirects, no social cookies, no speech model.
- `server/local-server.mjs`: loopback-only test server serving static build, caption lookup and sanitized events. **Not authenticated for remote hosting**.
- `scripts/build-site.mjs`: copies static assets and shared source modules into self-contained `dist/`.
- `.local/diagnostics.json`: local-only 30-day sanitized diagnostic store ignored by Git.

## GitHub Codespaces preview

GitHub Codespaces provides an optional owner-only **temporary interactive test machine**; unlike GitHub Actions, it can forward the development server through a private GitHub-authenticated port. The Codespaces configuration is committed in `.devcontainer/devcontainer.json`. The server uses an ephemeral 48-character access key displayed only in the Codespaces terminal to authorize caption and diagnostic operations. See `docs/CODESPACES_TEST.md`. This mode is not long-lived hosting, does not create a Site, and has not been exercised in an actual Codespace yet.

## Run on a computer with Node.js 22 or newer

```bash
npm run check
npm start
```

Then open `http://127.0.0.1:4173` on that computer. The app never runs Whisper. For research using rights-cleared public TikTok videos, the backend attempts existing captions. Other platforms clearly report NOT_IMPLEMENTED. Backend network blocks are distinct from caption absence.

## Verified
GitHub Actions run https://github.com/GSGrimoire/gs-pen/actions/runs/40090272982 passed 56 synthetic JavaScript tests after producing the static bundle.
Live JavaScript retrieval check https://github.com/GSGrimoire/gs-pen/actions/runs/40090424854 retrieved TikTok caption tracks: 15 cues (Scrub Daddy) and 12 cues (Hank Green) with no transcript text in logs. That is a cloud runner test, not proof of an ordinary user's computer or a ChatGPT Site.
The frontend was built in CI but interactive visual browser quality assurance and private Sites access validation have not yet happened.

## Private ChatGPT Site next

Use ChatGPT Work with Sites, taking `GSGrimoire/gs-pen` as source reference. Generate a **private preview** of the `dist/` frontend. Adapt the caption backend to the supported Sites runtime with owner authentication and authenticated database storage. The standalone local Node server must **not** be exposed as a remote Site. Verify actual outbound requests and database persistence before claiming that the live Site can extract captions automatically.

If Sites cannot perform permitted cross-origin server caption retrieval, evaluate a minimal authorized backend service through an authenticated Site endpoint. Do not use GitHub Actions as an interactive backend.

## Publication gate

- Verify owner-only audience, login and negative authorization tests.
- Verify TikTok retrieval from the real Site runtime and accurately distinguish network block from true caption absence.
- Verify diagnostic entry persistence, filtering, 30-day expiry and deletion against real Site database.
- Verify the privacy whitelist in browser and server logs with adversarial URLs.
- Perform human review of visual accessibility, keyboard operation and responsive layout.
- Document the real Site URL, commit, build and limitations in `docs/DEPLOYMENT.md`. Do not claim other platform coverage or Whisper.
