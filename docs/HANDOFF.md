# Pending retained-work paging, 28 October 2026

PEN-018 / issue #18, branch chatgpt/pen-retained-pages, based on main cc564637. Work resumed after the temporary workspace was reset; implementation checkpoints are now preserved in GitHub. Recent and Create can browse older summaries in pages of 50, with owner-scoped totals and validated cursors. History lists avoid loading full caption/post payloads. No migration, owner-guard change, retention change or Poster write is included. Candidate build: workspace_v03_sites_3.

Creator self-review and test scope: docs/REVIEW_PEN_018.md. Follow the owner's risk-based policy recorded in AGENTS.md; routine work does not automatically invoke Claude. Required checks and a reviewable pull request precede merge; publish once from final main and record the exact receipt. The installed Pen connector's owner read path succeeded on 26 October, superseding the version-11 read-path uncertainty below. No other GS repository was changed.

Version 11 remains live until a newer deployment receipt is recorded. Earlier notes below are historical.

---

# Current release: owner-private version 11

25 October 2026. #15 and #17 are merged, in order. Final main application commit 4a7d271af142a1d48affc994a9da4b42a178410a, tree 5029510bdafbd025b6d23ced233f952b652dd5a5, is deployed as private version 11. Read docs/DEPLOYMENT.md first for the exact receipt and verification limits. All 100 unit tests, 62 desktop/mobile checks, production build, lint and types pass; fresh hosted storage, draft persistence/reuse/export/deletion and private-access checks passed.

Automatic record deletion is paused in the running application and its schedule remains disabled. Bounded lists are display windows, not storage caps. Explicit owner deletion works for extractions, diagnostics and content jobs. Jobs hold independent source excerpts: deleting an extraction preserves separately saved jobs and the confirmation says so; deleting a job removes its own brief/excerpt/draft. No destructive assistant tool is exposed. C1 and the house-rule source comment are addressed; a second independent review of the corrective head was not claimed.

The Create workspace supports standalone ideas or saved extractions, compact briefs, structured-response validation/save/reopen, and unsent Poster-field export. No model client or paid calls run in Pen. Sites reports MCP ready and the generated Pen plugin installed, but its tools did not appear in this active chat. Next: in a fresh chat, use the installed Pen plugin for a read-only list_content_jobs call and verify identity forwarding. Never weaken authentication if that fails. Real second-account MCP rejection and external Claude compatibility remain separate checks. Poster is still being built by the owner: do not modify its repository or claim live delivery. No user manual browser test is required now.

Client/server build: workspace_v03_sites_2. Keep the Site owner-private. The sections below are historical preparation notes, superseded by this current release and the deployment ledger.

---

# Review corrections, 25 October 2026

Claude reviewed #15 at 09e8850 with no blockers; it merged to main as 53bb1980e4a0c22dd5cf7a8ac65e3b8f05276a76. #17 now targets main. Claude reviewed #17 at e667c49 and requested C1: explicit owner deletion for copied content-job sources. The correction adds DELETE /api/content/<id> with owner scoping and a confirmed Create control, without adding a destructive assistant tool. Deleting an extraction preserves separately saved jobs; its dialog now says those jobs keep their source excerpt/link until independently deleted. Deleting a job clears its brief, excerpt and draft, while preserving the original extraction and external/downloaded copies. Failed or cancelled deletion keeps the open work. The Poster validator is named as the house-rule source of truth.

Client/server build labels are workspace_v03_sites_2. Rerun all checks on the corrective head after retargeting. Publish only the final merged main tree, then replace pending release statements below with the actual receipt. Hosted identity/tool discovery and non-owner rejection must be recorded. Poster remains disconnected because its owner is still building it; no Poster source changes, draft writes or paid generation are in scope.

The following sections describe pre-release implementation history and are superseded by a later publication receipt when present.

---

# Pending content workflow, 25 October 2026

Issue #16, branch `chatgpt/pen-idea-to-draft`, stacked on #15. Read docs/IDEA_TO_DRAFT_PLAN.md for the implementation plan, cost split, interfaces and release gates. New Create workspace supports an idea or owner-scoped saved extraction; code handles brief preparation/deduplication, character budgets, job reuse, validation, storage and Poster payload formatting. The assistant performs the creative text pass through authenticated tools or the explicit copy/paste fallback. No model calls run in Pen.

New additive `content_jobs` migration and owner-only /mcp route require independent review. Tool responses avoid repeated source payloads; a saved draft is reused and writes return compact receipts. Source omissions are explicit. No diagnostics enter a creative prompt. No source content or real drafts are committed. Poster fields are exported as not_sent; no connected Poster tool was found and no live write was attempted. Do not claim full integration or Claude compatibility before separate hosted tests. Poster itself was not modified while the user works on it.

Merge and release only after #15 and this branch are reviewed; preserve Site identity/access. This branch declares the Sites mcp capability, which has not yet been published or connected. The existing live version 10 remains unchanged.

---

# Pending retention pause, 25 October 2026

Issue #14, branch `chatgpt/pen-retention-pause`. The user asked to stop record deletion for now. The daily cleanup automation `6adcf46e17b481919332f80387ddacfb` is paused. This branch also stops age-based deletion and diagnostic/history count pruning in the application. Existing legacy expiry timestamps are ignored on reads; new rows use a non-expiring sentinel for schema compatibility, and API history summaries report expiresAt null. Explicit owner deletion remains functional. No schema migration or bulk data deletion is required.

