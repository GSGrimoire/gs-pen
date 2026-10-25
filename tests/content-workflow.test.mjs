import test from 'node:test';import assert from 'node:assert/strict';
import {contentInput,createBrief,creativePrompt,briefHash,draftContent,posterDraft} from '../src/content-workflow.mjs';
const id='00000000-0000-4000-8000-000000000001';
const draft={title:'The Lighthouse Key',message:'A key that finds a door when the fog arrives.',hashtags:['#DnD','#DnD'],visualBrief:'A brass key beside a lighthouse.',images:[]};
test('Brief processing is bounded, explicit about omissions, and keeps original source separate',async()=>{
 const input=contentInput({idea:'A magic item',extractionId:id,sourceChars:2000});
 const source={sourceUrl:'https://www.facebook.com/reel/123456789012345',result:{post:{text:'日'.repeat(3000),provenance:'Public preview',completeness:'page_preview_may_be_truncated'},cues:[{start:'00:00:01',text:'Caption'}],events:[{private:'never share'}],metadata:{fields:{likes:42}}}};
 const brief=createBrief(input,source);assert.equal(Array.from(brief.source.text).length,2000);assert.equal(brief.source.truncated,true);assert.equal(brief.source.characterBudget,2000);assert.equal(brief.source.provenance.postCompleteness,'page_preview_may_be_truncated');assert.equal(brief.source.provenance.independentTranscript,'not_implemented');
 assert.ok(!creativePrompt(brief).includes('never share'));assert.ok(!creativePrompt(brief).includes('likes'));assert.equal(await briefHash(brief),await briefHash(createBrief(input,source)));
 assert.notEqual(await briefHash(brief),await briefHash(createBrief({...input,idea:'Another idea'},source)));
});
test('Duplicate cues are compressed only in the selected creative brief',()=>{
 const source={sourceUrl:'source',result:{cues:[{start:'1',text:'A repeated line'},{start:'2',text:'A repeated line'},{start:'3',text:'A new line'}]}};
 const brief=createBrief(contentInput({idea:'An item'}),source);assert.equal(brief.source.text.split('A repeated line').length-1,1);assert.equal(source.result.cues.length,3);
 assert.equal(createBrief(contentInput({idea:'An idea'})).source.kind,'none');
});
test('Content options and creative responses reject unknown actions and enforce small output bounds',()=>{
 for(const raw of [{idea:'x',ownerId:'other'},{idea:'x',sourceChars:999},{idea:'x',format:'auto_publish'},{idea:'x',extractionId:'not-an-id'},{idea:' '}])assert.throws(()=>contentInput(raw));
 for(const raw of [{...draft,publish:true},{...draft,message:'x'.repeat(1801)},{...draft,message:'A price: €12'},{...draft,message:'Midjourney image'},{...draft,message:'An em\u2014dash'},{...draft,hashtags:['not a hashtag']},{...draft,images:['https://github.com.evil.test/a/b/image.png']},{...draft,images:['https://user:pass@github.com/a/b/image.png']},{...draft,images:['https://github.com/a/b/image.png?token=private']}])assert.throws(()=>draftContent(raw,'facebook_post'));
 assert.deepEqual(draftContent(draft,'facebook_post').hashtags,['#DnD']);assert.throws(()=>draftContent(draft,'reel_script'));assert.throws(()=>draftContent({...draft,script:'Not a Facebook field'},'facebook_post'));
});
test('Poster export is exact, deterministic and truthfully unsent; reel upload is not fabricated',()=>{
 const result=posterDraft({id,inputHash:'hash',brief:{format:'facebook_post'},draft});assert.equal(result.tool,'draft_post');assert.equal(result.submissionStatus,'not_sent');assert.equal(result.requiresOwnerApproval,true);assert.equal(result.arguments.message,draft.message+'\n\n#DnD');assert.equal(result.arguments.release,'Pen '+id);assert.ok(!('script' in result.arguments));assert.ok(!('publish_at' in result.arguments));
 assert.throws(()=>posterDraft({brief:{format:'facebook_post'}}));assert.throws(()=>posterDraft({id,brief:{format:'reel_script'},draft:{...draft,script:'A short script'}}));
});
