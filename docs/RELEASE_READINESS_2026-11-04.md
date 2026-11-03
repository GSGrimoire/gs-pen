# PEN-025: private Site release readiness, 4 November 2026

**Preparation only. No Site deployment, saved version or provider verification is asserted by this document.** The owner has deferred Site publication until weekly credits reset. Use the existing project and owner-private policy. Issue: #27.

## 1. Verified baseline and release selection

| Item | Value or status |
| --- | --- |
| Existing Site | `https://gs-pen-test-lab.goofyspook.chatgpt.site` |
| Existing project | `appgprj_6adce46e22dc81918dab627af382c76a` |
| Last documented live version | **11**, published 25 October 2026 |
| Last documented live application commit/tree | `4a7d271af142a1d48affc994a9da4b42a178410a` / `5029510bdafbd025b6d23ced233f952b652dd5a5` |
| Last documented deployment | `appgdep_6addf0d9991081919e6026f4eb2ecff7` |
| PEN-018 paging | merged PR #19; GitHub code **not documented live** |
| PEN-020 TikTok links | merged PR #21; **not documented live** |
| PEN-023 Facebook video/reel shares | merged PR #24; **not documented live** |
| PEN-024 Facebook ordinary post shares | merged PR #26, application merge commit `2a5fb303a83f232d04a6e1ff5a8532876187abca`, tree `03b45dca5f89670184e6d50f27dc93dce7b04654`; **not documented live** |
| Current `main` when this plan was prepared | `c99b0a33f1e23ae229843654fcd2505115bd0434` (later documentation-only commits after PEN-024) |
| PEN-026 recovery guidance | PR #29, unmerged at planning time; **must not be included unless approved, green and merged** |
| Pen connector evidence | owner-authenticated `list_content_jobs` returned `{"jobs":[]}`; proves only this read operation, not deployment version or provider access |

**Release selection gate:** Re-read `main`, current PR states and required workflow conclusions immediately before packaging. Record the exact SHA and Git tree selected for publication. Do not use the old values above as a substitute for checking the actual approved HEAD. Never mix a draft branch with `main` or stage unreviewed code. Documentation-only commits can advance the commit SHA without changing application behavior; document that explicitly.

## 2. Preflight, before any Site action

- [ ] Required tests pass on the final approved source: `npm run install:ci`, `npm run check`, `npm run build`, `npm run lint`, `pnpm exec tsc --noEmit`, `npm run test:e2e`. Prefer completed GitHub workflow evidence for the browser when running Chromium locally is unavailable. Record exact run URLs and test counts; a cancelled workflow is **not** a pass.
- [ ] Complete the risk-based PR review for any change to be included, especially #29. Independent review is required if a change touches authentication, owner policy, secrets, destructive migrations, Site security or shared critical infrastructure. Do not merge a failing or unreviewed PR.
- [ ] Confirm the approved application tree and the deployment's Sites source tree match. Preserve file modes and avoid injecting generated, untracked or personal files.
- [ ] Verify existing project identifier, owner-only Site sharing (one allowed user), both configured trusted owner identifiers, and unchanged database binding. Do not print or copy secret values to GitHub, logs or assistant messages.
- [ ] Retention remains paused; no automatic expiration/count pruning or cleanup schedule reactivation. Keep existing saved content and content jobs intact. A production migration, if actually required, needs separate review and a non-destructive plan.
- [ ] Confirm no GS Poster code or publishing endpoints are being changed. Pen exports only an **unsent** draft. No new model service, billed generation, cookies, media download, unrestricted redirects or cross-project modifications.
- [ ] Have a return path to the last documented good private version 11. Check the Sites interface actually supports selecting/restoring that version before promising a rollback; if not, stop and record the limitation.

## 3. One controlled private publication

This step requires an authorized **ChatGPT Sites maintainer** with source/save/deploy tools. GitHub Actions and the local Node research server cannot publish to Sites.

1. Open the **existing** owner-private project, not a replacement Site. Compare its current source and settings against the published-version receipt in `docs/DEPLOYMENT.md`.
2. Synchronize the **exact approved application tree** from `main`. Build/package with the existing Sites process. Do not widen sharing, change dispatcher identity, introduce plaintext owner credentials or alter unrelated projects.
3. Before committing a live release, record the exact source tree and package checksum. If these cannot be verified, do not claim equivalence to the reviewed GitHub tree.
4. Save/deploy privately only after the preflight gates. Record returned saved-version and deployment identifiers and actual status. A successful save is not necessarily a successful deployment.
5. On failure, preserve the previous working private Site; do not toggle off authentication or fall back to a public/local host.

