# Current handoff: PEN-009 (24 October 2026)

The historical handoff below predates the private Sites deployment and is superseded by this section.

- Existing owner-private Site: https://gs-pen-test-lab.goofyspook.chatgpt.site (project `appgprj_6adce46e22dc81918dab627af382c76a`). Preserve its access policy.
- Feature branch: `chatgpt/pen-009-post-metadata-facebook`, based on PR #7 head `568e3cf01d97921147503f8fd39d4089883823a8`. Issue #8. Keep PR #7 and this change unmerged until independent review.
- TikTok now returns independent post text/hashtags and public creator, date, duration, dimensions, language and engagement fields, from the same public page used for captions.
- Facebook now attempts a bounded public-page request for canonical reel/watch/video links. Reads public share text, creator/title/engagement summary and matching structured video metadata when available. Share previews are explicitly marked as potentially shortened.
- Native Facebook captions, text recognition from frames, and independent Whisper transcription remain unimplemented. No media download, platform cookies, proxy or private Graph endpoints.
- Caption success remains `ok`; `post` and `metadata` have independent statuses/provenance. Caption failure preserves successfully retrieved post data. Browser selects a successful output for partial results.
- Output text/creator/media identifiers remain memory-only. Diagnostic additions are fixed stages/codes and availability booleans only. Database storage still uses the existing owner checks and 30-day retention.
- Local live probes: supplied TikTok returned 62 timed cues, 237 post characters and public metadata; supplied Facebook returned 1,528 post characters, five hashtags, creator and title. These are sample results, not universal coverage.
- Verification: 75 unit tests and 30 desktop/mobile browser acceptance checks pass, including synthetic post/caption independence, matching-video scoping, provider failure, tracking stripping, diagnostic exclusion and existing owner authorization/retention tests. Browser suite extended for TikTok output safety and Facebook partial results. Hosted signed-in TikTok and Facebook verification, database checks, anonymous rejection, source/version and build receipts are recorded in docs/DEPLOYMENT.md. Pull request #9 remains unmerged.
- Review: self-review of request bounds, fixed-host requests, untrusted text rendering, data exclusion and unchanged authentication. No independent review completed in this session.
- Next: verify broader Facebook variants and permitted native-caption tracks, support safe canonical resolution for shared/short links, then work on independent speech and frame text recognition as separate capabilities.


---

# GS Pen current handoff
Updated 25 October 2026 after Claude's independent review.

The existing owner-private Sites service is deployed at https://gs-pen-test-lab.goofyspook.chatgpt.site. Project identity, exact source/version receipts and verification limits are in docs/DEPLOYMENT.md. Preserve sharing and the existing repository.

Pull request #7 contains the loopback research lab plus the authenticated Sites worker, owner-restricted diagnostic database and retention endpoint. Claude reviewed the stack independently; corrective changes are being verified before the authorized sequential merges. Do not treat historical tests as verification of a changed head.

Use `npm run start:local` for the loopback research server on port 4173. `npm start` instead runs the built Sites worker locally through Wrangler. Use the frozen pnpm installer, `npm run check`, `npm run build`, `npm run lint`, `pnpm exec tsc --noEmit` and `npm run test:e2e`. Browser fixtures are synthetic and do not establish hosted authentication or live platform access.

Owner access requires both configured email and identifier from trusted dispatch identity. Diagnostics have no owner column and rely on exactly one allowed identity. Retention service access only deletes expired rows using server time. Do not widen access without revisiting these invariants.

Native TikTok caption retrieval uses bounded ordinary public requests without social cookies, redirects or media downloads. Other native-caption providers and independent Whisper remain unavailable at this baseline. Keep each output's provenance explicit.

Automatic diagnostic records exclude full links, video identifiers, creator details, extracted text, credentials and raw exceptions. The database cap is 10,000 rows, with 30-day logical expiry and physical cleanup on access and hourly housekeeping. Platform infrastructure logs are separate and have platform-controlled retention. Verify cleanup scheduling separately from code tests.

The Codespaces development-key flow is optional and has not been provisioned or tested as an actual forwarded Codespace. Never expose the research server publicly. Do not modify other GS projects.
