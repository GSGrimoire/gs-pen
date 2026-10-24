import test from 'node:test';import assert from 'node:assert/strict';
import {exportRecord,exportText,tabText} from '../src/extraction-export.mjs';
const result={ok:true,code:'OK',cues:[{start:'00:00:01.000',text:'Synthetic platform caption'}],post:{text:'Fixture description',provenance:'Public share title',completeness:'page_preview_may_be_truncated'},metadata:{status:'succeeded',provenance:'Public page',fields:{creator:'Fixture creator',likes:0}},events:[{secret:'diagnostic'}],unpersistedCaptionHost:'signed.test'};
test('Text and structured exports retain provenance, partial outputs and transcript separation',()=>{
 const r=exportRecord(result,'https://www.facebook.com/reel/123456789012345');assert.equal(r.independentTranscript.status,'not_implemented');assert.equal(r.result.captionType,'platform');assert.equal(r.result.events,undefined);assert.ok(!JSON.stringify(r).includes('signed.test'));
 const text=exportText(result,r.sourceUrl);for(const x of ['not independently transcribed','may be shortened','Fixture description','likes: 0','not implemented'])assert.ok(text.includes(x));
 assert.equal(tabText(result,'whisper'),'');assert.equal(tabText({...result,ok:false},'captions'),'');assert.ok(exportText({...result,ok:false,cues:[]},r.sourceUrl).includes('Fixture description'));
});

import {assistantHandoff} from '../src/extraction-export.mjs';
test('Assistant package includes every output with provenance and excludes diagnostics',()=>{
 const data={...result,captionTrackCount:2,cues:[{start:'00:00:01.000',end:'00:00:02.000',text:'Synthetic platform caption'}],post:{...result.post,hashtags:['#fixture']}};
 const {prompt,url,desktopUrl}=assistantHandoff(data,'https://example.test/source','claude');
 for(const value of ['Synthetic platform caption','00:00:02.000','#fixture','Fixture creator','page_preview_may_be_truncated','not_implemented','"captionTrackCount": 2','quoted source data'])assert.ok(prompt.includes(value),value);
 assert.ok(!prompt.includes('"secret"'));assert.ok(!prompt.includes('signed.test'));assert.equal(url,'https://claude.ai/new');assert.equal(new URL(desktopUrl).searchParams.get('q'),prompt);
 assert.equal(assistantHandoff(data,'source','chatgpt').desktopUrl,null);assert.equal(assistantHandoff(data,'source','chatgpt').url,'https://chatgpt.com/');
 assert.throws(()=>assistantHandoff(data,'source','unknown'));
});
test('Long and unicode packages are copied completely without truncated launch links',()=>{
 for(const text of ['word '.repeat(8000),'日'.repeat(5000)]){
  const handoff=assistantHandoff({...result,post:{...result.post,text}},'source','claude');assert.equal(handoff.desktopUrl,null);assert.ok(handoff.prompt.includes(text));
 }
 const partial=assistantHandoff({...result,ok:false,cues:[]},'source','claude').prompt;assert.ok(partial.includes('Fixture description'));assert.ok(partial.includes('"ok": false'));
});
