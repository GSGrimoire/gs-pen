# PEN-028 native SubRip subtitle export, creator self-review

3 November 2026. Issue #34. Routine, source-local export capability. This is **not** an audio transcription service and does not modify Site publication or provider retrieval.

## User benefit

The Extract workspace already presents original timed caption cues and supports text/structured export. It did not offer a standard SubRip subtitle download to use in offline media editors. A new action offers `gs-pen-native-captions.srt` from already retrieved platform cues.

## Implementation and data-integrity review

- `src/extraction-export.mjs` contains a pure `exportSubRip` helper. It accepts only `ok:true` with a bounded nonempty cue array and genuine, syntactically valid start and end times in the existing WebVTT formats. It enforces end greater than start and rejects any invalid, empty or incomplete cue rather than inventing times or silently emitting a partial file.
- The function generates numbered cue blocks, converts milliseconds to SubRip comma timestamps, and uses consistent carriage-return/line-feed formatting. It preserves source text and order.
- The new Extract toolbar button is disabled unless that complete subtitle output is possible. The label says **native captions**, not independently transcribed audio. On explicit click only, the browser creates a local text download; existing text, structured and assistant exports remain unchanged.
- The helper does not include diagnostic events, server exceptions, signed asset URLs or additional fields. Native caption content appears in the requested downloaded file, which the user owns and controls, not in application diagnostics.

## Security and privacy

Only existing client and pure export files change: `src/extraction-export.mjs`, `web/app.mjs`, `web/index.html`, `web/styles.css`, and synthetic unit/browser tests. No provider fetch, cookies, media download, capture, server/API, Site worker, authentication, owner policy, data-retention, migration, external service, model calls, new storage or social publishing changes. Browser download still requires an explicit click.

## Verification and release limits

- Unit tests: correct native cue times and order, multi-line text and line endings, refusal for missing/reversed/invalid timestamps, no post-only export, no logging fields in SubRip.
- Desktop/mobile browser checks: enabled on a fixture with complete timed cues, exact `.srt` download and contents; disabled on provider-blocked and post-only partial responses.
- Required CI must pass on final PR head before merge. This is creator self-review, not independent provider-rights verification.
- No Site update or real provider test occurs in this change. PEN-025 (#27) retains the actual private deployment/acceptance gate. If it risks the 4 November release, exclude this independent increment and keep it for a later reviewed update.
