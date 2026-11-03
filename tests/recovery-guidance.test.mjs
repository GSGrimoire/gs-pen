import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryGuidance } from '../src/recovery-guidance.mjs';

test('successful captions never show recovery instructions', () => {
  assert.equal(recoveryGuidance(null), '');
  assert.equal(recoveryGuidance({ok:true,code:'OK',cues:[{text:'synthetic'}]}), '');
});
test('blocked and unresolved links suggest supported next steps without bypass', () => {
  assert.match(recoveryGuidance({ok:false,code:'PROVIDER_BLOCKED'}), /refused the request/);
  assert.match(recoveryGuidance({ok:false,code:'SHORT_LINK_UNRESOLVED'}), /direct public post/);
  assert.match(recoveryGuidance({ok:false,code:'SHORT_LINK_TARGET_REJECTED'}), /rejected for safety/);
  assert.match(recoveryGuidance({ok:false,code:'AUTH_DENIED'}), /owner-private Site/);
  assert.match(recoveryGuidance({ok:false,code:'CAPTIONS_NOT_FOUND'}), /does not establish that the video has no speech/);
});
test('partial Facebook public preview remains distinct from transcript', () => {
  const message=recoveryGuidance({ok:false,code:'NOT_IMPLEMENTED',
    post:{text:'Fixture public post #example',completeness:'page_preview_may_be_truncated'},
    metadata:{status:'succeeded',fields:{creator:'Fixture Studio'}}});
  assert.match(message,/Partial result/);
  assert.match(message,/post text and metadata/);
  assert.match(message,/not an independent speech transcript/);
  assert.match(message,/open Create/);
  assert.ok(!message.includes('Fixture public post'));
  assert.ok(!message.includes('Fixture Studio'));
});
test('metadata-only partial result cannot be described as post text or transcript', () => {
  const message=recoveryGuidance({ok:false,code:'CAPTIONS_NOT_FOUND',metadata:{status:'succeeded'}});
  assert.match(message,/public metadata is available/);
  assert.doesNotMatch(message,/available post text/);
  assert.match(message,/not a speech transcript/);
});
test('unexpected provider codes and hostile data never appear verbatim in guidance', () => {
  const malicious='<img src=x onerror=alert(1)>';
  const message=recoveryGuidance({ok:false,code:malicious,post:{text:malicious},rawError:malicious,url:'https://invalid.example/private'});
  assert.match(message,/Partial result/);
  assert.ok(!message.includes(malicious));
  assert.ok(!message.includes('invalid.example'));
  assert.ok(message.length < 500);
});
test('rate limit, oversized provider pages, and offline backend have distinct guidance', () => {
  assert.match(recoveryGuidance({ok:false,code:'RATE_LIMITED'}), /one minute/);
  assert.match(recoveryGuidance({ok:false,code:'RESPONSE_TOO_LARGE'}), /safety size limit/);
  assert.match(recoveryGuidance({ok:false,code:'BACKEND_UNAVAILABLE'}), /private extraction backend/);
});
