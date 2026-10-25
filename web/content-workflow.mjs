// Owner-private workflow controls. Creative work is performed in the chosen assistant.
import {creativePrompt} from './modules/content-workflow.mjs';
export function initContentWorkspace(){
 const $=id=>document.getElementById(id);let job=null,sourceId=null,busy=false;
 const status=message=>{$('content-status').textContent=message;};
 async function request(path,options){
  const response=await fetch(path,{cache:'no-store',...options});let data;try{data=await response.json();}catch{throw Error('CONTENT_BACKEND_UNAVAILABLE');}
  if(!response.ok)throw Error(data.code||'CONTENT_BACKEND_UNAVAILABLE');return data;
 }
 const json=value=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(value)});
 const download=(name,value,type='application/json')=>{const url=URL.createObjectURL(new Blob([value],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);};
 function render(){
  $('content-brief-panel').hidden=!job;
  $('content-copy-brief').disabled=!job;$('content-download-brief').disabled=!job;$('content-save-draft').disabled=!job||busy;
  $('content-poster-export').disabled=!job?.draft||job.brief.format!=='facebook_post';
  $('content-source').textContent=sourceId?'A saved Pen extraction will be used.':'Start from your idea. No source extraction selected.';
  $('content-summary').textContent=job?job.brief.source.selectedCharacters+' source characters selected'+(job.brief.source.truncated?' · Source shortened; full extraction remains stored.':'')+' · Creative work runs only in your chosen assistant.':'';
  $('content-prompt').textContent=job?creativePrompt(job.brief):'';
  $('content-preview').textContent=job?.draft?[job.draft.title,job.draft.message,job.draft.hashtags.join(' '),job.draft.visualBrief,job.draft.script].filter(Boolean).join('\n\n'):'';
 }
 async function list(){
  try{const data=await request('/api/content');const container=$('content-jobs');container.replaceChildren();
   for(const item of data.jobs){const button=document.createElement('button');button.type='button';button.className='outline';button.textContent=item.title+' · '+item.status;button.addEventListener('click',()=>open(item.id));container.append(button);}
   if(!data.jobs.length)container.textContent='Your content jobs will appear here.';
  }catch{status('Content workflow requires the updated owner-private Site backend.');}
 }
 async function open(id){
  if(busy)return;busy=true;render();
  try{const data=await request('/api/content/'+encodeURIComponent(id));job=data.job;sourceId=job.brief.source.extractionId;$('content-idea').value=job.brief.idea;$('content-constraints').value=job.brief.constraints;$('content-format').value=job.brief.format;$('content-budget').value=String(job.brief.source.characterBudget);$('content-response').value=job.draft?JSON.stringify(job.draft,null,2):'';status('Saved job opened. Draft preparation and validation use ordinary code.');}
  catch(e){status('Could not open content job. '+e.message);}
  finally{busy=false;render();}
 }
 $('content-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;render();$('content-create').disabled=true;
  try{const input={idea:$('content-idea').value,constraints:$('content-constraints').value,format:$('content-format').value,sourceChars:Number($('content-budget').value),...(sourceId?{extractionId:sourceId}:{})};
   const data=await request('/api/content',json(input));job=data.job;$('content-response').value=job.draft?JSON.stringify(job.draft,null,2):'';status(data.reused?'Identical brief reused. Existing creative work was preserved.':'Brief saved. Use one creative pass in your assistant, then save its structured response.');void list();
  }catch(e){status('Could not prepare the brief. '+e.message);}
  finally{busy=false;$('content-create').disabled=false;render();}
 });
 $('content-copy-brief').addEventListener('click',async()=>{if(!job)return;try{await navigator.clipboard.writeText(creativePrompt(job.brief));status('Compact brief copied. Ask your assistant for the JSON response once.');}catch{status('Clipboard unavailable. Download the brief instead.');}});
 $('content-download-brief').addEventListener('click',()=>{if(job)download('gs-pen-creative-brief.txt',creativePrompt(job.brief),'text/plain;charset=utf-8');});
 $('content-save-draft').addEventListener('click',async()=>{
  if(!job||busy)return;busy=true;render();
  try{const raw=$('content-response').value.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/,'$1');let draft;try{draft=JSON.parse(raw);}catch{throw Error('INVALID_CONTENT_JSON');}
   const data=await request('/api/content/draft',json({id:job.id,inputHash:job.inputHash,version:job.version,draft}));job=data.job;status('Draft validated and saved. Nothing has been sent or published.');void list();
  }catch(e){status('Draft not saved. '+e.message+(e.message==='CONTENT_VERSION_CONFLICT'?' Reopen the job before editing again.':''));}
  finally{busy=false;render();}
 });
 $('content-poster-export').addEventListener('click',async()=>{
  if(!job?.draft||busy)return;busy=true;render();
  try{const payload=await request('/api/content/'+job.id+'/poster');download('gs-pen-poster-draft.json',JSON.stringify(payload,null,2));status('Poster draft fields exported. Poster is not connected here; this draft has not been sent.');}
  catch(e){status('Could not prepare Poster fields. '+e.message);}
  finally{busy=false;render();}
 });
 $('content-clear-source').addEventListener('click',()=>{if(busy)return;sourceId=null;job=null;$('content-response').value='';render();status('Source cleared. Prepare a new brief to use the current idea.');});
 window.addEventListener('hashchange',()=>{if(location.hash==='#create')void list();});
 render();if(location.hash==='#create')void list();
 return {useExtraction(id){if(busy)return;sourceId=id;job=null;$('content-response').value='';location.hash='create';render();status('Saved extraction selected. Add your idea or desired angle.');}};
}
