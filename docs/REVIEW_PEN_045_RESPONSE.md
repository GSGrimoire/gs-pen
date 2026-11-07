# Response to ChatGPT-C review of pull request 45

6 November 2026. Reviewed baseline 4fc2dcaf92fd2290fcf0ed8d9d7f18deb70bc850. This is the implementer's response. Independent re-review of the corrected head is required.

| Finding | Correction and regression coverage |
| --- | --- |
| Repeated speech disappeared and merged cues left a stale end time | Plain transcript deduplication requires valid, ordered, overlapping or touching timings. Merged cues advance the end boundary without shortening it. Tests cover separated repeats, touching and overlapping cues, Unicode, empty cues, malformed and out-of-order timings, and original cue preservation in structured and SubRip exports. |
| Failed extraction B could silently reuse source A | The recovery card explains attachment status. Create identifies the selected saved link and requires an explicit keep or clear choice if an unsaved extraction opens it with an existing source. A browser test verifies source A remains identifiable, source B is absent and submitting after clearing sends neither source. |
| Login diagnostic accepted unsupported destinations and missed share redirects | Direct and share paths use the same recognized redirect status, HTTPS, Facebook host, credentials, port and path checks. A recognized sign-in barrier stops retrieval. Tests cover relative, external, malformed, wrong-scheme, custom-port, credential-bearing, non-redirect and cross-provider locations. The user message describes the observed redirect. |
| Waiting for stream cancellation could stall retrieval | Both paths initiate cancellation without awaiting it and abort the associated request on cleanup. Tests exercise cancellation that never settles and cancellation that rejects. |
| Provenance and keyboard navigation | The summary identifies the caption transcript and output panels show the source where supplied. Tabs use a single tab stop, arrows, Home and End. Documentation describes Pen's Facebook support and the observed sign-in barrier. |

Local verification covers the synthetic test suite and production build. Browser acceptance runs on the corrected pull request. Hosted access and actual provider acceptance stay tracked in issue #27. Version 12 is the documented production baseline.
