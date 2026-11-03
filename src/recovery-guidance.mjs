// Fixed recovery advice is display-only. Do not interpolate user URLs, provider content,
// raw backend errors, or identifiers into messages or diagnostic events.
const NEXT_STEP = Object.freeze({
  INVALID_URL: 'Paste a complete supported HTTPS TikTok video or public Facebook post/video link. Profile pages and incomplete share links are not supported.',
  AUTH_DENIED: 'Sign in to the existing owner-private Site with your authorized account. Do not paste account credentials into Pen.',
  RATE_LIMITED: 'Wait at least one minute before making another extraction request. Do not repeatedly retry a rate-limited provider.',
  NOT_IMPLEMENTED: 'This caption mode or platform is not implemented. Use any available post details, or open Create to prepare an original draft from your own notes.',
  UNSUPPORTED_LINK_TYPE: 'Try a direct public post or video permalink in a supported format. Pen cannot safely resolve this link style.',
  SHORT_LINK_UNRESOLVED: 'If available, copy a direct public post or video permalink from the platform. Expired or sign-in-only share links may not resolve.',
  SHORT_LINK_TARGET_REJECTED: 'The destination was rejected for safety. Use a direct supported public post or video link; Pen will not follow unsupported targets.',
  PROVIDER_BLOCKED: 'The platform refused the request. Public visibility does not guarantee automated access. You can open Create to work from notes you are permitted to use.',
  CAPTIONS_NOT_FOUND: 'No native caption track was exposed. This does not establish that the video has no speech. Use available post details or notes you are permitted to use in Create.',
  CAPTION_HOST_REJECTED: 'The caption asset host did not pass the safety allowlist. Pen will not fetch it. Work from permitted notes instead.',
  CAPTION_PARSE_FAILED: 'The retrieved caption file had no supported timed cues. Use any available post details or your own permitted notes in Create.',
  CONTENT_NOT_FOUND: 'The page did not expose supported public content. Try a direct public permalink or work from your own permitted notes in Create.',
  RESPONSE_TOO_LARGE: 'The provider response exceeded the safety size limit. Pen will not expand that limit automatically; use an alternate supported public link or permitted notes.',
  NETWORK_ERROR: 'The connection failed, which does not mean captions are absent. Check your connection and retry later if permitted.',
  TIMEOUT: 'The request timed out, which does not mean captions are absent. Retry later if permitted.',
  BACKEND_UNAVAILABLE: 'The private extraction backend is unavailable. Check the existing Site connection; do not expose the local research server as a workaround.',
  INTERNAL_ERROR: 'The private backend could not complete this request. Retry later, or prepare an original draft from permitted notes in Create.'
});
const FALLBACK = 'This source could not be extracted. Check the supported link types or open Create to work from your own permitted notes.';

export function recoveryGuidance(result) {
  if (!result || typeof result !== 'object' || result.ok === true) return '';
  const hasPost = typeof result.post?.text === 'string' && result.post.text.trim().length > 0;
  const hasMetadata = result.metadata?.status === 'succeeded';
  const availability = hasPost && hasMetadata
    ? 'Partial result: available post text and metadata may still be useful. They are not an independent speech transcript. '
    : hasPost
      ? 'Partial result: available post text may be shortened and is not a speech transcript. '
      : hasMetadata
        ? 'Partial result: public metadata is available, but it is not a speech transcript. '
        : 'No usable source content was retrieved. ';
  const code = typeof result.code === 'string' ? result.code : '';
  return availability + (Object.hasOwn(NEXT_STEP, code) ? NEXT_STEP[code] : FALLBACK);
}
