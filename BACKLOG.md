# GS Pen backlog
Status: feasibility only; no completed social-video transcription or deployed Site.

## Priority 0: validation gates
- PEN-001 [research complete; runtime validation pending] Host on owner-private ChatGPT Sites if available. Static GitHub Pages alone is not acceptable for private access. Confirm deployed access, storage, quotas and cost.
- PEN-002 [research completed; audiovisual retrieval BLOCKED] Official interfaces provide selected metadata/embed capabilities, not a verified general audio path for arbitrary public URLs. See docs/PLATFORM_ACCESS_RESEARCH.md.
- PEN-002A [synthetic prototype passed; two real TikTok tracks retrieved] Try permitted extraction of existing platform-generated captions independently of Whisper. Compare TokScript's published mechanism without assuming access to its proprietary implementation. See docs/DUAL_TRANSCRIPTION_RESEARCH.md and docs/LIVE_CAPTION_RESULTS.md; 10 offline pipeline tests passed; 15 and 12 WebVTT cues retrieved live from distinct TikTok videos.
- PEN-002B [live TikTok sample passed; multi-platform coverage pending] Rights-cleared platform-caption retrieval matrix, 10 videos per platform on two dates, and real browser cross-origin validation. GitHub runner confirms 15 and 12 cues on two distinct TikTok videos; YouTube blocked; Meta not tested.
- PEN-003 [planned] Benchmark Danish/English recognition on 1, 5 and 30 minute rights-cleared clips with verified reference transcripts.
- PEN-004 [planned] Validate Sites owner-only authentication, synchronized history, 50-entry cap and deletion.
- PEN-005 [partial] Provider policy/rights, privacy, retention and data processing assessment.
- PEN-006 [blocked] Go / changed scope / stop decision once permitted input feasibility is resolved.

## Priority 1: implementation after gates
- PEN-100 Private Site, link input and truthful failure states
- PEN-101 Provider metadata and subtitles adapters with clearly labeled provenance; parallel execution with speech pipeline
- PEN-102 Independent browser-worker Danish/English Whisper speech transcription
- PEN-103 Four output tabs and text/structured exports; independently display captions when Whisper is unavailable
- PEN-104 IndexedDB cache plus owner-only 50-item synchronized history
- PEN-105 Integration tests, security and accessibility review, verified deployment receipt

## Priority 2: future proposals
- PEN-200 Manually verified GS Scribe reference transcripts and export-only benchmark format
- PEN-201 GS Scribe model comparisons, word error rates and terminology evaluations, using platform captions as unverified reference candidates only
- PEN-210 Rights-cleared voice snippets for GS VoiceStudio with explicit speaker consent
- PEN-220 On-screen text extraction
- PEN-221 Translation, summaries and search
- PEN-222 Timed subtitles and batch jobs
- PEN-223 Optional browser extension for consent-based tab audio capture, only if user agrees to interaction change

All functionality must pass real-data acceptance tests before being marked complete. Never commit personal media, tokens, cookies or private transcripts.
