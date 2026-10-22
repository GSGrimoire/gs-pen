# GS Pen backlog
Status: feasibility only. No transcription pipeline or deployment is implemented.

## Priority 0: validation gates
- PEN-001 [in progress] Select hosting. Verify owner-only access, site deployment path, quotas and cost.
- PEN-002 [blocked: permitted retrieval] Investigate rights-cleared audiovisual access for YouTube, TikTok, Instagram Reels and Facebook videos/Reels. Test 10 representative videos per platform on two dates. Record origin, permitted method, metadata, captions and playable audio independently. Do not use cookies, account harvesting or circumvention.
- PEN-003 [planned] Measure real Danish and English local recognition. Compare with manually verified references and record duration, memory, accuracy and processing time on 1, 5 and 30 minute media.
- PEN-004 [planned] Prove owner-only Site authentication and storage, 50-entry limit, account isolation and deletion.
- PEN-005 [planned] Review privacy, retention, permissions and platform terms. No personal audio committed.
- PEN-006 [planned] Sign off go / revised scope / stop only after PEN-001 through PEN-005.

## Priority 1: implementation after release gate
- PEN-100 Owner-private Site, strict URL handling and truthful failure states
- PEN-101 Provider adapters with typed metadata and caption provenance
- PEN-102 Browser worker transcription in Danish and English
- PEN-103 Four independent result tabs and transcript exports
- PEN-104 Local cache plus account-scoped synchronized history, maximum 50
- PEN-105 Security, accessibility, real-platform regression, release receipt

## Future features
- PEN-200 Verified GS Scribe benchmark exports and opt-in manually corrected reference corpus
- PEN-201 Comparison of models, processing time, Danish technical vocabulary and word-error rates
- PEN-210 Explicit-consent GS VoiceStudio audio clip exports and optional voice reference research
- PEN-220 On-screen text extraction
- PEN-221 Search, highlighting, summaries and translation
- PEN-222 Timed captions and batch processing
- PEN-223 Browser extension only after compliance review

No implementation claims are allowed without tests and a recorded receipt. Public video access does not imply voice-cloning consent.
