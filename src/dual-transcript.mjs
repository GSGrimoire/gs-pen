// GS Pen dual transcript orchestration v1. No platform access or media retrieval.
const unavailable = (reason) => ({ status: 'unavailable', reason });
const failure = (step) => ({ status: 'error', reason: `${step}_failed` });

function transcriptResult(value, origin) {
  if (value == null) return unavailable('not_provided');
  if (typeof value.text !== 'string' || !value.text.trim()) return unavailable('empty_transcript');
  return {
    status: 'available',
    origin,
    text: value.text,
    language: typeof value.language === 'string' ? value.language : null,
    ...(origin === 'platform' ? { captionKind: value.captionKind ?? 'unknown' } : { model: value.model ?? 'unknown' })
  };
}

// All adapters are supplied by the caller. They are NOT implemented here.
// Returning unavailable from one pipeline must never replace the other output.
export async function runDualTranscript({ url, fetchCaptions, fetchAudio, transcribeAudio, fetchPostData }) {
  if (typeof url !== 'string' || !url.startsWith('https://')) throw new TypeError('A validated HTTPS video URL is required');
  if ([fetchCaptions, fetchAudio, transcribeAudio].some(fn => typeof fn !== 'function')) throw new TypeError('Missing pipeline adapter');

  const captionsTask = (async () => {
    try { return transcriptResult(await fetchCaptions(url), 'platform'); }
    catch { return failure('captions'); }
  })();
  const whisperTask = (async () => {
    let audio;
    try {
      audio = await fetchAudio(url);
      if (audio == null) return unavailable('audio_not_accessible');
      return transcriptResult(await transcribeAudio(audio), 'whisper');
    } catch { return failure('whisper'); }
    finally {
      if (audio && typeof audio.dispose === 'function') {
        try { await audio.dispose(); } catch { /* Must not discard a completed transcript. */ }
      }
    }
  })();
  const postTask = (async () => {
    if (typeof fetchPostData !== 'function') return unavailable('not_configured');
    try {
      const value = await fetchPostData(url);
      return value == null ? unavailable('not_provided') : { status: 'available', data: value };
    } catch { return failure('post_data'); }
  })();
  const [platformCaptions, whisperTranscript, postData] = await Promise.all([captionsTask, whisperTask, postTask]);
  return { platformCaptions, whisperTranscript, postData };
}
