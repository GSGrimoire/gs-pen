# PEN-029 independent privacy/security review packet

Prepared 3 November 2026 for a separate reviewer. Feature pull request: https://github.com/GSGrimoire/gs-pen/pull/37. Issue: #36.

**Not a security approval.** This document is a reviewer work order and an evidence inventory. Independent approval on the exact final commit is required by `AGENTS.md` before a GitHub merge, any private Site source sync, or a live user test with manually supplied private text.

## Scope and boundaries

This change allows an owner to include **one optional, manually supplied text excerpt** in a deterministic creative brief. It is an alternative to `extractionId`, not an addition. It does not make video captions or independent transcription available. It does not call a language model or send a draft to GS Poster.

Request path: `web/content-workflow.mjs` Create form -> `POST /api/content` -> `server/site-service.mjs` existing dispatch owner authorization -> `server/content-service.mjs` `readContentJson` and `createContentJob` -> `src/content-workflow.mjs` `contentInput` and `createBrief` -> existing `content_jobs` table.

Alternative tool path: authenticated `/mcp` `create_content_job` -> the same `contentInput` and `createBrief`, with the expanded `CONTENT_TOOLS` schema. Read path `get_content_brief` exposes the retained excerpt to the authenticated owner assistant as an explicitly requested creative prompt.

## Data inventory and retention claim to verify

| Data | On source form | Submitted on explicit Prepare brief | Stored in `content_jobs` | Other routine storage |
| --- | --- | --- | --- | --- |
| Original creative idea | Typed in browser | Yes | Yes, as existing brief | No new diagnostic field |
| Pasted manual text, up to 8,000 UTF-16 units | Typed locally | Yes, **only after explicit submit** | **Only budget-selected 2,000 / 4,000 / 8,000 Unicode characters** | No new diagnostic field |
| Unselected trailing part of pasted text | Browser input | Yes, as part of the explicit request | Should not be retained | Request metadata and platform logging not verified by code |
| Provenance | Label in UI | Not claimed as verified | `source.kind=user_supplied_text`, `verification=not_verified_by_pen` | Not in automatic diagnostics |
| Saved extractions | Separate source route | Only if `extractionId` provided | Owner-scoped excerpt per existing behavior | Original separately retained |
| Draft | Manually supplied assistant output | Existing explicit draft save | Existing owner-private job | Unchanged |

Automatic record expiry is paused in the running release baseline. Explicit DELETE on the owner-scoped content job must erase its saved excerpt and draft, while external/clipboard/downloaded copies remain outside Pen's deletion guarantees. No provider/media fetch occurs for manual source text.

## Independent reviewer checklist

- [ ] Check owner identity is **trusted dispatcher data**, not client headers, for both browser and tool paths; reject anonymous, forged and other-owner request/read/delete without revealing private text.
- [ ] Check private `content_jobs` read/write/delete and deduplication queries consistently bind `owner_id`. Validate there is no global list, content leakage by job identifier, or reflection in error bodies.
- [ ] Check request size guard (32,768 bytes) executes before JSON parsing; `sourceText` is a bounded string and missing/extra fields cannot smuggle client-generated extraction results.
- [ ] Check `extractionId` and nonempty `sourceText` are mutually exclusive at the server, including malicious tool calls.
- [ ] Check character-budgets for multibyte and combining marks, and ensure the **unselected tail is never persisted** or returned via job get/list.
- [ ] Check pasted source never enters `diagnostic_events`, browser diagnostic exports, error strings, automatic prompts, third-party requests or analytics. Separately verify whether hosting/logging infrastructure has request body retention and what owner controls exist.
- [ ] Check paste/typing causes no network write; only explicit Prepare brief sends text. Confirm the UI disclosure accurately describes storage, trimming, re-opening and deletion.
- [ ] Check the **unverified** provenance survives reopening, copying the brief and connector tool use, with no claim of watched video or verified speech.
- [ ] Check `creativePrompt` treats pasted source as data and instructs against prompt injection; confirm an assistant cannot cause automatic publication or other privileged actions through the text.
- [ ] Check minimum viable rights/privacy disclosure: users should supply only text they are permitted to process and should avoid third-party sensitive information.
- [ ] Check rollback compatibility and whether existing `content_jobs` payloads without `sourceText` still read unchanged.
- [ ] Record any blocker with a minimal synthetic reproducer. Do not paste real source text, tokens, videos or owner email/identifier into the review.

## Existing evidence, not a substitute for review

Final reviewed feature source before any documentation updates: `f3514cbe47716aea5fdb3c6be3bd5bbaec87525a`.

- 156/156 unit checks, hosted build/lint/type checks: https://github.com/GSGrimoire/gs-pen/actions/runs/41709581834
- 74/74 desktop/mobile browser tests: https://github.com/GSGrimoire/gs-pen/actions/runs/41709581813
- Creator review: `docs/REVIEW_PEN_029.md` and pull request conversation. This is **not independent**.
- No production provider verification, cross-account testing on a real private Site, or infrastructure request-logging audit has occurred.

## Decision record to be supplied by an independent reviewer

Reviewer identity: **pending**

Exact reviewed source commit and diff base: **pending**

Security/privacy findings, severity and required corrections: **pending**

Independent approval recorded as GitHub review on the final corrected pull request head: **pending**

Owner release inclusion decision: **pending**

If any entry is missing, leave PR #37 as a draft and exclude it from tomorrow's private release. A documented green test run is not evidence of independent privacy approval.
