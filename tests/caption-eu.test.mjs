import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCaptionAsset } from '../server/caption.mjs';
import { captionCdnFamily,sanitizeDiagnostic } from '../src/diagnostics.mjs';
test('Observed European TikTok caption host is narrowly classified and lookalikes remain rejected',()=>{
 assert.equal(validateCaptionAsset('https://v16-webapp.tiktokcdn-eu.com/subtitle').cdnFamily,'tiktokcdn_eu');
 for(const u of ['https://tiktokcdn-eu.com.evil.test/subtitle','https://eviltiktokcdn-eu.com/subtitle','http://v16-webapp.tiktokcdn-eu.com/subtitle','https://user:secret@v16-webapp.tiktokcdn-eu.com/subtitle'])assert.equal(validateCaptionAsset(u),null);
 assert.equal(captionCdnFamily('v16-webapp.tiktokcdn-eu.com'),'tiktokcdn_eu');
 assert.equal(sanitizeDiagnostic({traceId:'synthetic',cdnFamily:'tiktokcdn_eu'}).cdnFamily,'tiktokcdn_eu');
});