The latest 50 history items and 10,000 diagnostic events are bounded list windows, not retention caps. The browser keeps a bounded 1,000-event cache independently; the local research file retains records with a bounded response window. Older history remains readable by identifier; browsing/pagination beyond the latest-50 window is a separate follow-up.

Storage self-check verifies retention-pause behavior and explicit deletion using isolated fixture rows. Tests cover legacy-expired records across health/read/write paths, more than 50 extractions, more than 10,000 diagnostic rows, harmless housekeeping, owner isolation and explicit deletion. Build labels are `workspace_v02_sites_4`.

Do not claim the running Site has this behavior until this branch is independently reviewed, merged and deployed. The published version 10 described below still has normal-use expiry despite the paused scheduler. AGENTS.md requires reviewed merges. No changes to GS Poster are included because the user is working on that project separately.

The proposed next integration is Pen → assistant → Poster draft, with authenticated extraction tools and a shared content brief. Poster already has draft_post/update_draft and a separate owner approval page. Its current code handles Facebook text/images and does not render or upload reels. A ChatGPT Sites connector is supported by Sites; Claude authentication compatibility must be tested separately, not assumed. Do not add paid model calls or automatic publishing without the user's approval.

---

# Published version 10 historical handoff

# GS Pen current handoff
Updated 25 October 2026 after Claude's independent review.

Existing owner-private Site: https://gs-pen-test-lab.goofyspook.chatgpt.site. Project `appgprj_6adce46e22dc81918dab627af382c76a`. Preserve its identity, audience, database and source workflow. Current publication receipts and verification limits are in docs/DEPLOYMENT.md.

Pull requests #7, #9, #11 and #13 are merged into main in that order after retargeting and fresh checks. Main application commit is `8a406c758a3f75a54782425e3eabd226de25c8a5`; its exact tree was published owner-private as version 10. The post-publication documentation commit records the receipt without changing application code. Final main passed 89 unit tests, 48 desktop/mobile browser checks, Sites build, lint and types. Fresh hosted access, disposable database checks, service rejection/retention and both live TikTok examples passed. See docs/DEPLOYMENT.md for exact source, version and run identifiers.

Claude's independent combined review is on #7, comment 6393655281. Required corrections are complete and were self-reviewed against the independent report; a second review of the corrective heads is not claimed. This describes the version 10 release. The cleanup task was subsequently paused at the user’s request; see the pending change above.

## Current functionality

- TikTok: native timed captions, post text/hashtags and public metadata. Caption tracks and content are scoped to the exact requested video item, excluding recommendations and mismatched identifiers.
- Facebook: public-preview post text, creator and available metadata. Preview text can be shortened. Native Facebook captions, YouTube/Instagram retrieval, independent Whisper and frame-text recognition remain unavailable.
- Orange Extract/Recent/Diagnostics workspace. Owner-scoped content history retains records until explicit deletion and displays the latest 50; search/reopen/delete, tab copy and text/structured exports are implemented. Delayed history responses cannot overwrite a new extraction or a later history selection.
- Copy-all assistant handoffs preserve every available output, timestamps, source, provenance and availability warnings, excluding diagnostics. Clipboard writing starts before fixed website launch. Popup/clipboard failures are explicit. The optional Claude desktop link has exact 12,000-prompt/24,000-encoded-character bounds; native app delivery remains unverified. Nothing is submitted automatically.

## Runtime and verification

`npm run start:local` runs the loopback research server on port 4173; `npm start` runs the built Sites worker through Wrangler. Never expose the Node research server publicly. The optional Codespaces flow remains unverified in an actual forwarded Codespace.

Use `npm run install:ci`, `npm run check`, `npm run build`, `npm run lint`, `pnpm exec tsc --noEmit` and `npm run test:e2e`. Dependencies are frozen with pnpm 11.25.0; installation must not rewrite tracked policy. Automated checks cover every pull request, retarget and main push, including hosted builds and types. Generated browser reports are excluded from lint.

Browser acceptance uses synthetic provider fixtures against the loopback server. Hosted authentication, database, provider access and infrastructure behavior require separate checks. This container lacks the matching local Chromium executable; GitHub installs and runs the matching browser. Report actual counts and runs from the deployment ledger, not historical claims.

## Security and retention

Both configured owner email and Site-specific identifier must match trusted dispatch identity. The identifier is a secret runtime setting, not the account identifier from the sharing policy. Derive it only from trusted existing owner data. Diagnostics have no owner column and depend on exactly one permitted owner; add row ownership before widening access.

History contains canonical source links and extracted content in a separate store. Diagnostics exclude content, identifiers, credentials and arbitrary errors. Automatic expiry/count pruning is paused; the latest 10,000 is a response window, not a storage cap. The originally hourly automation `6adcf46e17b481919332f80387ddacfb` was subsequently changed to daily and paused on 25 October 2026. No scheduled physical deletion is active. The legacy service-only retention endpoint exposes no records, never touches stored rows and reports retentionPaused true behind the owner-private dispatcher.

Sites infrastructure metadata has independent platform retention. The application cannot promise 30-day control of those logs. A second real signed-in account and native Claude delivery remain separate verification gaps. Use isolated disposable records for storage checks, never clear the user's data.

Next features are Google Drive saving, then optional Asana task creation. The latter needs a durable content reference that outlives Pen history. Neither integration is implemented. See BACKLOG.md for provider reliability, independent speech and other deferred work. Do not modify other GS projects.