## 4. Hosted acceptance matrix, after publication

**Use synthetic disposable data for storage tests. Real provider samples require owner permission and rights-appropriate links held outside source code, issues, prompts and diagnostic records.** Do not paste actual links or extracted words into the release ledger. Record coarse status counts, error categories, latency and the trace identifier only when its sanitization is verified.

| Gate | Test | Pass condition |
| --- | --- | --- |
| Owner | Signed-in owner opens Extract, Recent, Create and Diagnostics | Authenticated private UI works without new access prompts or loss of saved items |
| Denial | Anonymous root, content, diagnostics, tool and model-context requests | Rejected at the trusted boundary, typically 401; do not expose data |
| Denial | Service-only and forged visitor headers | Rejected at the trusted boundary (401/403 according to route); never trust client-supplied identity |
| Storage | Create, retrieve, reopen, delete a disposable extraction/job | Records isolated to owner, explicit deletion only, existing records unchanged |
| Retention | Read legacy-aged disposable data; inspect no-op retention path | No automatic age/count deletion; paused cleanup remains paused |
| Link formats | Public canonical TikTok video; `vm` or `vt` share | Appropriate permitted source resolved, provider availability reported honestly |
| Link formats | Facebook direct video/reel, `fb.watch` or `share/r` | Safe limited redirects; available public post data distinguished from captions |
| Link formats | Facebook ordinary `share/p` and generic `share/<token>`; direct posts/story/photo | Supported shape recognized and safe same-platform canonical resolution; unavailable public data reported without fabrication |
| Negative | Incomplete `/share/p/`, unsupported/foreign/insecure/credentialed redirects | Rejected without fetching unsafe destination |
| Output | Actual native caption track | Timed platform cues labeled **native captions**, not independent transcription |
| Partial | Public post text or metadata but no caption | Useful partial output preserved; Facebook preview may be truncated; no fabricated speech text |
| Failure | Provider block, missing caption, timeout, rate-limit, offline backend | Distinct truthful codes and safe recovery suggestions when PEN-026 is included |
| Assistant | Owner-authenticated Pen read-only list/get when available | No cross-owner access; do not treat empty list as proof of full integration |
| Poster | Inspect export for approved Facebook draft | `submissionStatus: not_sent`; no automatic draft write or social publication |

**Stop conditions:** security/owner access regression, content loss, unexpected retention deletion, arbitrary redirect followed, new external publishing write, unresolved source tree mismatch, unexplained storage failure, or missing deployment receipt. Do not call the release complete if any mandatory gate fails.

## 5. Publication receipt to add only after verification

Copy this template into a new top section in `docs/DEPLOYMENT.md` once evidence exists. Do not replace historical receipts or fill unknown values with guesses.

```text
# Private Site release, 4 November 2026 (status: pending until actually verified)
Approved GitHub application commit: [actual SHA]
Approved GitHub application tree: [actual tree SHA]
GitHub final unit/hosted/browser runs: [exact URLs, counts and conclusions]
Reviewed pull requests included: [exact numbers/heads]
Site source commit and exact tree: [verified values]
Package checksum and build identifier: [actual digest/identifier]
Existing project: appgprj_6adce46e22dc81918dab627af382c76a
Saved Site version: [actual version returned by Sites]
Deployment identifier/status/time: [actual receipt]
Owner-only sharing and trusted identity: [verified without printing secret values]
Old records and retention pause: [verified]
Anonymous, service-only and forged-identity rejection: [results]
TikTok public canonical/share; Facebook direct/share/post: [counts and safe categories only]
Partial outputs and provenance: [verified / limitation]
Assistant tool read path: [verified / limitation]
GS Poster: [not sent or separate verified receipt]
Outstanding concerns, failure or rollback: [facts]
```

## 6. What this does *not* prove

Passing 149 synthetic unit tests or the desktop/mobile browser suite does not demonstrate provider permission, universal extraction reliability, independent Whisper transcription, real Facebook caption access, full-text search, automatic Poster delivery or successful live Site publication. Do not request restricted content, acquire platform cookies, evade blocks, or log sensitive source media. Keep actual sample links and content out of the repository and automatic diagnostics.

## References

- `AGENTS.md`
- `docs/SITES_DEPLOYMENT_HANDOFF.md`
- `docs/DEPLOYMENT.md`
- `docs/DIAGNOSTICS.md`
- `docs/REVIEW_PEN_024.md`
- Issue #27 (PEN-025), issue #28 (PEN-026), PR #29
