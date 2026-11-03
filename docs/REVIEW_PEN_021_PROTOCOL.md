# PEN-021 protocol preparation self-review, 3 November 2026

Issue #22. This is a research protocol and acceptance rubric, not an implementation of new extraction techniques.

## In scope
- Distinguish native caption success, post-only/metadata-only partial results, provider blocking, unsupported/unsafe targets and transient failures.
- State a small, stratified, owner-authorized real-world sample design across two dates, with separate canonical and share-link cohorts.
- Record aggregate-denominator reporting and comparison limitations before choosing a new reliability feature.
- Keep individual source URLs, identifiers, content and reference transcript data out of repository and diagnostics.

## Boundaries
No real provider fetch was run, no dataset collected, and no third-party service was contacted or granted access. No new cookies, scraping bypass, proxies, audio downloads, paid transcription, schema changes, authentication changes, owner-policy changes, retention changes, model connections or publication operations.

## Review limits
This self-review checks the protocol for unsupported feature claims and data minimization. It is not a provider rights determination, external compliance opinion or independent security review. Any eventual audio transcription, new provider or third-party exchange requires a separate permission/cost/risk gate.

## Verification
Documentation-only diff. GitHub checks should be green before merging, but they do not prove provider availability. The Site release itself remains separately gated under #27.
