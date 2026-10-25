# GS Pen current handoff
Updated 25 October 2026 after Claude's independent review.

Existing owner-private Site: https://gs-pen-test-lab.goofyspook.chatgpt.site. Project `appgprj_6adce46e22dc81918dab627af382c76a`. Preserve its identity, audience, database and source workflow. Current publication receipts and verification limits are in docs/DEPLOYMENT.md.

The authorized correction and merge sequence is #7, #9, #11, #13, each retargeted to main and rechecked. Claude's independent combined review is on #7, comment 6393655281. Corrective code is self-reviewed against that report. Deploy only the verified merged main tree after the last merge, then record its exact GitHub and Sites provenance. Do not count older reviews as new-head approval.

## Current functionality

- TikTok: native timed captions, post text/hashtags and public metadata. Caption tracks and content are scoped to the exact requested video item, excluding recommendations and mismatched identifiers.
- Facebook: public-preview post text, creator and available metadata. Preview text can be shortened. Native Facebook captions, YouTube/Instagram retrieval, independent Whisper and frame-text recognition remain unavailable.
- Orange Extract/Recent/Diagnostics workspace. Owner-scoped content history retains the latest 50 results for 30 days; search/reopen/delete, tab copy and text/structured exports are implemented. Delayed history responses cannot overwrite a new extraction or a later history selection.
- Copy-all assistant handoffs preserve every available output, timestamps, source, provenance and availability warnings, excluding diagnostics. Clipboard writing starts before fixed website launch. Popup/clipboard failures are explicit. The optional Claude desktop link has exact 12,000-prompt/24,000-encoded-character bounds; native app delivery remains unverified. Nothing is submitted automatically.

## Runtime and verification

`npm run start:local` runs the loopback research server on port 4173; `npm start` runs the built Sites worker through Wrangler. Never expose the Node research server publicly. The optional Codespaces flow remains unverified in an actual forwarded Codespace.

Use `npm run install:ci`, `npm run check`, `npm run build`, `npm run lint`, `pnpm exec tsc --noEmit` and `npm run test:e2e`. Dependencies are frozen with pnpm 11.25.0; installation must not rewrite tracked policy. Automated checks cover every pull request, retarget and main push, including hosted builds and types. Generated browser reports are excluded from lint.

Browser acceptance uses synthetic provider fixtures against the loopback server. Hosted authentication, database, provider access and infrastructure behavior require separate checks. This container lacks the matching local Chromium executable; GitHub installs and runs the matching browser. Report actual counts and runs from the deployment ledger, not historical claims.

## Security and retention

Both configured owner email and Site-specific identifier must match trusted dispatch identity. The identifier is a secret runtime setting, not the account identifier from the sharing policy. Derive it only from trusted existing owner data. Diagnostics have no owner column and depend on exactly one permitted owner; add row ownership before widening access.

History contains canonical source links and extracted content in a separate store. Diagnostics exclude content, identifiers, credentials and arbitrary errors, have a 10,000-record cap and 30-day expiry. Existing hourly automation `6adcf46e17b481919332f80387ddacfb` remains enabled; last run was observed on 25 October 2026. Physical removal can lag until the next successful hourly run. The service-only retention endpoint exposes no records and deletes only already expired rows using server time, behind the owner-private dispatcher.

Sites infrastructure metadata has independent platform retention. The application cannot promise 30-day control of those logs. A second real signed-in account and native Claude delivery remain separate verification gaps. Use isolated disposable records for storage checks, never clear the user's data.

Next features are Google Drive saving, then optional Asana task creation. The latter needs a durable content reference that outlives Pen history. Neither integration is implemented. See BACKLOG.md for provider reliability, independent speech and other deferred work. Do not modify other GS projects.
