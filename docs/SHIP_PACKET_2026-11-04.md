# GS Pen: execution-ready private Site publication packet

**Prepared:** 3 November 2026 for a possible authorized implementation run on 4 November 2026, Europe/Copenhagen.

**Important:** This packet is preparation, **not** proof of a newer saved Site version, successful private deployment, infrastructure authentication, or successful real-world provider extraction. The publish action is reserved for an authorized maintainer of the **existing** ChatGPT Site. Do not create a second public Site, expose the local development server or use release credits before the approved run.

- Release gate and acceptance ledger: issue https://github.com/GSGrimoire/gs-pen/issues/27
- Existing private Site: https://gs-pen-test-lab.goofyspook.chatgpt.site
- Existing project ID: `appgprj_6adce46e22dc81918dab627af382c76a`
- Last **documented** live Site: version 11, published 25 October 2026, application commit `4a7d271af142a1d48affc994a9da4b42a178410a`, tree `5029510bdafbd025b6d23ced233f952b652dd5a5`, deployment `appgdep_6addf0d9991081919e6026f4eb2ecff7`
- Last code merge candidate: `db560e62da95d47798fdcd469a9064cade5ba52c` (PEN-029 merge, 3 November 2026), Git tree `451c09102d031ba9e0cc81871d7e39c008108638`. The earlier candidate `d6f99b98ab342bb4fb9ac791dcc91fff528f8b08` is superseded. **Re-read GitHub `main` and its tree immediately before publishing.** Later documentation-only commits may change Git SHA/tree without changing application bytes.
- Review `docs/RELEASE_READINESS_2026-11-04.md` and `docs/DEPLOYMENT.md` as the source of deployment controls and existing receipts.

## A. Exactly what is in the candidate

The current GitHub `main` includes all previously merged reliability and source handling increments, plus:

| Capability | Pull request / approval status | Product acceptance |
| --- | --- | --- |
| Saved extraction and content-job paging | #19, merged | Revisit beyond 50 records without deleting or truncating old data |
| TikTok `vm` / `vt` bounded share resolution | #21, merged | Report final canonical target or a truthful resolution failure |
| Facebook public video/reel/share resolution | #24, merged | Only safe bounded redirect paths; preview text distinct from speech |
| Facebook ordinary post shares | #26, merged | Page preview may be truncated, not a verified transcript |
| Fixed failure/partial recovery guidance | #29, merged | Helpful safe next action without source data in diagnostics |
| Clear source availability and recovery-to-Create | #33, merged | Distinguish saved/unsaved source; no silent third-party writes |
| SubRip native-caption export | #35, merged | Only actual native timed cues, never inferred timestamps |
| Extract beside right navigation + history, mobile 75%-width drawer | #39, merged as `4a6a274279707b3666161483c58aab42e311bfd7` | Side by side desktop; on mobile dismiss via `>`, scrim, Escape and navigation, focus returns correctly |
| Transparent creative-generation and cost disclosure | #41, merged as `d6f99b98ab342bb4fb9ac791dcc91fff528f8b08` | Pen prepares briefs with code, zero Pen model-generation calls; a selected assistant's account covers creative pass |

| Explicit private manual-source text in Create (PEN-029) | #37, merged as `db560e62da95d47798fdcd469a9064cade5ba52c` after independent Claude privacy/security review on head `6706912` (no blockers); owner approved inclusion in chat, 3 November 2026 | Pasted text is sent only on Prepare brief; only the budget-selected excerpt is stored; labelled not verified by Pen; mutually exclusive with a saved extraction; job delete removes it |

**Not included:** future audio transcription, full-history search and direct GS Poster writes/publishing.

The GitHub compare against the last documented live application includes source and test changes across 51 files, including changes to server extraction/share, paging, UI and tests. No migration, owner-secret configuration or deployment security configuration files appear in that comparison, but **that is not proof** of hosted identity, data isolation or correct database bindings. Verify these on the actual owner-private Site.

## B. Preflight before spending a Site credit

1. Confirm the existing project's owner-private sharing remains restricted to the one approved owner. Check both existing server-side trusted identity settings without displaying values, changing secrets or accepting client-provided identity.
2. Confirm Site project ID, database binding, original records, and paused automatic expiry and count pruning. Ensure the scheduled cleanup remains disabled. **No destructive migration, cleanup, data reset or origin recreation.**
3. Compare the current GitHub `main` SHA/tree to the source revision selected for the build. Check that PR #37 is present as `db560e6` and that no PR with failing/pending review has entered `main`.
4. Confirm successful unit, hosted production build, lint, type and desktop/mobile browser workflows on the **final main**. Capture the workflow URLs, actual test counts and final conclusions. A green PR alone is not the final-main check.
5. Confirm the planned artifact's source tree or file manifest matches approved source and record its exact package digest before any live deployment. Do not accept an unverified directory zip as an exact build.
6. Confirm the Site interface provides a genuine route to the last documented working version 11 or an equivalent rollback method. If no rollback exists, explicitly record that limitation and seek owner acceptance before publishing.

