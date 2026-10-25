import test from 'node:test';import assert from 'node:assert/strict';
import {exportRecord,exportText,tabText} from '../src/extraction-export.mjs';
const result={ok:true,code:'OK',cues:[{start:'00:00:01.000',text:'Synthetic platform caption'}],post:{text:'Fixture description',provenance:'Public share title',completeness:'page_preview_may_be_truncated'},metadata:{status:'succeeded',provenance:'Public page',fields:{creator:'Fixture creator',likes:0}},events:[{secret:'diagnostic'}],unpersistedCaptionHost:'signed.test'};
test('Text and structured exports retain provenance, partial outputs and transcript separation',()=>{
 const r=exportRecord(result,'https://www.facebook.com/reel/123456789012345');assert.equal(r.independentTranscript.status,'not_implemented');assert.equal(r.result.captionType,'platform');assert.equal(r.result.events,undefined);assert.ok(!JSON.stringify(r).includes('signed.test'));
 const text=exportText(result,r.sourceUrl);for(const x of ['not independently transcribed','may be shortened','Fixture description','likes: 0','not implemented'])assert.ok(text.includes(x));
 assert.equal(tabText(result,'whisper'),'');assert.equal(tabText({...result,ok:false},'captions'),'');assert.ok(exportText({...result,ok:false,cues:[]},r.sourceUrl).includes('Fixture description'));
});
