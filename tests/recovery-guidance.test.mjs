import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryGuidance } from '../src/recovery-guidance.mjs';

test('successful captions never show recovery instructions', () => {
  assert.equal(recoveryGuidance(null), '');
  assert.equal(recoveryGuidance({ok:true,code:'OK',cues:[{text:'synthetic'}]}), '');
});
test('blocked and unresolved links suggest supported next steps without bypass', () => {
  assert.match(recoveryGuidance({ok:false,code:'PROVIDER_BLOCKED'}), /refused the request/);
  assert.match(recoveryGuidance({ok:false,code:'LOGIN_REQUIRED'}), /redirected Pen to a sign-in page/);
  assert.match(recoveryGuidance({ok:false,code:'LOGIN_REQUIRED'}), /paste the text into Create/);
  assert.match(recoveryGuidance({ok:false,code:'SHORT_LINK_UNRESOLVED'}), /direct post or video link/);
  assert.match(recoveryGuidance({ok:false,code:'SHORT_LINK_TARGET_REJECTED'}), /not followed/);
  assert.match(recoveryGuidance({ok:false,code:'AUTH_DENIED'}), /Sign in to the Site/);
  assert.match(recoveryGuidance({ok:false,code:'CAPTIONS_NOT_FOUND'}), /no platform captions/);
});
test('partial Facebook public preview remains distinct from transcript', () => {
  const message=recoveryGuidance({ok:false,code:'NOT_IMPLEMENTED',
    post:{text:'Fixture public post #example',completeness:'page_preview_may_be_truncated'},
    metadata:{status:'succeeded',fields:{creator:'Fixture Studio'}}});
  assert.match(message,/Post text and details were found, but no transcript/);
  assert.ok(!message.includes('Fixture public post'));
  assert.ok(!message.includes('Fixture Studio'));
});
test('metadata-only partial result cannot be described as post text or transcript', () => {
  const message=recoveryGuidance({ok:false,code:'CAPTIONS_NOT_FOUND',metadata:{status:'succeeded'}});
  assert.match(message,/Only video details were found/);
  assert.doesNotMatch(message,/[Pp]ost text/);
  assert.doesNotMatch(message,/transcript was/);
});
test('unexpected provider codes and hostile data never appear verbatim in guidance', () => {
  const malicious='<img src=x onerror=alert(1)>';
  const message=recoveryGuidance({ok:false,code:malicious,post:{text:malicious},rawError:malicious,url:'https://invalid.example/private'});
  assert.match(message,/Post text was found/);
  assert.match(message,/could not read this link/);
  assert.ok(!message.includes(malicious));
  assert.ok(!message.includes('invalid.example'));
  assert.ok(message.length < 500);
});
test('rate limit, oversized provider pages, and offline backend have distinct guidance', () => {
  assert.match(recoveryGuidance({ok:false,code:'RATE_LIMITED'}), /Wait a minute/);
  assert.match(recoveryGuidance({ok:false,code:'RESPONSE_TOO_LARGE'}), /too large/);
  assert.match(recoveryGuidance({ok:false,code:'BACKEND_UNAVAILABLE'}), /could not reach its server/);
});
