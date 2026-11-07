// Fixed recovery advice is display-only. Do not interpolate user URLs, provider content,
// raw backend errors, or identifiers into messages or diagnostic events.
const NEXT_STEP = Object.freeze({
  INVALID_URL: 'Paste a full TikTok video link or a Facebook post or video link.',
  AUTH_DENIED: 'Sign in to the Site again.',
  RATE_LIMITED: 'Too many requests. Wait a minute, then try again.',
  NOT_IMPLEMENTED: 'Pen cannot get captions from this platform or link type yet.',
  UNSUPPORTED_LINK_TYPE: 'Pen does not support this kind of link. Try the direct post or video link.',
  SHORT_LINK_UNRESOLVED: 'The share link did not lead to a public post. Try the direct post or video link.',
  SHORT_LINK_TARGET_REJECTED: 'The share link led somewhere Pen does not support, so it was not followed.',
  PROVIDER_BLOCKED: 'The platform refused the request. You can paste the text into Create instead.',
  LOGIN_REQUIRED: 'Facebook redirected Pen to a sign-in page. You can paste the text into Create instead.',
  CAPTIONS_NOT_FOUND: 'This video has no platform captions Pen can read.',
  CAPTION_HOST_REJECTED: 'The captions are hosted somewhere Pen does not fetch from.',
  CAPTION_PARSE_FAILED: 'The caption file had no readable lines.',
  CONTENT_NOT_FOUND: 'The page had no content Pen could read. Try the direct post or video link.',
  RESPONSE_TOO_LARGE: 'The page was too large to read safely.',
  NETWORK_ERROR: 'The connection failed. Try again later.',
  TIMEOUT: 'The request took too long. Try again later.',
  BACKEND_UNAVAILABLE: 'Pen could not reach its server. Check that you are signed in to the Site.',
  INTERNAL_ERROR: 'Something went wrong in Pen. Try again later.'
});
const FALLBACK = 'Pen could not read this link.';

export function recoveryGuidance(result) {
  if (!result || typeof result !== 'object' || result.ok === true) return '';
  const hasPost = typeof result.post?.text === 'string' && result.post.text.trim().length > 0;
  const hasMetadata = result.metadata?.status === 'succeeded';
  const availability = hasPost && hasMetadata
    ? 'Post text and details were found, but no transcript. '
    : hasPost
      ? 'Post text was found, but no transcript. '
      : hasMetadata
        ? 'Only video details were found. '
        : '';
  const code = typeof result.code === 'string' ? result.code : '';
  return availability + (Object.hasOwn(NEXT_STEP, code) ? NEXT_STEP[code] : FALLBACK);
}
