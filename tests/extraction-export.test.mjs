import test from 'node:test';import assert from 'node:assert/strict';
import {exportRecord,exportText,tabText,exportSubRip} from '../src/extraction-export.mjs';
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

test('Claude desktop link includes exactly 12000 prompt characters and excludes 12001',()=>{
 const source='source',base={...result,post:{...result.post,text:''}};
 const overhead=assistantHandoff(base,source,'claude').prompt.length;
 for(const length of [12000,12001]){
  const handoff=assistantHandoff({...base,post:{...base.post,text:'x'.repeat(length-overhead)}},source,'claude');
  assert.equal(handoff.prompt.length,length);assert.ok(encodeURIComponent(handoff.prompt).length<24000);
  assert.equal(handoff.desktopUrl!==null,length===12000);
 }
});
test('Claude desktop link includes exactly 24000 encoded characters and excludes 24001',()=>{
 const source='source',base={...result,post:{...result.post,text:''}};
 const overhead=encodeURIComponent(assistantHandoff(base,source,'claude').prompt).length;
 for(const length of [24000,24001]){
  const remaining=length-overhead,text='é'.repeat(Math.floor(remaining/6))+'x'.repeat(remaining%6);
  const handoff=assistantHandoff({...base,post:{...base.post,text}},source,'claude');
  assert.equal(encodeURIComponent(handoff.prompt).length,length);assert.ok(handoff.prompt.length<12000);
  assert.equal(handoff.desktopUrl!==null,length===24000);
  if(handoff.desktopUrl)assert.equal(new URL(handoff.desktopUrl).searchParams.get('q'),handoff.prompt);
 }
});


test('SubRip exporter preserves native cue order and complete timestamps',()=>{
 const cues=[
  {start:'00:00:01.000',end:'00:00:02.500',text:'First synthetic caption'},
  {start:'00:03.040',end:'00:05.210',text:'Second line\nMore text'}
 ];
 const actual=exportSubRip({ok:true,cues});
 const expected='1\r\n00:00:01,000 --> 00:00:02,500\r\nFirst synthetic caption\r\n\r\n'
  +'2\r\n00:00:03,040 --> 00:00:05,210\r\nSecond line\r\nMore text\r\n';
 assert.equal(actual,expected);
 assert.ok(!actual.includes('Whisper'));
});
test('SubRip refuses missing or invented timing and partial post-only results',()=>{
 const valid={start:'00:00:01.000',end:'00:00:02.000',text:'Caption'};
 for(const value of [null,{ok:false,cues:[valid]},{ok:true,cues:[]},
  {ok:true,cues:[{...valid,end:undefined}]},
  {ok:true,cues:[{...valid,start:'00:00:02.000'}]},
  {ok:true,cues:[valid,{...valid,end:'01:xx:02.000'}]},
  {ok:true,cues:[{...valid,text:'   '}]},
  {ok:true,cues:[{...valid,start:'00:00:70.000'}]}]){
  assert.equal(exportSubRip(value),'');
 }
 assert.equal(exportSubRip({ok:false,code:'NOT_IMPLEMENTED',cues:[],post:{text:'Public preview'}}),'');
});
test('SubRip preserves unusual source text as text and does not include diagnostics',()=>{
 const output=exportSubRip({ok:true,cues:[{start:'01:02:03.004',end:'01:02:04.500',text:'<b>Quoted cue</b>\r\nMore text'}],events:[{secret:'DO_NOT_LOG'}]});
 assert.ok(output.includes('01:02:03,004 --> 01:02:04,500'));
 assert.ok(output.includes('<b>Quoted cue</b>\r\nMore text'));
 assert.ok(!output.includes('DO_NOT_LOG'));
});
