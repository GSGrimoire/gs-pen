# PEN-027 result and recovery experience, creator self-review

3 November 2026. Issue #32. This is a narrowly scoped owner-private user-interface improvement prepared before the next Site release. It is **not** a Site deployment or a real provider verification.

## Current user problem and proposed behavior

PEN-026 provides fixed and privacy-safe recovery text, but the user must discover the existing Create workspace manually after a partial or failed extraction. The current availability pills also lack visible available/unavailable differentiation.

This change adds a compact next-step panel beneath the existing extraction summary, with readable headings and a single button. Availability is communicated in words and colors, including explicit non-availability of independent Whisper transcription. The existing PEN-026 guidance is reused verbatim, and the card is hidden whenever native caption extraction succeeds.

The button uses the existing `contentWorkspace.useExtraction` method **only when the current result has a saved extraction ID and useful content**. Otherwise it navigates to Create without assigning an unsaved source, issuing any content write, or silently discarding the current creative form state. The UI explicitly warns to review any previously selected Create source in that case. The source note distinguishes a truly saved extraction from content that must be copied/exported manually.

## Risk and security review

- Only `web/index.html`, `web/app.mjs`, `web/styles.css` and synthetic desktop/mobile tests change.
- No server, Site worker, provider adapter, database, schema, migration, identity, retention, diagnostics, third-party app or GS Poster service change.
- No new provider request, automatic retry, model invocation, content-job creation, social-media write or paid process.
- The card displays only fixed status strings, never raw provider errors, URLs, arbitrary source text, creator names or credentials. Existing extracted content stays in its established output tabs and privately scoped history.
- Source attachment uses the already owner-scoped saved-content mechanism. Unsaved failures do not unexpectedly attach a previous video. The existing Create form remains under user control.
- Styling uses the established orange/neutral palette, textual labels in addition to color, visible keyboard focus and a 44-pixel action. Desktop/mobile assertions include no page overflow on failure and source navigation. Reduced-motion behavior remains covered by existing CSS.

## Tests and release boundaries

Acceptance cases: no panel on success, blocked request opens Create with no saved source, partial public Facebook preview is not described as a transcript, and a saved partial extraction is passed by ID only. Unit, hosted build/lint/types and desktop/mobile browser acceptance must be green on the final PR head before merging.

This is documented creator self-review, **not independent verification**. Under `AGENTS.md`, an authentication/publication boundary change would require independent review. No such change is in scope. The actual owner-private Site update and real provider tests remain gated by issue #27; no live deployment, stored records or user permissions are touched by this PR.
