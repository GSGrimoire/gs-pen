# Live platform caption evidence

Status recorded 22 October 2026, first live execution.

## Confirmed test
Private GitHub Actions run: https://github.com/GSGrimoire/gs-pen/actions/runs/39855712437
Workflow: caption-feasibility.yml; branch `chatgpt/pen-002b-live-caption-probes`.

The single-attempt probe ran on a GitHub-hosted Ubuntu machine without social logins, cookies, proxies, browser-fingerprint simulation, uploaded media, or paid transcription calls. It printed status and cue counts only.

| Platform | Video used | Observed result | Meaning |
| --- | --- | --- | --- |
| TikTok | Public @scrubdaddy video `7538539956029902111` | `caption_retrieved`; WebVTT valid; **15 cues** | **One real existing-caption track accessed and structurally parsed** |
| YouTube | Public `jNQXAC9IVRw` (Me at the zoo) | `RequestBlocked` | Cloud runner denied access; caption existence cannot be disproved |
| Instagram | No sample processed | No verified caption endpoint | No conclusion about actual caption accessibility |
| Facebook | No sample processed | No verified caption endpoint | No conclusion about actual caption accessibility |

The result matched an independently published example reporting 15 caption lines for that same TikTok video: https://tokconnect.com/tools/tiktok-transcript-generator/ . Matching line counts provide a useful cross-check, **not an integrity proof** that all words were retrieved.

Provider technique: request public TikTok video page once; parse the page's embedded `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON for `caption_infos[].url`; validate the caption host against an explicit allowlist, issue one HTTPS request with redirects disabled, and verify a `WEBVTT` header plus 15 timed cues. No transcript text, signed track URLs, or audiovisual media were retained. These are website internals, **not a documented commercial caption API**. The endpoint and markup may change or be blocked.

YouTube test used `youtube-transcript-api==1.2.4`, which uses an undocumented interface and warns about cloud-address request blocks. Do not use proxies/cookies to bypass blocks. Official YouTube Data API caption download generally requires an authorized channel owner; this experiment did not confer those rights.

## Test interpretations

- Local logic / parsing: GitHub Actions passed 39 JavaScript tests and four Python parser tests.
- Live TikTok: initial test confirmed **one** nonempty existing-caption WebVTT track.
- Live YouTube: request blocked, not a missing-caption result.
- Instagram/Facebook: not tried.
- Overall four-platform readiness: **NOT MET**.
- Caption retrieval as a separate path is **technically demonstrated on TikTok**, with reliability and permitted production use still unvalidated.
- No independent Whisper/audio model inference was involved.

## Next validation

1. Repeat TikTok retrieval on a second date and on at least ten diverse public videos with clear attribution and documented reuse/processing rights, including videos with intentionally unavailable tracks.
2. Quantify success and failure: readable page, caption URL present, HTTPS caption fetched, valid nonempty VTT; distinguish no caption from blocked page or schema change.
3. Confirm provider terms and appropriate production access approach. Do not infer blanket permission from public visibility.
4. Repeat tests in the intended ChatGPT Site browser environment, not only on a GitHub-hosted runner. Verify whether cross-origin browser policy prevents direct track fetching, which would require an authorized service or extension.
5. Seek permissible caption routes for YouTube, Instagram and Facebook independently. Leave the platform unresolved where access is unverified.

## Privacy

Only status categories, date, language/track cues and per-platform success are retained. Do not add full brand transcripts, signed caption URLs, account cookies, or private videos to Git history. A public brand example was examined transiently for a feasibility test and is not an authorization to republish its captions.

## Repeat-run evidence and domain variation (same date)

Three GitHub-hosted executions were performed on 22 October 2026 for the same public TikTok example:

| Workflow run | TikTok outcome | YouTube outcome |
| --- | --- | --- |
| [39855712437](https://github.com/GSGrimoire/gs-pen/actions/runs/39855712437) | 15 valid cues, PASS | RequestBlocked |
| [39856097359](https://github.com/GSGrimoire/gs-pen/actions/runs/39856097359) | One caption URL, but domain not yet allowlisted, FAIL | RequestBlocked |
| [39856401022](https://github.com/GSGrimoire/gs-pen/actions/runs/39856401022) | 15 valid cues, PASS after allowlist correction | RequestBlocked |

The middle failure exposed a previously unrecognized TikTok delivery hostname `v16m-webapp.tiktokcdn-us.com`. No signed URL or caption text was disclosed. The TikTok-associated `tiktokcdn-us.com` suffix was then added narrowly to the host allowlist and its deceptive-subdomain rejection tests were extended. A peer-reviewed 2026 study of TikTok delivery identifies the suffix as a TikTok CDN: https://aqualab.cs.northwestern.edu/publication/2026/yzhang-conext26/YZhang-CoNEXT26.pdf

A passing workflow now **requires** at least one nonempty, parsed TikTok caption track; a mere status report containing a failure is not counted as success. The two successes are on **the same video and same date**, not independent samples. These observations cannot establish coverage or durability of arbitrary public TikToks.

No direct browser capture, consumer computer test or permission audit has been completed.

## Second independently sourced public TikTok example
GitHub Actions run: https://github.com/GSGrimoire/gs-pen/actions/runs/39856616103

- Public `@hankgreen1/video/7047596209028074758` (listed as an auto-caption test example in yt-dlp's public TikTok extractor): **12 valid WebVTT cues retrieved**.
- The same run also retrieved the Scrub Daddy video's **15 valid cues** and returned YouTube `RequestBlocked`.
- This yields **two different public videos**, each with a nonempty TikTok platform caption track. Both were tested on 22 October 2026.
- No caption text or signed asset URL was retained.
- The workflow is being strengthened to require **both** examples to pass. Two success cases do not measure TikTok-wide reliability, handle Danish-language captions, or establish permission for production scraping.

Source of second test case: https://github.com/yt-dlp/yt-dlp/blob/master/yt_dlp/extractor/tiktok.py

