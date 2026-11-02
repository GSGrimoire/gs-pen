# PEN-026 creator self-review, 2 November 2026

## Reason and scope
Users seeing an extraction failure or a partial Facebook public preview need a concrete next action, not just a technical error code. This increment supplies deterministic recovery advice inside Extract. It makes no new promise to retrieve native Facebook captions, independent speech transcripts, arbitrary video audio or unsupported platforms.

Issue: #28. Separate pending-release issue: #27. Keep the changes isolated and reviewable.

## Design and safety review
- `src/recovery-guidance.mjs` maps fixed known failure codes to bounded, actionable text. It never interpolates a source URL, post body, creator, platform token, raw exception or arbitrary server code into advice.
- Missing native captions are distinguished from missing speech. Partial public post text or metadata is labeled as useful but **not a transcript**; preview text may be shortened. Work from your own permitted notes in the existing Create workspace is offered, without claiming file upload or audio speech recognition support.
- Authentication denials retain the owner-only policy, unsupported redirect targets remain rejected, and provider blocks do not trigger bypass or retries.
- The guidance is display-only. It does not change server fetches, redirect bounds, diagnostics, owner identity, retention, saved history, provider access, content-job writes, model costs, Site publication or GS Poster.
- `scripts/build-site.mjs` and `scripts/prepare-site.mjs` copy the same pure helper for local research and hosted previews.
- Tests use only fabricated result codes and synthetic content. No real URLs, transcript data, cookies or secrets are stored in tests.

## Acceptance verification
- Unit tests exercise success, provider block, short-link failures, partial public-preview provenance, metadata-only cases, unsafe input non-reflection and rate-limit/backend/response-size messaging.
- Browser assertions on desktop and mobile fixtures cover blocked, partial and successful result states.
- Run `npm run check`, `npm run build`, `npm run lint`, `pnpm exec tsc --noEmit` and `npm run test:e2e` on the final pull-request head. The GitHub workflow results are pending at creation of this review record; do not claim they have passed before checking them.

## Release limits
No Sites source synchronization, save, deployment or hosted provider probe is performed by this pull request. It must not be merged until required checks and risk-based review are complete. Private deployment and real sample verification belong to issue #27, preserving the existing Site project and owner-only audience.
