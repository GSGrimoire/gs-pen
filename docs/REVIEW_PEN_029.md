# PEN-029 manual source fallback, creator self-review

3 November 2026. Issue #36. Prepared as a **draft** feature candidate following the owner's request to continue GS Pen usability development before the next private Site release. **This document is not an independent privacy/security review and does not authorize a Site deployment.**

## User experience and intended behavior

A provider can deny native caption retrieval even for a public video. Create presently accepts a short original idea and optionally an existing privately saved extraction, but no separate user-provided source text. PEN-029 adds an optional input for notes or licensed/permitted excerpts in Create, separate from the creative angle.

- User-provided content is labeled **not verified by Pen and not a Pen-verified transcript**. The interface does not say a video was watched, audio was heard, or missing captions were recovered.
- The user may type/paste a maximum of **8,000 UTF-16 code units**. A counter displays how many Unicode characters will be selected, using the existing 2,000 / 4,000 / 8,000 character source budget. A shortened source is labeled before and after preparing the brief.
- Source text is never uploaded on keystroke. It is submitted only with the existing owner-initiated **Prepare brief** action. The server trims it, rejects invalid types and oversized values, and retains **only the selected excerpt** in the owner-private content job, not the unselected tail.
- Saved extraction and pasted source are mutually exclusive on the server. In Create, a selected extraction disables the pasted-source field and explicitly says that any pasted text is excluded. The user may select Clear source to reset both source types while retaining the idea and constraints.
- Opening a job created from pasted text restores **only its saved excerpt**, with the same unverified provenance. The full original pasted text is not recoverable from Pen if it was shortened.
- The existing job's explicit deletion action removes its source excerpt and creative draft. This does **not** delete previously downloaded or separately shared copies. No automatic expiry or count pruning is reactivated.

## Technical boundaries

- `src/content-workflow.mjs`: a strict `sourceText` input with a maximum of 8,000 code units and an explicit `CONTENT_SOURCE_CONFLICT` code. `createBrief` identifies the kind as `user_supplied_text`, records only owner-supplied / unverified provenance and selects a bounded excerpt. The source is quoted as untrusted data in the creative prompt, never instructions.
- `server/content-service.mjs`: existing owner-authenticated content-job storage and connected tool gain the optional bounded field, with no new data table or schema migration. The existing `readContentJson` 32,768-byte body limit, owner identity checks, origin checks and deletion gates remain unchanged.
- `web/content-workflow.mjs`, `web/index.html`, `web/styles.css`: clear entry form, privacy disclosure, selection count, distinct source types, clear action and mobile/keyboard styling.
- Unit and simulated-site tests verify character limits, provenance, exact-source exclusivity, absence of unselected content in stored jobs, owner isolation, unauthorized access denial and explicit deletion. Browser fixtures verify no upload while typing and that only explicitly selected source content is submitted.
- No new provider, audio/media retrieval, transcription model, file upload, proxy, authentication path, social publication, GS Poster write, paid model call or automatic retry is added.

## Privacy/security risk and required independent gate

This change **expands what private user-supplied content can be stored** in `content_jobs` and made available to the explicitly connected owner assistant tools. It therefore requires an **independent privacy/security review before merge or deployment** under `AGENTS.md`. Creator self-review plus green synthetic tests are necessary but not sufficient.

Reviewers must inspect: authorization of both the browser endpoint and connector tool, absence of source content in application diagnostics, no raw input reflection in errors, UTF-8 request-size limits, bounded storage and excerpt truncation, job deduplication behavior, owner-scoped reads and deletion, saved-source exclusivity, trust boundaries in the creative prompt, and disclosure of the stored excerpt. A reviewer should also check that the new feature is not mistakenly included in tomorrow's already approved private release.

## Verification record

GitHub unit, hosted and desktop/mobile workflow outcomes must be recorded on the final pull-request commit after they complete. These synthetic tests do **not** establish any real-world provider compatibility or privacy of infrastructure-level request logging.

**Release decision:** keep PEN-029 on a separate draft pull request. Do not merge it to `main` or include it in the existing PEN-025 (#27) release until the independent risk review and a separately approved release choice are complete.
