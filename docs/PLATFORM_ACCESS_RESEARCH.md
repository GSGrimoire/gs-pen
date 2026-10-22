# Platform media access assessment

Research date: 22 October 2026. Status: documentation assessment; **no live audiovisual URL processed**.

## Research question
Can an owner-private ChatGPT Site, without a standalone server and without paid transcription services, accept an arbitrary public Facebook, Instagram, TikTok or YouTube video URL and independently transcribe its audio?

**Current answer: not demonstrated; the proposed one-paste workflow is blocked at audiovisual access, not recognition.** Embedding a video does not make its audio available to the embedding page's JavaScript. Platform data and embed interfaces do not in general furnish reusable raw audio.

## Provider evidence

| Provider | Documented metadata or embed route | Audio or subtitle route for arbitrary public videos | Current verdict |
| --- | --- | --- | --- |
| YouTube | Data API videos.list supports public title, description, duration and some statistics (key/quota setup needed) | Data API does not provide a public download-media method. captions.download requires rights to edit the video. Developer API policies restrict downloading YouTube audiovisual data without prior approval. | Metadata conditional; independent speech transcription **blocked** on a general public URL through standard API |
| TikTok | Official oEmbed can return title, author and embed HTML for public examples. Display API provides authorized creator's public video metadata with `video.list` scope. | Neither oEmbed nor the Display API is a general-purpose speech-audio download interface. | Embed metadata conditional; independent speech transcription **blocked** through these interfaces |
| Instagram Reels | Instagram professional-account interface can access professional media subject to Meta access permissions; public oEmbed provides embed markup, with availability and permitted use to be checked | No verified general-purpose media-audio endpoint for arbitrary public Reels | Metadata conditional; independent speech transcription **blocked/unverified** |
| Facebook videos and Reels | Meta public oEmbed supports rendered embeds; account/Page APIs depend on permissions | No verified general-purpose audio retrieval for arbitrary public videos | Metadata conditional; independent speech transcription **blocked/unverified** |

Meta documentation mirrored in October 2026 reports a change from 15 June 2026 permitting tokenless oEmbed calls; direct Meta developer documentation could not be retrieved in this research environment (429 response). **Do not hard-code older token requirements or assume tokenless access is confirmed until a live test.** Embed permission also is not permission to extract media or repurpose content.

## Candidate approaches

1. **Static Site + documented platform interfaces:** simplest privacy model, no server, likely feasible for certain public metadata/embeds. Does **not** meet the independent audio-transcript requirement for arbitrary URLs. Do not build as though it does.
2. **Static Site + direct browser media fetch:** usually blocked by cross-origin restrictions and platform media delivery design; no verified general workaround. A successful HTML embed is not audio access.
3. **Server-side extractors, for example yt-dlp:** technically supports many site extractors and may obtain media in certain cases, but success varies. Needs a processing service, ongoing maintenance, and per-platform policy/rights assessment. Extractor support does not establish authorization. Not a no-server solution.
4. **Optional browser extension/tab audio capture:** Chrome's tabCapture can capture the user-invoked active tab's audio stream. This can avoid a central video download backend and keep speech recognition local, but needs an extension or explicit capture permission, real-time playback, capture rights, and platform-specific testing. **Does not meet one-paste, automatic, no-fallback user experience unchanged.** Candidate alternative only if user changes scope.
5. **User-owned/creator-authorized content APIs:** valuable as a restricted first cohort if user relaxes arbitrary public URL requirement. Authorization and media rights must be separately established.

## Hosting and cost

GitHub Pages is static and generally publishes a publicly accessible site even from a private repo; it does not provide an owner-only application gate or media-processing backend. Do not deploy privacy-sensitive GS Pen via ordinary GitHub Pages.

ChatGPT Sites documentation states newly created sites are owner/workspace-admin limited by default, with usage and storage limits, and hosting currently included for eligible Plus/Pro plans. That makes Sites a plausible owner-only user interface but does not establish that it can run unrestricted platform-video extraction. Site creation/deployment happens through ChatGPT Work/Codex Sites workflow; GitHub commit does not deploy a Site. We have not invoked that workflow.

## Official and project references (checked 22 October 2026)
- YouTube video metadata: https://developers.google.com/youtube/v3/docs/videos/list
- YouTube caption permissions: https://developers.google.com/youtube/v3/docs/captions/download
- YouTube developer policies: https://developers.google.com/youtube/terms/developer-policies
- TikTok display interface: https://developers.tiktok.com/docs/en/display-api-overview
- TikTok video embeds and oEmbed: https://developers.tiktok.com/docs/en/embed-videos
- TikTok creator authorization: https://developers.tiktok.com/docs/en/display-api-get-started
- Instagram professional-account developer reference: https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- Meta oEmbed documentation: https://developers.facebook.com/docs/graph-api/reference/oembed-video/
- Chrome tab audio capture: https://developer.chrome.com/docs/extensions/reference/api/tabCapture
- yt-dlp supported-site caveat: https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md
- GitHub Pages visibility: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- ChatGPT Sites: https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites

## Required next evidence
- Supply only rights-cleared example video links, or obtain permission for a test set. Do not store links to personal content in public issues.
- Confirm a permitted source of actual audiovisual bytes; demonstrate processing on 1, 5 and 30 minute clips.
- Independently verify Meta oEmbed tokenless response, browser cross-origin headers, and available metadata in a real browser.
- Confirm Sites owner-only authentication, synchronized storage, and runtime constraints in an actual private preview.
- If no permitted audio path exists: return a scope-change proposal (tab capture extension, authorized creator content, or user-owned file input). Do not silently add a fallback against user's decision.

## Evidence levels
Documentation conclusion is not a live test. URL classification tests only recognize patterns. This project has **zero verified social-platform audio retrievals** as of this update.
