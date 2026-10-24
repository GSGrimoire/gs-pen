export function exportRecord(result,sourceUrl) {
  return {schema:'gs-pen.extraction.v1',exportedAt:new Date().toISOString(),sourceUrl,
    result:{ok:!!result.ok,code:result.code,captionType:'platform',captionTrackCount:result.captionTrackCount||0,cues:result.cues||[],post:result.post||null,metadata:result.metadata||null},
    independentTranscript:{status:'not_implemented',text:null}};
}
export function tabText(result,tab) {
  if(tab==='captions')return result.ok&&result.cues?.length?'Original platform captions (not independently transcribed)\n\n'+result.cues.map(c=>c.start+'  '+c.text).join('\n'):'';
  if(tab==='post')return result.post?.text?'Original post text\nSource: '+result.post.provenance+(result.post.completeness==='page_preview_may_be_truncated'?'\nPublic share preview; text may be shortened.':'')+'\n\n'+result.post.text:'';
  if(tab==='metadata')return result.metadata?.status==='succeeded'?'Public video metadata\nSource: '+result.metadata.provenance+'\n\n'+Object.entries(result.metadata.fields).map(([k,v])=>k+': '+v).join('\n'):'';
  return '';
}
export function exportText(result,sourceUrl) {
  return ['GS Pen extraction','Source: '+sourceUrl,'',...['captions','post','metadata'].map(t=>tabText(result,t)).filter(Boolean),'','Independent Whisper transcript: not implemented.'].join('\n\n');
}
