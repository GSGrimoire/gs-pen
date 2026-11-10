# PEN-021: operator runbook for reliability observations

**Status:** synthetic/offline aggregator implementation only. No live third-party requests have been made. Issue #22, roadmap #47.

## Why this exists

The key question is not whether Pen accepts a link but **how often it retrieves correct, useful source evidence**. Measure native spoken-caption availability separately from partial public post text and metadata. Never count a description as spoken words.

The original sampling requirements and limits remain in [PEN_021_RELIABILITY_PROTOCOL.md](PEN_021_RELIABILITY_PROTOCOL.md): at least 10 rights-appropriate public TikTok videos, two different dates, broader coverage before making reliability claims; add permitted Facebook variants as a separate cohort.

## Owner-held preparation

1. Keep actual links, matching human reference transcripts and sample identifiers **outside the repository, issues, chat prompts and diagnostics** in an owner-controlled, restricted local roster. Obtain explicit owner permission and use only appropriately permitted public sources.
2. Using the **already authorized private Site** or another authorized operator, attempt each sample. Do not change owner/private sharing or try to bypass provider logins, rate limits or access restrictions. No video/audio download or paid transcription in this benchmark.
3. In the private roster, record provider, broad link type, result category, measured duration, native cue count, test date and exact build. Keep accuracy/reference evaluations private; this aggregator does not measure word error rate.
4. Transfer only these seven predefined, **sanitized** values per observation into a local JSON Lines file (one JSON object per line). The parser rejects other keys, including URLs, sample IDs, creator names, captions and notes. Do not copy original provider responses.

Example fabricated observation (no source URL):

```json
{"platform":"tiktok","linkType":"short_share","outcome":"native_caption_success","latencyMs":1250,"captionCueCount":12,"runDate":"2026-11-10","build":"workspace_v04_sites_1"}
```

Allowed fields:

| Field | Allowed values |
| --- | --- |
| `platform` | `tiktok`, `facebook` |
| `linkType` | TikTok: `canonical_video`, `short_share`; Facebook: `canonical_video`, `reel`, `video_share`, `post_share` |
| `outcome` | One of the exact outcome names in the benchmark protocol |
| `latencyMs` | Integer, 0 to 600000 |
| `captionCueCount` | Integer, 0 to 2000; must be positive **only** for `native_caption_success` |
| `runDate` | Actual calendar date in `YYYY-MM-DD` |
| `build` | Version such as `workspace_v04_sites_1` |

If native caption evidence exists, record `native_caption_success` even when post text also exists. If captions are absent, choose the strongest observed partial category. Other categories are mutually exclusive. `invalid_unsupported` is excluded from the eligible-public-link denominator, but included in the overall attempt count and utility denominator.

## Run the local report

From the project repository, using a **private local file**:

```sh
node scripts/reliability-report.mjs /private/local/observations.jsonl > /private/local/aggregate-report.json
```

Or pipe sanitized rows into standard input:

```sh
node scripts/reliability-report.mjs < /private/local/observations.jsonl
```

The command does **not** fetch links, use a model, connect to the Site, transmit data, or modify application records. It prints only group summaries. It rejects malformed observations with a fixed error code and row number, without printing their contents or local file path.

The report provides exact outcome counts, eligible denominators, native-caption coverage, post-inclusive content utility, metadata-only utility, median and 95th-percentile latency. Groups with fewer than five observations are suppressed, and outputs contain no per-row data or raw input fields. This threshold is a minimum guard, not permission to release sensitive aggregates. Review publication safety before adding any aggregate to GitHub.

**Do not interpret the aggregate as an accuracy evaluation.** Compare actual spoken words against an authorized human reference separately, using a private quality sheet, particularly for Danish and English. Do not claim all providers or URLs will always work. No real links are needed to finish the offline aggregator code or its synthetic tests.

## Next engineering gates

- Confirm the version-13 owner-private release acceptance in issue #27.
- Check in the owner-provided permitted sample list **privately**, run the paired benchmark on two distinct dates, and record only publishable aggregate outcomes under issue #22.
- Use the measured failure distribution to select narrow, reviewed resolver fixes.
- Add an owner-scoped assistant extraction tool only after source evidence, quotas, authentication, and prompt-injection boundaries are reviewed separately. Existing content-job tools must not be treated as a fully verified extract-on-demand capability.
