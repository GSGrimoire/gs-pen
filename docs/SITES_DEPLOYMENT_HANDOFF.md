# GS Pen: ChatGPT Sites deployment handoff

Status: **ready to use as implementation brief in ChatGPT Work / @Sites**, but no Site project or deployment has been provisioned.

## Source
- GitHub repository: `GSGrimoire/gs-pen` (private)
- Development branch: `chatgpt/pen-007-diagnostics-plan` (PR #7)
- Static source: `web/` and `src/`
- Build command: `npm run build`
- Static output: `dist/`, referenced by `.openai/hosting.json`
- Local-only backend reference: `server/caption.mjs`, `server/local-server.mjs`

## Goal
Create an **owner-private GS Pen Test Lab Site**, first as a saved, unpublished preview, with native TikTok caption retrieval, rich depersonalized automatic diagnostics, and four independent result tabs. The user should not be required to run manual browser regression tests.

## Nonnegotiable boundaries

1. **Do not publish `server/local-server.mjs` as a public remote API.** It lacks proper Sites owner authentication and its file store is meant only for local research.
2. Adapt only the narrow caption retrieval functions to the *actual supported Sites runtime*. A raw Node HTTP server cannot be assumed supported. Verify outbound provider requests, cross-origin constraints, request timeout, memory size, credentials behavior and response stream limits.
3. New Site audience must stay **Owner and workspace admins**. Never change to public or broadly shared.
4. Keep separate original-caption, Whisper (not implemented), post-text (not implemented), and metadata (not implemented) result tabs, with truthful statuses.
5. Use Sites-supported authenticated database storage for diagnostics **only after** confirming server-side identity. Backend derives the owner from the Sites session, ignores client-provided owner identifiers, and enforces owner-only create/list/delete access.
6. Diagnostics automatically record useful allowlisted technical categories from `src/diagnostics.mjs`: platform, domain, link type, query shape, CDN family, broad browser/device category, stage/status/error code, HTTP response, timing, response bucket and cue/track counts. Keep 30-day retention with a tested deletion/expiry mechanism.
7. Do **not** log video identifiers, creator handles, full URLs, signed track asset URLs, transcript text, raw errors, tokens or raw user agents. Scrub request logging and exception reporting, not just application event records.
8. If server-side caption retrieval cannot be supported, leave Site in **diagnostic-only** mode, surface `BACKEND_UNAVAILABLE`, and document the missing backend requirement. Do not silently substitute original captions for Whisper.
9. Existing TikTok probe is a research demonstration on two public examples, not broad reliability or production rights approval.

## Automated release gates

- GitHub Actions: unit/build suite must pass; Playwright desktop Chromium and mobile Chromium suite must pass; public video research checks remain segregated.
- Re-run available browser automation against the Site preview itself, including real authentication context, if the Sites workflow exposes a test browser.
- Authenticate as owner: can view logs; anonymous and alternate user must be denied by *backend endpoints*, not just hidden UI.
- Verify 30-day retention and delete through real Site database. Verify data isolation with second account or an equivalent trusted access test.
- Real Site: run permitted caption requests on both known research TikTok examples, or explicitly record platform/network blocking. Never label failures as missing captions without evidence.
- Validate the Test Lab on mobile, demonstrate source-domain and link-type diagnostics, and verify full URL/audio/transcript exclusion in database and service logs.
- Save a version before deployment. Only deploy privately once server auth, storage, privacy, and the required release gates pass. Record the Site project ID, link, commit, test receipt and limitations in `docs/DEPLOYMENT.md`.

## Tool limitation and handoff action

This connected GitHub session has repository editing and GitHub Actions tools, but **no Sites project provisioning/deployment action**. The next authorized execution step is to open ChatGPT **Work / @Sites** and pass this repository and specification. The GitHub commit and `.openai/hosting.json` do not deploy a Site.

Suggested Work instruction:

> Build a private GS Pen Test Lab website from the private GitHub repository GSGrimoire/gs-pen, development branch chatgpt/pen-007-diagnostics-plan. Read docs/SITES_DEPLOYMENT_HANDOFF.md and docs/TEST_SITE_PLAN.md. Use dist as static build output. Port narrow caption and diagnostics endpoints only to a supported Sites server runtime; don't expose server/local-server.mjs. Require owner-only Site access and server-enforced diagnostic record permissions. Run automated browser and backend authorization tests, save an unpublished Site version, and deploy only if the private-access and data-handling gates pass. Report the verified URL and failures to the user, updating docs/DEPLOYMENT.md. If the runtime cannot fetch captions, provide a truthful diagnostic-only preview and a technical blocker, without claiming functional extraction.

## References

- Site creation: https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites
- Saving versions vs deploying: https://learn.chatgpt.com/docs/sites/managing-a-site
