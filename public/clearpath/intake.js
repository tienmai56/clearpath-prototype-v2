'use strict';

const INTAKE_EMPTY_STUDENTS=['amir','ava','ben'];
const intakeSessions=new Map();
const intakeTypes={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',heic:'image/heic',heif:'image/heif',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'};
function isIntakeStudent(s){return s.isNew||INTAKE_EMPTY_STUDENTS.includes(s.id);}
function intakeSession(id){if(!intakeSessions.has(id))intakeSessions.set(id,{student:id,loaded:false,loading:false,files:[],savedDrafts:{},stage:'upload',selected:{presentLevels:true,goal:true},draft:null,dirty:false,error:'',uploading:'',saving:false,phoneOpen:false,transfer:null,analysisStep:0});return intakeSessions.get(id);}
function intakeVisible(id){const r=route();return r.page==='student'&&r.id===id&&!r.student&&!r.objective;}
function refreshIntake(id){if(route().page==='student'&&route().id===id)render();}
async function intakeRequest(id,path='',options={}){
 const response=await fetch('/api/intakes/'+encodeURIComponent(id)+path,{...options,credentials:'same-origin',cache:'no-store'});
 if(!response.ok){const data=await response.json().catch(()=>({error:'Could not connect. Please try again.'}));throw new Error(data.error||'Could not save these materials.');}
 return response;
}
function syncIntakeGoal(id,goal,force=false){
 if(!goal)return;const existing=findGoal(id,goal.id);
 if(!existing){state.goalPlans[id] ||= [];state.goalPlans[id].push(structuredClone(goal));persist();}
 else if(force||String(goal.updatedAt||'')>String(existing.updatedAt||'')){state.goalPlans[id]=state.goalPlans[id].map(g=>g.id===goal.id?structuredClone(goal):g);persist();}
}
async function loadStudentIntake(id){
 const p=intakeSession(id);if(p.loading)return;p.loading=true;p.error='';
 try{const data=await (await intakeRequest(id)).json();p.files=data.files;p.savedDrafts=data.drafts||{};syncIntakeGoal(id,p.savedDrafts.goal);if(!p.loaded&&p.savedDrafts.presentLevels)p.stage='saved';p.loaded=true;}
 catch(error){p.loaded=true;p.error=error.message;}
 finally{p.loading=false;refreshIntake(id);}
}
function ensureStudentIntake(s){const p=intakeSession(s.id);if(!p.loaded&&!p.loading)loadStudentIntake(s.id);return p;}
function intakeProgress(stage){const current={upload:0,analyzing:1,select:2,drafts:3,saved:3}[stage]||0;return `<ol class="intake-steps" aria-label="Draft preparation"><li ${current===0?'aria-current="step"':''}><span>1</span>Upload</li><li ${current===1?'aria-current="step"':''}><span>2</span>Analyze</li><li ${current===2?'aria-current="step"':''}><span>3</span>Choose outputs</li><li ${current===3?'aria-current="step"':''}><span>4</span>Edit &amp; save</li></ol>`;}
function intakeFileList(p,removable=true){
 return p.files.length?`<ul class="intake-file-list" aria-label="Uploaded source files">${p.files.map(f=>`<li><span class="intake-file-icon">${icon(f.type.startsWith('video/')?'video':'note')}</span><div><button class="intake-file-name" data-action="intake-preview" data-id="${p.student}" data-file="${f.id}">${esc(f.name)}</button><small>${fileSize(f.size)} · ${f.source==='phone'?'From phone':'From laptop'}<span class="intake-file-confirmed">${icon('check')}Received</span></small></div><button class="text-btn" data-action="intake-preview" data-id="${p.student}" data-file="${f.id}" aria-label="Preview ${esc(f.name)}">Preview</button>${removable?`<button class="icon-btn" data-action="intake-remove" data-id="${p.student}" data-file="${f.id}" aria-label="Remove ${esc(f.name)}" ${p.uploading?'disabled':''}>${icon('close')}</button>`:''}</li>`).join('')}</ul>`:'';
}
function intakePhoneView(p){
 if(!p.phoneOpen)return '';const t=p.transfer;
 if(!t||t.loading)return `<div class="intake-phone"><p role="status">Creating a QR code…</p></div>`;
 if(t.error)return `<div class="intake-phone"><p role="alert">${esc(t.error)}</p>${btn('Create new code','intake-phone-retry','',`data-id="${p.student}"`)}</div>`;
 return `<div class="intake-phone"><div class="qr-image" role="img" aria-label="Scan this code to upload documents or videos from your phone">${t.qr}</div><div><h3>Scan with your phone</h3><ol><li>Scan the code and sign in with the same ChatGPT account.</li><li>Choose documents, photos, or videos on your phone.</li><li>Wait for confirmation; files appear here automatically.</li></ol><p class="intake-phone-status" role="status">${esc(t.status||'Waiting for files…')}</p><p class="intake-small">Code expires at ${new Date(t.expires).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</p><div class="actions"><button class="text-btn" data-action="intake-copy-link" data-id="${p.student}">Copy link</button><button class="text-btn" data-action="intake-phone-close" data-id="${p.student}">Close phone upload</button></div></div></div>`;
}
function intakeUploadView(s,p){
 return `<div class="intake-heading"><h2>${p.savedDrafts.presentLevels?'Add source materials':'No present levels assessment yet'}</h2><p>Upload past progress reports, classroom assessments, full individual evaluations, or classroom photos and videos. Use these materials to draft present levels, IEP goals and objectives, or both.</p></div>${p.savedDrafts.goal&&!p.savedDrafts.presentLevels?`<p class="intake-saved-notice">${icon('check')}IEP draft saved. <button class="text-btn" data-action="intake-view-goal" data-id="${s.id}">View goal draft</button></p>`:''}
 <div class="intake-drop" data-intake-drop="${s.id}"><div class="intake-upload-mark">${icon('upload')}</div><h3>${p.files.length?'Add more supporting materials':'Start with the documents you already have'}</h3><div class="intake-upload-actions">${btn(icon('laptop')+'Upload from laptop','intake-laptop','primary',`data-id="${s.id}" ${p.loading||p.uploading||p.files.length>=10?'disabled':''}`)}${btn(icon('phone')+'Upload from phone','intake-phone','',`data-id="${s.id}" ${p.loading||p.uploading||p.files.length>=10?'disabled':''}`)}</div><p class="intake-small">Or drag files here · Up to 10 files</p><p class="intake-formats">PDF, Word, JPG, PNG, HEIC, MP4, MOV, WebM<br>Documents and images up to 10 MB · Videos up to 25 MB</p><input id="intake-files" data-student="${s.id}" type="file" accept="${Object.keys(intakeTypes).map(e=>'.'+e).join(',')}" multiple hidden></div>
 ${intakePhoneView(p)}${p.loading?'<p class="intake-status" role="status">Loading saved materials…</p>':''}${p.uploading?`<p class="intake-status" role="status"><span class="intake-spinner"></span>Uploading ${esc(p.uploading)}…</p>`:''}
 ${p.files.length?`<section class="intake-sources"><div class="intake-section-head"><h3>Source files</h3><span>${p.files.length} ${p.files.length===1?'file':'files'}</span></div>${intakeFileList(p)}</section>`:''}
 <div class="intake-footer"><span class="intake-small">${p.files.length?'Files are saved to this student’s profile.':'Add at least one file to continue.'}</span>${btn('Analyze files '+icon('arrow'),'intake-analyze','primary',`data-id="${s.id}" ${!p.files.length||p.uploading||p.loading?'disabled':''}`)}</div>`;
}
function intakeAnalysisView(p){
 const stages=['Preparing uploaded files','Organizing student information','Preparing draft options'];
 return `<div class="intake-analysis" role="status" aria-live="polite"><span class="intake-spinner large"></span><h2>Analyzing student information</h2><p>${p.files.length} source ${p.files.length===1?'file':'files'} for ${esc(getStudent(p.student).name)}</p><div class="intake-analysis-line"><span></span></div><ol>${stages.map((label,i)=>`<li class="${i<p.analysisStep?'done':i===p.analysisStep?'current':''}">${i<p.analysisStep?icon('check'):'<span class="intake-analysis-dot"></span>'}${label}</li>`).join('')}</ol><p class="intake-small">Prototype preview · Analysis is simulated</p></div>`;
}
function intakeChoiceView(s,p){
 return `<div class="intake-heading"><h2>What would you like to draft?</h2><p>Choose one or both. You can edit every draft before saving.</p></div><fieldset class="intake-choices"><legend class="sr-only">Choose draft outputs</legend>${[['presentLevels','Present levels assessment','Summary, academic strengths and needs, parent input, and measurable baseline.'],['goal','IEP goals & objectives','A learning goal with smaller, measurable objectives and success criteria.']].map(([key,label,description])=>`<label><input type="checkbox" data-intake-choice="${key}" data-student="${s.id}" ${p.selected[key]?'checked':''}><span><strong>${label}</strong><small>${description}</small></span></label>`).join('')}</fieldset><details class="intake-source-disclosure"><summary>Source files (${p.files.length})</summary>${intakeFileList(p,false)}</details><div class="intake-footer">${btn('Back to files','intake-back-files','',`data-id="${s.id}"`)}${btn('Create editable drafts '+icon('arrow'),'intake-create','primary',`id="intake-create-button" data-id="${s.id}" ${!p.selected.presentLevels&&!p.selected.goal?'disabled':''}`)}</div>`;
}
function intakeField(p,path,label,value,rows=3){return `<div class="field"><label for="intake-${path.replaceAll('.','-')}">${label}</label><textarea id="intake-${path.replaceAll('.','-')}" data-intake-field="${path}" data-student="${p.student}" rows="${rows}" maxlength="${path.startsWith('presentLevels')?6000:1200}">${esc(value)}</textarea></div>`;}
function intakeGoalFields(p,g){return `<div class="field"><label for="intake-goal-title">Goal name</label><input id="intake-goal-title" data-intake-field="goal.title" data-student="${p.student}" value="${esc(g.title)}" maxlength="160"></div>${intakeField(p,'goal.content','Goal statement',g.content)}<div class="field-row"><div class="field"><label for="intake-goal-domain">Learning area</label><select id="intake-goal-domain" data-intake-field="goal.domain" data-student="${p.student}">${Object.entries(domainNames).map(([key,label])=>`<option value="${key}" ${key===g.domain?'selected':''}>${label}</option>`).join('')}</select></div><div class="field"><label for="intake-goal-deadline">Goal deadline</label><input id="intake-goal-deadline" data-intake-field="goal.deadline" data-student="${p.student}" type="date" value="${g.deadline}"></div></div>${intakeField(p,'goal.baseline','Starting baseline',g.baseline,2)}<div class="intake-objectives"><h3>Objectives</h3><p class="intake-small">Edit each objective, then review its criteria, supports, and date.</p>${g.objectives.map((o,i)=>`<section class="intake-objective"><div class="intake-objective-title"><label for="intake-goal-objectives-${i}-skill">Objective ${i+1}:</label><textarea id="intake-goal-objectives-${i}-skill" data-intake-field="goal.objectives.${i}.skill" data-student="${p.student}" rows="2" maxlength="1200">${esc(o.skill)}</textarea></div><div class="intake-criteria-fields"><div class="field"><label for="intake-target-${i}">Target accuracy (%)</label><input id="intake-target-${i}" data-intake-field="goal.objectives.${i}.target" data-student="${p.student}" type="number" min="1" max="100" value="${o.target}"></div><div class="field"><label for="intake-checks-${i}">Consecutive checks</label><input id="intake-checks-${i}" data-intake-field="goal.objectives.${i}.checks" data-student="${p.student}" type="number" min="1" max="10" value="${o.checks}"></div><div class="field"><label for="intake-date-${i}">By date</label><input id="intake-date-${i}" data-intake-field="goal.objectives.${i}.deadline" data-student="${p.student}" type="date" value="${o.deadline}"></div></div>${intakeField(p,`goal.objectives.${i}.condition`,'Support conditions',o.condition,2)}</section>`).join('')}</div>`;}
function intakeDraftView(s,p){
 const d=p.draft,count=+p.selected.presentLevels + +p.selected.goal;
 return `<div class="intake-heading"><div class="intake-section-head"><h2>Review your ${count===1?'draft':'drafts'}</h2><span class="intake-draft-label">Editable draft</span></div><p>Make changes below, then save when you’re ready.</p></div><fieldset class="intake-editor" ${p.saving?'disabled':''}><legend class="sr-only">Editable drafts</legend>
 ${p.selected.presentLevels?`<details class="intake-draft-section" open><summary>Present levels assessment ${icon('down')}</summary><div>${[['summary','Summary',4],['strengths','Strengths (academic)',3],['needs','Needs (academic)',3],['parent','Parent input',3],['baseline','Measurable baseline',3]].map(([key,label,rows])=>intakeField(p,'presentLevels.'+key,label,d.presentLevels[key],rows)).join('')}</div></details>`:''}
 ${p.selected.goal?`<details class="intake-draft-section" ${p.selected.presentLevels?'':'open'}><summary>IEP goals &amp; objectives ${icon('down')}</summary><div>${intakeGoalFields(p,d.goal)}</div></details>`:''}</fieldset><details class="intake-source-disclosure"><summary>Source files (${p.files.length})</summary>${intakeFileList(p,false)}</details>
 <div class="intake-footer intake-sticky-footer"><div><span id="intake-save-status" class="intake-small" role="status">${p.saving?'Saving…':p.saved&&!p.dirty?'No unsaved changes':'Unsaved draft · Review before use'}</span><button class="text-btn" data-action="intake-choices" data-id="${s.id}" ${p.saving?'disabled':''}>Change outputs</button></div><div class="actions">${btn('Cancel','intake-cancel','',`data-id="${s.id}" ${p.saving?'disabled':''}`)}${btn(p.saving?'Saving…':count===1?'Save draft':'Save drafts','intake-save','primary',`id="intake-save-button" data-id="${s.id}" ${p.saving||p.saved&&!p.dirty?'disabled':''}`)}</div></div>`;
}
function intakeSavedView(s,p){
 const d=p.savedDrafts.presentLevels;
 return `<div class="present-levels">
 <section class="present-summary" aria-labelledby="present-summary-title"><div class="present-section-top"><h2 id="present-summary-title" tabindex="-1">Summary</h2><div class="intake-saved-actions"><span class="present-meta">Saved draft · Review before use</span>${btn('Edit draft','intake-edit','small',`data-id="${s.id}"`)}</div></div><p class="intake-saved-text">${esc(d.summary)}</p></section>
 <section class="present-section" aria-labelledby="present-academic-title"><div class="present-section-heading"><h2 id="present-academic-title">Strengths &amp; Needs</h2><p>Academic</p></div><div class="present-section-content"><div class="present-academic-item"><h3>Strengths</h3><p class="intake-saved-text">${esc(d.strengths)}</p></div><div class="present-academic-item"><h3>Needs</h3><p class="intake-saved-text">${esc(d.needs)}</p></div></div></section>
 <section class="present-section" aria-labelledby="present-parent-title"><div class="present-section-heading"><h2 id="present-parent-title">Parent input</h2><p>Learning beyond school</p></div><div class="present-section-content"><blockquote class="present-parent-quote"><p class="intake-saved-text">${esc(d.parent)}</p></blockquote></div></section>
 <section class="present-section" aria-labelledby="present-baseline-title"><div class="present-section-heading"><h2 id="present-baseline-title">Measurable baseline</h2><p>The starting point</p></div><div class="present-section-content"><article class="present-baseline"><h3>Starting performance</h3><p class="present-preserve">${esc(d.baseline)}</p></article></div></section>
 ${presentAssessmentSuggestions(s)}</div><details class="intake-source-disclosure"><summary>Source files (${p.files.length})</summary>${intakeFileList(p,false)}</details><button class="text-btn" data-action="intake-back-files" data-id="${s.id}">Add more sources</button>`;
}
function intakeProfileView(s){
 const p=ensureStudentIntake(s),body=p.stage==='analyzing'?intakeAnalysisView(p):p.stage==='select'?intakeChoiceView(s,p):p.stage==='drafts'&&p.draft?intakeDraftView(s,p):p.stage==='saved'&&p.savedDrafts.presentLevels?intakeSavedView(s,p):intakeUploadView(s,p);
 return `<div id="intake-workspace" class="intake-workspace${p.stage==='saved'?' is-saved':''}">${p.stage!=='saved'?intakeProgress(p.stage):''}${body}${p.error?`<p class="intake-error" role="alert">${esc(p.error)} <button class="text-btn" data-action="intake-reload" data-id="${s.id}">Retry</button></p>`:''}${p.stage==='select'||p.stage==='drafts'?'<p class="intake-prototype-note">Prototype preview: drafts use example content. Uploaded files are saved but are not interpreted by AI yet.</p>':''}</div>`;
}
async function uploadIntakeFiles(id,files){
 const p=intakeSession(id);if(p.uploading||p.saving||p.loading)return;p.error='';p.stage='upload';
 const errors=[];
 for(const file of files){
  if(p.files.length>=10){errors.push('Up to 10 files can be attached.');break;}
  const type=intakeTypes[file.name.split('.').pop().toLowerCase()],limit=(type?.startsWith('video/')?25:10)*1024*1024;
  if(!type||!file.size||file.size>limit){errors.push(file.name+': choose a supported document or image up to 10 MB, or video up to 25 MB.');continue;}
  if(p.files.some(f=>f.name===file.name&&f.size===file.size))continue;
  p.uploading=file.name;refreshIntake(id);
  try{const result=await (await intakeRequest(id,'/files?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':type},body:file})).json();if(!p.files.some(f=>f.id===result.id))p.files.push(result);}
  catch(error){errors.push(error.message);}
 }
 p.uploading='';p.error=errors.join(' ');refreshIntake(id);
}
async function removeIntakeFile(id,file){const p=intakeSession(id);if(p.uploading||p.saving)return;try{await intakeRequest(id,'/files/'+encodeURIComponent(file),{method:'DELETE'});p.files=p.files.filter(f=>f.id!==file);p.error='';}catch(error){p.error=error.message;}refreshIntake(id);}
async function previewIntakeFile(id,fileId){
 const p=intakeSession(id),file=p.files.find(f=>f.id===fileId);if(!file)return;
 try{const blob=await (await intakeRequest(id,'/files/'+encodeURIComponent(fileId))).blob();if(route().id!==id)return;
  if(evidencePreviewURL)URL.revokeObjectURL(evidencePreviewURL);evidencePreviewURL=URL.createObjectURL(blob);
  const preview=file.type==='application/pdf'?`<object class="evidence-preview-pdf" data="${evidencePreviewURL}" type="application/pdf"><p>Download this PDF to view it.</p></object>`:file.type.startsWith('video/')?`<video class="intake-video" src="${evidencePreviewURL}" controls preload="metadata">Your browser cannot preview this video. Download it below.</video>`:['image/jpeg','image/png'].includes(file.type)?`<img class="evidence-preview-image" src="${evidencePreviewURL}" alt="${esc(file.name)}">`:'<p>Download this file to open it on your device.</p>';
  openModal(file.name,'Source material · '+getStudent(id).name,`${preview}<div class="modal-foot">${btn('Close','close')}<a class="btn" href="${evidencePreviewURL}" download="${esc(file.name)}">Download</a></div>`,{wide:true});
 }catch(error){toast(error.message);}
}
function stopIntakePhone(p){const t=p.transfer;p.phoneOpen=false;p.transfer=null;if(!t)return;t.cancelled=true;clearTimeout(t.timer);if(t.id)transferRequest(t,'',{method:'DELETE',keepalive:true}).catch(()=>{});}
function syncIntakeNavigation(){for(const p of intakeSessions.values())if(p.transfer&&!intakeVisible(p.student))stopIntakePhone(p);}
async function startIntakePhone(id){
 const p=intakeSession(id);if(p.files.length>=10||p.uploading)return;stopIntakePhone(p);p.phoneOpen=true;p.stage='upload';const t={loading:true,cancelled:false,seen:new Set()};p.transfer=t;refreshIntake(id);
 try{const response=await fetch('/api/transfers',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({student:getStudent(id).name,studentId:id,purpose:'present-levels',objective:'Present levels and IEP drafts',maxFiles:10-p.files.length})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not create a QR code.');Object.assign(t,data,{loading:false});if(t.cancelled||p.transfer!==t){transferRequest(t,'',{method:'DELETE'}).catch(()=>{});return;}refreshIntake(id);await pollIntakePhone(id,t);}
 catch(error){if(p.transfer===t&&!t.cancelled){t.loading=false;t.error=error.message;refreshIntake(id);}}
}
async function pollIntakePhone(id,t){
 const p=intakeSession(id);if(p.transfer!==t||t.cancelled)return;
 if(Date.now()>=t.expires){t.error='This code has expired. Files already received are saved.';refreshIntake(id);return;}
 try{const data=await (await transferRequest(t)).json();if(p.transfer!==t||t.cancelled)return;
  const pending=data.files.filter(f=>!f.delivered);
  if(pending.length){const snapshot=await (await intakeRequest(id)).json();if(p.transfer!==t||t.cancelled)return;p.files=snapshot.files;
   for(const file of pending){if(!p.files.some(f=>f.id===file.id))continue;t.seen.add(file.id);t.status=t.seen.size+' '+(t.seen.size===1?'file':'files')+' received from your phone';refreshIntake(id);await transferRequest(t,'/photos/'+file.id,{method:'DELETE'});}
  }else if(!t.seen.size)t.status='Waiting for files…';t.error='';refreshIntake(id);
 }catch(error){if(p.transfer!==t||t.cancelled)return;if([401,404,410].includes(error.status)){t.error=error.message;refreshIntake(id);return;}t.status='Connection interrupted. Reconnecting…';refreshIntake(id);}
 if(p.transfer===t&&!t.cancelled)t.timer=setTimeout(()=>pollIntakePhone(id,t),2000);
}
function startIntakeAnalysis(id){const p=intakeSession(id);if(!p.files.length||p.uploading||p.loading)return;stopIntakePhone(p);p.stage='analyzing';p.analysisStep=0;p.error='';const token={};p.analysisToken=token;refreshIntake(id);p.analysisTimer=setTimeout(()=>advanceIntakeAnalysis(id,token),1000);}
function advanceIntakeAnalysis(id,token){const p=intakeSession(id);if(p.analysisToken!==token||p.stage!=='analyzing')return;p.analysisStep++;if(p.analysisStep>=3)p.stage='select';refreshIntake(id);if(p.stage==='analyzing')p.analysisTimer=setTimeout(()=>advanceIntakeAnalysis(id,token),1000);}
function createIntakeDrafts(id){
 const p=intakeSession(id),s=getStudent(id);if(!p.selected.presentLevels&&!p.selected.goal)return;
 p.draft ||= {};const example=presentLevelExample(s),parent=notesFor(s).find(n=>n.role==='Parent');
 if(p.selected.presentLevels&&!p.draft.presentLevels)p.draft.presentLevels={summary:example?.summary||`${s.name} is a ${gradeLabel(s.grade).toLowerCase()} student. [Describe current academic performance and its impact on classroom learning.]`,strengths:example?.strengths||'[Describe demonstrated academic strengths and cite a source.]',needs:example?.needs||'[Describe priority learning needs and cite a source.]',parent:parent?.text||'[Add the family’s observations, priorities, and concerns.]',baseline:'[Add the measured skill, starting result, support conditions, and assessment date from the source materials.]'};
 if(p.selected.goal&&!p.draft.goal){const domain=s.domain||'reading',g={id:uid('intake-goal'),domain,title:domainNames[domain],content:goalSummaries[domain],baseline:'[Add the starting performance from the assessment.]',deadline:'2027-05-21'};g.objectives=draftObjectives(s,g).map((o,i)=>({...o,id:g.id+'-o'+(i+1)}));p.draft.goal=g;}
 p.stage='drafts';p.dirty=true;p.saved=false;p.error='';refreshIntake(id);
}
function handleIntakeInput(input){
 const path=input.dataset?.intakeField;if(!path)return false;const p=intakeSession(input.dataset.student);if(!p.draft||p.saving)return true;
 const keys=path.split('.');let target=p.draft;for(const key of keys.slice(0,-1)){if(!Object.hasOwn(target,key))return true;target=target[key];}const key=keys[keys.length-1];if(!Object.hasOwn(target,key))return true;target[key]=input.value;p.dirty=true;
 const button=document.getElementById('intake-save-button');if(button){button.disabled=false;button.textContent=p.selected.presentLevels&&p.selected.goal?'Save drafts':'Save draft';}const status=document.getElementById('intake-save-status');if(status)status.textContent='Unsaved changes';return true;
}
function handleIntakeChange(input){
 if(input.id==='intake-files'){uploadIntakeFiles(input.dataset.student,Array.from(input.files||[]));input.value='';return true;}
 if(input.dataset?.intakeChoice){const p=intakeSession(input.dataset.student);p.selected[input.dataset.intakeChoice]=input.checked;const button=document.getElementById('intake-create-button');if(button)button.disabled=!p.selected.presentLevels&&!p.selected.goal;return true;}
 return handleIntakeInput(input);
}
async function saveIntakeDrafts(id){
 const p=intakeSession(id);if(p.saving||!p.draft||!p.dirty)return;p.saving=true;p.error='';refreshIntake(id);
 const payload={};for(const key of ['presentLevels','goal'])if(p.selected[key])payload[key]=p.draft[key];
 try{const data=await (await intakeRequest(id,'/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})).json();p.savedDrafts=data.drafts;p.files=data.files;for(const key of Object.keys(payload))p.draft[key]=structuredClone(data.drafts[key]);if(payload.goal)syncIntakeGoal(id,data.drafts.goal,true);p.saved=true;p.dirty=false;p.stage=p.savedDrafts.presentLevels?'saved':'upload';toast('Draft saved.');}
 catch(error){p.error=error.message;}finally{p.saving=false;refreshIntake(id);if(!p.error&&intakeVisible(id)){window.scrollTo(0,0);document.getElementById('present-summary-title')?.focus({preventScroll:true});}}
}
function handleIntakeAction(action,el){
 if(!action.startsWith('intake-'))return false;const id=el.dataset.id,p=intakeSession(id);
 if(action==='intake-laptop'){stopIntakePhone(p);refreshIntake(id);document.getElementById('intake-files')?.click();}
 else if(action==='intake-phone'||action==='intake-phone-retry')startIntakePhone(id);
 else if(action==='intake-phone-close'){stopIntakePhone(p);refreshIntake(id);}
 else if(action==='intake-copy-link'){if(p.transfer?.url)navigator.clipboard.writeText(p.transfer.url).then(()=>toast('Upload link copied.')).catch(()=>toast('Scan the QR code to open the upload.'));}
 else if(action==='intake-remove')removeIntakeFile(id,el.dataset.file);
 else if(action==='intake-preview')previewIntakeFile(id,el.dataset.file);
 else if(action==='intake-analyze')startIntakeAnalysis(id);
 else if(action==='intake-create')createIntakeDrafts(id);
 else if(action==='intake-save')saveIntakeDrafts(id);
 else if(action==='intake-back-files'){p.stage='upload';p.error='';refreshIntake(id);}
 else if(action==='intake-choices'){p.stage='select';refreshIntake(id);}
 else if(action==='intake-cancel'){if(p.saving)return true;p.stage=p.savedDrafts.presentLevels?'saved':'select';p.error='';refreshIntake(id);}
 else if(action==='intake-edit'){p.draft=structuredClone(p.savedDrafts);p.selected={presentLevels:!!p.draft.presentLevels,goal:!!p.draft.goal};p.stage='drafts';p.saved=true;p.dirty=false;refreshIntake(id);}
 else if(action==='intake-view-goal'){const g=p.savedDrafts.goal;if(g){activeGoalIds[id]=g.id;activeObjectiveIds[id]=g.objectives[0]?.id;}openStudentSection(id,'iep','plan');}
 else if(action==='intake-reload')loadStudentIntake(id);
 return true;
}
document.addEventListener('dragover',e=>{if(e.target.closest?.('[data-intake-drop]'))e.preventDefault();});
document.addEventListener('drop',e=>{const area=e.target.closest?.('[data-intake-drop]');if(!area)return;e.preventDefault();uploadIntakeFiles(area.dataset.intakeDrop,Array.from(e.dataTransfer?.files||[]));});
