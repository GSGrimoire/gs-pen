# GS Pen backlog
Status: feasibility only; no completed social-video transcription or deployed Site.

## Priority 0: validation gates
- PEN-001 [research complete; runtime validation pending] Host on owner-private ChatGPT Sites if available. Static GitHub Pages alone is not acceptable for private access. Confirm deployed access, storage, quotas and cost.
- PEN-002 [research complete; audiovisual retrieval BLOCKED] Official APIs provide selected metadata/embed capabilities, not a verified general audio path for arbitrary public URLs. See docs/PLATFORM_ACCESS_RESEARCH.md. Need rights-cleared live samples and possibly a user-approved workflow change.
- PEN-003 [planned] Benchmark Danish/English recognition on 1, 5 and 30 minute rights-cleared clips with verified reference transcripts.
- PEN-004 [planned] Validate Sites owner-only authentication, synchronized history, 50-entry cap and deletion.
- PEN-005 [partial] Provider policy/rights, privacy, retention and data processing assessment.
- PEN-006 [blocked] Go / changed scope / stop decision once audiovisual input feasibility is resolved.

## Priority 1: implementation after gates
- PEN-100 Private Site, link input and truthful failure states
- PEN-101 Provider metadata and subtitles adapters with clearly labeled provenance
- PEN-102 Independent browser-worker Danish/English speech transcription
- PEN-103 Four output tabs and text/structured exports
- PEN-104 IndexedDB cache plus owner-only 50-item synchronized history
- PEN-105 Integration tests, security and accessibility review, verified deployment receipt

## Priority 2: future proposals
- PEN-200 Manually verified GS Scribe reference transcripts and export-only benchmark format
- PEN-201 GS Scribe model comparisons, word error rates and terminology evaluations
- PEN-210 Rights-cleared voice snippets for GS VoiceStudio with explicit speaker consent
- PEN-220 On-screen text extraction
- PEN-221 Translation, summaries and search
- PEN-222 Timed subtitles and batch jobs
- PEN-223 Optional browser extension for consent-based tab audio capture, only if user agrees to interaction change

All functionality must pass real-data acceptance tests before being marked complete. Never commit personal media, tokens, cookies or private transcripts.