## C. The only authorized publication step

Using the existing, authenticated Site project maintenance interface:

1. Open the **existing private GS Pen Site**, not a new Site or another GS project.
2. Inspect the current saved version, access policy, secrets, database binding and storage before selecting source.
3. Synchronize **only the final approved `main` source**. Build and inspect the resulting package/manifest. Keep existing roles and retention unchanged.
4. Save and deploy once, **privately**. Capture the actual saved-version ID, deployment ID and returned state. A successful save is not the same as a successful deploy.
5. Avoid external real-provider tests until the Site owner identity and storage gates have passed; do not log real sample source links or extracted content in GitHub.
6. Do not trigger a paid language model, GS Poster creation/publishing, media download or third-party data submission during deployment smoke tests.

If a tool required for exact Site sync/deploy or source-tree verification is unavailable, stop at the GitHub-ready state. Do not claim publication.

## D. Hosted acceptance after private deployment

| Category | Action | Required evidence / pass |
| --- | --- | --- |
| Private access | Open the root and all four workspaces as owner | UI works and existing records remain available |
| Denied access | Anonymous, other-owner, forged headers, service-only identity; content/history/diagnostics/tool paths | No private content escapes, no identity spoofing succeeds |
| Storage | Use disposable synthetic owner records only for write/open/delete | Owner-scoped data, older record retention, deletion by explicit action |
| Paging | Load older Recent and Create pages past 50 | No silent cap, ordering stable, failed load preserves already loaded pages |
| Extract | Authorized real canonical TikTok and `vm`/`vt` links | Real provider outcome reported; no invented captions or misleading availability |
| Extract | Authorized Facebook reel/video/ordinary share shapes | Bounded redirects, preview provenance, missing caption disclosure |
| Failure | Blocked, missing, unsafe redirect, rate-limit | Clear fixed recovery guidance; no raw source data in diagnostics |
| Results | Native timed captions | Correct tabs and genuine, user-initiated `.srt` export; blocked/partial sources cannot export invented captions |
| Desktop | Wide viewport | Extract to left; navigation plus saved-history shortcuts to right; saved preview reopens its source |
| Mobile | Narrow viewport | Menu / History trigger opens about 75%-width right overlay; `>`, outside click, Escape and navigation close it; focus/scroll restore and input retained |
| Create | Owner with synthetic idea/source and draft | Brief created by code, no hidden model requests, prompt externally handled, draft validated/saved |
| Manual source | Synthetic pasted text longer than the budget, then Prepare brief, reopen and delete | No network write while typing; only the selected excerpt reopens; not-verified label shown; delete removes it; nothing enters Diagnostics |
| Cost | Inspect Create disclosure | Explicit selected-assistant account billing; Pen's server model calls remain zero |
| Connector | Owner read-only list/get when authorized | Correct owner scope; empty response alone is insufficient proof of integration |
| Poster | Inspect export from test draft only | `submissionStatus: not_sent`; no action in GS Poster |

Use owner-approved, rights-appropriate **real links outside the repository** for provider acceptance. Record only broad status, dates, coarse coverage and failure categories. A synthetic browser pass cannot prove real TikTok or Facebook availability.

## E. Stop/restore conditions

Do not keep a new release live if any of the following occurs: unexpected public access; missing/changed trusted owner identity; data loss or reactivated automatic cleanup; wrong Site project/database binding; source/package mismatch; basic owner-only read/write failure; a new unintended provider/model/Poster write path; or a blank/error app under ordinary owner use.

If version 11 restore is actually supported, use the previously verified private artifact/version and recheck owner access and retained records. If rollback is unsupported, stop and record the blocker rather than promising one. Don't delete production records to repair a UI error.

## F. Blank execution receipt, to complete only from actual tools

| Field | Actual value |
| --- | --- |
| Release run date/time and maintainer | **not executed** |
| Final GitHub `main` SHA / Git tree | **re-check before action** |
| Final main unit/hosted/browser workflow URLs and conclusions | **capture from completed runs** |
| Site source tree verified against approved source | **not verified** |
| Site package SHA-256 / byte count | **not built or verified** |
| Previous Site version restore available | **not verified for this run** |
| Saved Site version ID | **not created** |
| Deployment ID and success state | **not created** |
| Owner, anonymous, forged and cross-owner access | **not yet checked for new release** |
| Existing record, pagination, retention and delete results | **not yet checked for new release** |
| Native captions, Facebook partials and safe share resolution | **not yet checked for new release** |
| Desktop/mobile drawer and brief-only cost wording | **not yet checked on Site** |
| SubRip, no-model and no-Poster-write outcomes | **not yet checked on Site** |
| Final go/no-go and any rollback receipt | **pending real hosted acceptance** |

This packet intentionally contains **no secrets, owner identifiers, real provider links, user-supplied source text, private media or model-generated drafts**.
