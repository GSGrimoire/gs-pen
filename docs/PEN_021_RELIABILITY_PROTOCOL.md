# PEN-021: privacy-preserving extraction reliability benchmark

**Status: protocol only, 3 November 2026. No real provider requests, private-media collection, or third-party comparison has been run by this plan.** Issue: #22.

## Decision this benchmark must support

Should GS Pen invest next in additional bounded native-caption discovery, manual-content fallback, or a separately authorized audio-transcription pipeline? Choose only after measuring real useful-output coverage. A successfully classified URL is **not** an extraction success. A public post description is **not** a transcript of spoken audio.

This benchmark starts **after** the approved source is privately deployed and owner/privacy gates pass under #27. GitHub Actions synthetic tests, even if green, do not substitute for hosted sample runs.

## Sample selection and handling

- With explicit owner permission, select at least **10 rights-appropriate, public TikTok videos** on **at least two separate dates**. Cover canonical `/@creator/video/<id>`, ordinary Copy link `vm`/`vt`, videos that publicly expose native captions and videos that do not. Sampling should span several creators/topics, durations, languages and posting dates where possible.
- The 10-sample minimum is a feasibility smoke test, **not** evidence of a statistically stable population success rate. Expand to a stratified sample before making universal reliability claims.
- Store the sample roster and links outside GitHub, issue bodies, diagnostic logs and assistant prompts. Use an owner-controlled, access-restricted local sheet or private storage. Do not store creator names, video IDs, source URLs, caption text, spoken words, cookies or signed caption URLs in this repository or automatic telemetry.
- Sample identifiers used in analysis should be random local pseudonyms. Do not assume these make the dataset anonymous. Publish only aggregates when counts could expose a person or source.
- Never retrieve unauthorized/private material, use account cookies, bypass login or anti-bot gates, rotate proxy identities, or follow non-allowlisted redirects. No automatic paid transcription or third-party uploads.

## Measurement protocol

For each sample, measure two observations on distinct calendar dates, preferably same local time window and fixed Pen build. If access changes between dates, record the category change. For an optional TokScript comparison, use the *same* source sample and date and the owner's separately permitted TokScript account/workflow. Do not infer TokScript's internal technique or copy its output into diagnostics.

Record the following in the **private** measurement roster:
- Local random sample label and test date; tool and exact build/version; canonical versus share-link class and broad platform
- Whether the URL was recognized; whether a validated same-platform target was resolved; provider response category; whether native caption cues were found; whether useful post text or metadata was returned
- Whether post text is potentially truncated; whether an independent transcript was actually produced by a separately authorized tool (Pen presently does **not** do so)
- Outcome code from a strict category set, coarse request latency, number of timed cues, output provenance and operator-observed correctness
- Retry/redirect count where available; all failures classified without storing raw server errors or asset locations
- If manual reference text is used for quality scoring, it must be rights-cleared, kept outside repository/diagnostic logs and clearly labeled as operator reference data

## Mutually exclusive extraction outcomes

| Outcome | Meaning | Count as useful output? | Count as spoken transcript? |
| --- | --- | --- | --- |
| `native_caption_success` | Timed captions actually obtained from the requested platform item | Yes | **No** independent audio transcription; native captions may be incomplete |
| `post_only_partial` | Public post text but no usable native caption track | Yes, partial | No |
| `metadata_only_partial` | Metadata without post text or captions | Partial informational output; track separately | No |
| `provider_blocked` | Request rejected by provider | No | No |
| `link_unresolved` | Share token failed to reach supported public target | No | No |
| `unsafe_target_rejected` | Redirect/asset host failed allowlist | No, expected safe rejection | No |
| `timeout_network` | Network failure or timeout | No | No |
| `no_available_content` | Supported public page fetched, but no useful output | No | No |
| `invalid_unsupported` | Invalid link, unsupported platform or format | No | No |
| `other_safe_failure` | Bounded, sanitized, classified technical failure | No | No |

Track numeric metadata-only separately from content-rich results. If multiple failures occur, select the **final** outcome and retain only coarse stage counts in automatic diagnostics.

## Aggregate report format (no individual samples)

| Date/build | Attempts | Native captions | Post-only | Metadata-only | Blocked | Unresolved | Unsafe reject | Network/timeout | Other unavailable | Median latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [date/build] | [n] | [n] | [n] | [n] | [n] | [n] | [n] | [n] | [n] | [ms] |

**Core measures:** native-caption coverage = `native_caption_success / attempted eligible public links`; content-rich utility = `(native_caption_success + post_only_partial) / attempts`; metadata-only utility is reported separately. Always show the **denominator** and excluded cases (invalid/unapproved, if any), and separately state canonical versus short/share-link success. Do not silently replace caption coverage with total partial-result coverage.

For transcript-quality comparisons, score only genuinely comparable outputs against the same rights-cleared human reference and record language, errors and omissions. A large cue count alone is not evidence of accuracy. A tool with speech recognition and a tool restricted to published native captions must be described as having different capabilities, not as equivalent implementations.

## Synthetic regression additions after evidence is reviewed

When the benchmark identifies recurring failure categories, add **fabricated** provider responses and safe synthetic URLs to tests. Do not commit original sample URLs or extracted words. A retry is considered only for narrowly classified transient errors, bounded in count/time and honoring rate limits. Changes to media access, third-party models, permissions, billing, secrets, retention or capture require a separate issue and risk review.

## Output and stop criteria

Deliver a dated aggregate report, the anonymization/minimization review, observed failure distribution, median/p95 latency with small-sample caveats, and a justified next engineering increment with acceptance thresholds. If the provider blocks representative samples, report the limitation instead of widening access. Never claim universal TikTok or Facebook coverage from this pilot.

**No go-live or source publication is authorized by this protocol.** The immediate Site release still follows `docs/RELEASE_READINESS_2026-11-04.md` and issue #27.
