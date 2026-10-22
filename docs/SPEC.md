# GS Pen specification
Version 1.1, research baseline, 22 October 2026.

## Requirements
Public video URLs only: Facebook videos/Reels, TikTok, Instagram Reels, YouTube videos/Shorts. One URL at a time; maximum 30 minutes; no upload fallback. Owner-only authenticated access. Four tabs: independent spoken-audio transcript, original platform subtitles, post text (hashtags and mentions), metadata (creator, date, duration and available engagement counts). Danish and English; cleaned plain transcript presentation. Transcript must be independently generated, never substituted by source captions. Preserve actual provenance and unknown values. Local history and synchronized owner-only history, maximum 50; delete and clear actions. No paid transcription service. Provide versioned export suitable for GS Scribe evaluation; benchmark processing and voice work are deferred.

## Preferred architecture (conditional)
Private ChatGPT Site frontend, browser worker speech recognition, and IndexedDB cache. Site-owned authentication/database for synchronized text only, once those capabilities and access control have been verified. GitHub is source control and cannot itself run a media backend. Browser cross-origin controls and provider rights can prevent access to audiovisual data, even when metadata is public. A separate service is permitted only after a privacy, policy and cost decision. Do not advertise coverage before real authorized retrieval tests pass.

## Security and data
Reject all but known HTTPS social platform URL forms; use parsed hostname checks rather than substring matching. Follow no unvalidated redirects. Guard against internal-network fetches, oversized media, repeated requests and account enumeration. Do not store video/audio beyond processing. Do not submit a video to a third-party transcription provider. Store no account cookies or secrets in code, logs or GitHub. Access to synchronized records must be proven account-scoped. Private repository does not replace runtime authentication.

## Exports
Schema: `gs-pen.transcript` version 1. Fields include source URL, retrieved timestamp, platform, language, raw recognized speech, clean text, actual segment timings if known, caption track provenance, post text, nullable metadata and model/runtime version. Reference transcript is only a manually corrected field and is not inferred from captions.

## Release criterion
Do not build or release a functional site until the five feasibility gates documented in FEASIBILITY.md are passed and PEN-006 explicitly approves scope.
