'use strict';

// Evidence files remain on this device; metadata is stored with each progress record.
let progressCapture=null;
let evidencePreviewURL='';
let evidenceDatabase=null;
const EVIDENCE_LIMIT=10*1024*1024;
const EVIDENCE_COUNT=5;

function objectivePosition(id,g,o){return `Goal ${goalPlansFor(id).indexOf(g)+1} · Objective ${g.objectives.indexOf(o)+1}`}
function openProgressModal(id,comparison=''){
 const c=state.comparisons.find(x=>x.id===comparison),target=c?.objectiveIds?.[id];
 let g=target?goalPlansFor(id).find(g=>g.objectives.some(o=>o.id===target)):activeGoal(id);
 let o=target?g?.objectives.find(o=>o.id===target):activeObjective(id);
 if(!g||!o||o.status!=='approved')return toast('Establish an objective in the IEP plan first.');
 clearProgressCapture();
 progressCapture={student:id,goal:g.id,objective:o.id,comparison,step:1,mode:'upload',files:[],values:{correct:'',attempts:'5',support:'independent',date:TODAY,note:'',phase:'followup'},saving:false};
 renderProgressModal();
}
function renderProgressModal(){
 const p=progressCapture;if(!p)return;
 const s=getStudent(p.student),g=findGoal(s.id,p.goal),o=g?.objectives.find(x=>x.id===p.objective);if(!o)return;
 const context=`<div class="capture-context"><span>${objectivePosition(s.id,g,o)}</span><p>${esc(o.skill)}</p></div>`;
 const steps=`<ol class="capture-steps" aria-label="Record progress steps"><li ${p.step===1?'aria-current="step"':''}>1. Evidence</li><li ${p.step===2?'aria-current="step"':''}>2. Progress</li></ol>`;
 openModal('Record progress',s.name,`<div class="progress-capture">${context}${steps}${p.step===1?evidenceStep():recordProgressStep(g,o)}</div>`);
}
function evidenceStep(){
 const p=progressCapture;
 const choices=[['upload','Upload files from this device'],['scan','Scan using mobile device'],['manual','Enter manually']];
 return `<fieldset class="evidence-methods"><legend>How would you like to add progress?</legend>${choices.map(([value,label])=>`<label class="evidence-method"><input type="radio" name="evidence-method" value="${value}" ${p.mode===value?'checked':''}>${label}</label>`).join('')}</fieldset>
  <div id="evidence-picker">${evidencePicker()}</div><div id="evidence-error" aria-live="polite"></div>
  <div class="modal-foot capture-foot">${btn('Cancel','close')}<button class="btn primary" data-action="progress-next" ${p.mode!=='manual'&&!p.files.length?'disabled':''}>Next ${icon('arrow')}</button></div>`;
}
function evidencePicker(){
 const p=progressCapture;if(p.mode==='manual')return '';
 return `<div class="evidence-upload ${p.mode==='scan'?'camera-upload':''}"><div>${icon(p.mode==='scan'?'image':'note')}</div><button class="btn" data-action="${p.mode==='scan'?'capture-photo':'choose-evidence'}">${p.mode==='scan'?'Take photo':'Choose files'}</button><p>${p.mode==='scan'?'Use your phone or tablet camera. On a computer, select a photo.':'PDF, JPG or PNG · Up to 5 files, 10 MB each'}</p></div><input id="evidence-files" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" multiple hidden><input id="evidence-camera" type="file" accept="image/jpeg,image/png" capture="environment" hidden>
  ${p.files.length?`<ul class="evidence-file-list" aria-label="Selected evidence">${p.files.map(f=>`<li><div>${icon('plan')}<span><strong>${esc(f.file.name)}</strong><small>${fileSize(f.file.size)}${f.source==='scan'?' · Camera':''}</small></span></div><button class="icon-btn" data-action="remove-evidence" data-id="${f.id}" aria-label="Remove ${esc(f.file.name)}">${icon('close')}</button></li>`).join('')}</ul><p class="caption evidence-local">Files are saved on this device with the progress record.</p>`:''}`;
}
function fileSize(size){return size<1024*1024?Math.max(1,Math.round(size/1024))+' KB':(size/(1024*1024)).toFixed(1)+' MB'}
function recordProgressStep(g,o){
 const p=progressCapture,v=p.values,c=state.comparisons.find(c=>c.id===p.comparison);
 return `<form id="log-form" class="capture-form"><input type="hidden" name="student" value="${p.student}"><input type="hidden" name="goal" value="${g.id}"><input type="hidden" name="objective" value="${o.id}"><input type="hidden" name="comparison" value="${esc(p.comparison)}">
 ${p.mode!=='manual'?`<div class="attached-summary">${icon('plan')}<span>${p.files.length} ${p.files.length===1?'file':'files'} attached</span><button type="button" class="text-btn" data-action="progress-back">View files</button></div><p class="capture-hint">Enter the result from the student’s work.</p>`:''}
 <div class="field-row"><div class="field"><label for="log-correct">Independent correct answers</label><input id="log-correct" name="correct" type="number" min="0" max="100" required inputmode="numeric" value="${esc(v.correct)}" placeholder="0"></div><div class="field"><label for="log-attempts">Total opportunities</label><input id="log-attempts" name="attempts" type="number" min="1" max="100" value="${esc(v.attempts)}" required inputmode="numeric"></div></div>
 <div id="score-preview" class="caption score-preview">${v.correct!==''?`${Math.round(+v.correct/+v.attempts*100)}% independent accuracy`:'Count answers completed without adult prompts.'}</div>
 <div class="field-row"><div class="field"><label for="log-support">Additional support</label><select id="log-support" name="support">${[['independent','None'],['verbal','Verbal prompts'],['guided','Guided support']].map(([key,text])=>`<option value="${key}" ${v.support===key?'selected':''}>${text}</option>`).join('')}</select></div><div class="field"><label for="log-date">Date</label><input id="log-date" name="date" type="date" max="${TODAY}" value="${esc(v.date)}" required></div></div>
 ${c?`<div class="field"><label for="log-phase">${esc(c.title)}</label><select id="log-phase" name="phase"><option value="followup" ${v.phase==='followup'?'selected':''}>Follow-up observation</option><option value="baseline" ${v.phase==='baseline'?'selected':''}>Baseline</option></select></div>`:'<input type="hidden" name="phase" value="followup">'}
 <details class="disclosure" ${v.note?'open':''}><summary>Add a note</summary><div class="field"><label for="log-note" class="sr-only">Observation</label><textarea id="log-note" name="note" rows="2" maxlength="2000" placeholder="What helped or made the task harder?">${esc(v.note)}</textarea></div></details>
 <div id="log-error" aria-live="polite"></div><div class="modal-foot capture-foot"><button type="button" class="btn" data-action="progress-back">${icon('back')} Back</button><button class="btn primary" type="submit">Save progress</button></div></form>`;
}
function rememberProgressInputs(){
 const form=document.getElementById('log-form');if(!progressCapture||!form)return;
 for(const key of ['correct','attempts','support','date','note','phase']){const input=form.querySelector(`[name="${key}"]`);if(input)progressCapture.values[key]=input.value;}
}
function handleProgressAction(action,el){
 if(action==='view-evidence'){viewEvidence(el.dataset.id);return true;}
 if(!progressCapture)return false;
 if(action==='choose-evidence'||action==='capture-photo'){document.getElementById(action==='choose-evidence'?'evidence-files':'evidence-camera')?.click();return true;}
 if(action==='remove-evidence'){progressCapture.files=progressCapture.files.filter(f=>f.id!==el.dataset.id);renderProgressModal();return true;}
 if(action==='progress-next'){
  if(progressCapture.mode!=='manual'&&!progressCapture.files.length){formError('evidence-error','Choose a file or take a photo to continue.');return true;}
  progressCapture.step=2;renderProgressModal();return true;
 }
 if(action==='progress-back'){rememberProgressInputs();progressCapture.step=1;renderProgressModal();return true;}
 return false;
}
function handleProgressChange(input){
 if(!progressCapture)return false;
 if(input.name==='evidence-method'){progressCapture.mode=input.value;renderProgressModal();return true;}
 if(input.id==='evidence-files'||input.id==='evidence-camera'){addProgressFiles(Array.from(input.files||[]),input.id==='evidence-camera'?'scan':'upload');return true;}
 return false;
}
function fileKind(file){
 const extension=file.name.split('.').pop().toLowerCase();
 const expected={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'}[extension];
 return expected&&(!file.type||file.type===expected)?expected:null;
}
function addProgressFiles(files,source){
 if(!progressCapture)return;
 const errors=[];
 for(const file of files){
  if(progressCapture.files.length>=EVIDENCE_COUNT){errors.push('You can add up to 5 files.');break;}
  const type=fileKind(file);
  if(!type||(source==='scan'&&!type.startsWith('image/'))){errors.push(`${file.name}: choose a PDF, JPG or PNG file.`);continue;}
  if(file.size<=0||file.size>EVIDENCE_LIMIT){errors.push(`${file.name}: choose a file under 10 MB that is not empty.`);continue;}
  if(progressCapture.files.some(f=>f.file.name===file.name&&f.file.size===file.size&&f.file.lastModified===file.lastModified))continue;
  progressCapture.files.push({id:uid('evidence'),file,type,source});
 }
 renderProgressModal();
 if(errors.length)formError('evidence-error',errors.join(' '));
}
function evidenceDb(){
 if(evidenceDatabase)return evidenceDatabase;
 evidenceDatabase=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB)return reject(new Error('File storage is unavailable in this browser.'));
  const request=indexedDB.open('clearpath-evidence',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(new Error('Close other Clearpath tabs and try again.'));
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();evidenceDatabase=null;};resolve(db);};
 }).catch(error=>{evidenceDatabase=null;throw error;});
 return evidenceDatabase;
}
async function saveEvidenceFiles(files){
 if(!files.length)return [];
 const db=await evidenceDb();
 await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite'),store=tx.objectStore('files');for(const f of files)store.put({id:f.id,name:f.file.name,size:f.file.size,type:f.type,blob:f.file});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Could not save files.'));});
 return files.map(f=>({id:f.id,name:f.file.name,size:f.file.size,type:f.type,source:f.source}));
}
async function removeEvidenceFiles(ids){
 if(!ids.length)return;
 try{const db=await evidenceDb();await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');for(const id of ids)tx.objectStore('files').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch{}
}
async function clearEvidenceFiles(){try{const db=await evidenceDb();db.transaction('files','readwrite').objectStore('files').clear();}catch{}}
function progressAttachments(log){
 return (log.attachments||[]).length?`<div class="record-attachments">${log.attachments.map(f=>`<button class="text-btn" data-action="view-evidence" data-id="${f.id}" aria-label="Open ${esc(f.name)}">${icon('plan')}${esc(f.name)}</button>`).join('')}</div>`:'';
}
async function viewEvidence(id){
 try{
  const db=await evidenceDb();const file=await new Promise((resolve,reject)=>{const r=db.transaction('files').objectStore('files').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  if(!file)throw new Error('This file is no longer available on this device.');
  if(evidencePreviewURL)URL.revokeObjectURL(evidencePreviewURL);
  evidencePreviewURL=URL.createObjectURL(file.blob);
  const preview=file.type==='application/pdf'?`<object class="evidence-preview-pdf" data="${evidencePreviewURL}" type="application/pdf"><p>Download this PDF to view it.</p></object>`:`<img class="evidence-preview-image" src="${evidencePreviewURL}" alt="${esc(file.name)}">`;
  openModal(file.name,'Progress evidence',`${preview}<div class="modal-foot">${btn('Close','close')}<a class="btn" href="${evidencePreviewURL}" download="${esc(file.name)}">Download</a></div>`,{wide:true});
 }catch(error){toast(error.message||'Could not open this file.');}
}
function clearProgressCapture(){progressCapture=null;if(evidencePreviewURL){URL.revokeObjectURL(evidencePreviewURL);evidencePreviewURL='';}}
async function saveProgressRecord(d,form){
 const p=progressCapture;if(!p||p.saving)return;
 const g=findGoal(d.student,d.goal),o=g?.objectives.find(o=>o.id===d.objective);
 if(!o||o.status!=='approved'||d.student!==p.student||d.objective!==p.objective)return formError('log-error','Select an established objective before recording progress.');
 const correct=+d.correct,attempts=+d.attempts;
 if(d.correct===''||!Number.isInteger(correct)||!Number.isInteger(attempts)||attempts<1||attempts>100||correct<0||correct>attempts)return formError('log-error','Correct answers must be between zero and the total.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||Number.isNaN(Date.parse(d.date))||d.date>TODAY)return formError('log-error','Choose a date on or before today.');
 if(p.mode!=='manual'&&!p.files.length)return formError('log-error','Go back and add a file, or choose Enter manually.');
 p.saving=true;
 const submit=form.querySelector?.('[type="submit"]');if(submit){submit.disabled=true;submit.textContent='Saving…';}
 let attachments=[];
 try{
  attachments=await saveEvidenceFiles(p.mode==='manual'?[]:p.files);
  const record={...d,id:uid('log'),correct,attempts,score:Math.round(correct/attempts*100),attachments,entryMethod:p.mode,support:d.support==='verbal'?'Verbal prompts on other opportunities':d.support==='guided'?'Guided support on other opportunities':'No extra help'};
  state.logs.unshift(record);
  if(!persist()){state.logs=state.logs.filter(l=>l.id!==record.id);throw new Error('Progress could not be saved. Browser storage may be full.');}
  p.saving=false;closeModal();render();toast('Progress saved.');
 }catch(error){
  await removeEvidenceFiles(attachments.map(f=>f.id));p.saving=false;
  formError('log-error',error.message||'Files could not be saved. Try smaller files or enter manually.');
  if(submit){submit.disabled=false;submit.textContent='Save progress';}
 }
}
