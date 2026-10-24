import test from 'node:test';
import assert from 'node:assert/strict';
import { runDualTranscript } from '../src/dual-transcript.mjs';

const url = 'https://www.youtube.com/watch?v=J---aiyznGQ';
const availableCaptions = async () => ({ text: 'Platformtekst', language: 'da', captionKind: 'auto' });
const availableAudio = async () => ({ id: 'synthetic-audio' });
const whisper = async () => ({ text: 'Whisper text', language: 'en', model: 'small' });

test('retains both independently sourced transcripts', async () => {
  const r = await runDualTranscript({ url, fetchCaptions: availableCaptions, fetchAudio: availableAudio, transcribeAudio: whisper });
  assert.equal(r.platformCaptions.text, 'Platformtekst');
  assert.equal(r.platformCaptions.origin, 'platform');
  assert.equal(r.whisperTranscript.text, 'Whisper text');
  assert.equal(r.whisperTranscript.origin, 'whisper');
  assert.equal(r.postData.status, 'unavailable');
});

test('can return existing captions without accessible audio', async () => {
  let called = false;
  const r = await runDualTranscript({ url, fetchCaptions: availableCaptions, fetchAudio: async () => null, transcribeAudio: async () => { called = true; } });
  assert.equal(r.platformCaptions.status, 'available');
  assert.deepEqual(r.whisperTranscript, { status: 'unavailable', reason: 'audio_not_accessible' });
  assert.equal(called, false);
});

test('can return Whisper when captions are missing', async () => {
  const r = await runDualTranscript({ url, fetchCaptions: async () => null, fetchAudio: availableAudio, transcribeAudio: whisper });
  assert.equal(r.platformCaptions.status, 'unavailable');
  assert.equal(r.whisperTranscript.status, 'available');
});

test('caption adapter error does not stop Whisper', async () => {
  const r = await runDualTranscript({ url, fetchCaptions: async () => { throw new Error('platform down'); }, fetchAudio: availableAudio, transcribeAudio: whisper });
  assert.equal(r.platformCaptions.status, 'error');
  assert.equal(r.whisperTranscript.status, 'available');
});

test('Whisper adapter error does not stop captions, and audio is disposed', async () => {
  let disposed = false;
  const r = await runDualTranscript({ url, fetchCaptions: availableCaptions, fetchAudio: async () => ({ dispose: async () => { disposed = true; } }), transcribeAudio: async () => { throw new Error('model down'); } });
  assert.equal(r.whisperTranscript.status, 'error');
  assert.equal(r.platformCaptions.status, 'available');
  assert.equal(disposed, true);
});

test('empty caption is not called successful', async () => {
  const r = await runDualTranscript({ url, fetchCaptions: async () => ({ text: '  ' }), fetchAudio: availableAudio, transcribeAudio: whisper });
  assert.equal(r.platformCaptions.status, 'unavailable');
});

test('post data cannot fake captions and is independent', async () => {
  const r = await runDualTranscript({ url, fetchCaptions: async () => null, fetchAudio: async () => null, transcribeAudio: whisper, fetchPostData: async () => ({ hashtags: ['#gs'] }) });
  assert.equal(r.platformCaptions.status, 'unavailable');
  assert.equal(r.whisperTranscript.status, 'unavailable');
  assert.deepEqual(r.postData.data.hashtags, ['#gs']);
});

test('starts caption and audio adapters concurrently', async () => {
  const begun = [];
  let releaseCaptions, releaseAudio;
  const captions = new Promise(resolve => { releaseCaptions = resolve; });
  const audio = new Promise(resolve => { releaseAudio = resolve; });
  const pending = runDualTranscript({ url,
    fetchCaptions: () => { begun.push('captions'); return captions; },
    fetchAudio: () => { begun.push('audio'); return audio; },
    transcribeAudio: whisper });
  assert.deepEqual(begun, ['captions', 'audio']);
  releaseAudio({ id: 'audio' });
  releaseCaptions({ text: 'Existing' });
  const result = await pending;
  assert.equal(result.whisperTranscript.status, 'available');
  assert.equal(result.platformCaptions.status, 'available');
});

test('rejects missing adapters and unvalidated URL', async () => {
  await assert.rejects(runDualTranscript({ url: 'http://invalid.test' }), TypeError);
  await assert.rejects(runDualTranscript({ url: 'https://evil.test' }), TypeError);
  await assert.rejects(runDualTranscript({ url }), TypeError);
});


test('reports platform captions before slow Whisper completes', async () => {
  let releaseAudio;
  const audio = new Promise(resolve => { releaseAudio = resolve; });
  let captionsReported;
  const gotCaptions = new Promise(resolve => { captionsReported = resolve; });
  const updates = [];
  const pending = runDualTranscript({ url, fetchCaptions: availableCaptions,
    fetchAudio: () => audio, transcribeAudio: whisper,
    onResult: (kind, result) => {
      updates.push(kind);
      if (kind === 'platformCaptions') captionsReported(result);
    }
  });
  const early = await gotCaptions;
  assert.equal(early.status, 'available');
  assert.equal(updates.includes('whisperTranscript'), false);
  releaseAudio({ id: 'synthetic-audio' });
  const completed = await pending;
  assert.equal(completed.whisperTranscript.status, 'available');
  assert.equal(updates.includes('whisperTranscript'), true);
});

