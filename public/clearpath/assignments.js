'use strict';

let assignmentFlow=null;
let richSelection=null;
let assignmentSaveTimer=null;
function alphabeticalStudents(list=students){return list.slice().sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base',numeric:true}))}
function alphabeticalIds(ids){return ids.slice().sort((a,b)=>getStudent(a).name.localeCompare(getStudent(b).name,'en',{sensitivity:'base',numeric:true}))}
function gradeLabel(n){return +n===0?'Kindergarten':'Grade '+n}
function materialLabel(kind){return kind==='assessment'?'Assessment':'Assignment'}
function createLessonDraft(domain='reading',context='',studentIds=[]){
 const d=lessonDefaults[domain],grade=studentIds.length?getStudent(studentIds[0]).grade:3;
 const draft={id:uid('draft'),domain,grade,title:d.title,source:d.source,change:/one step|one direction/i.test(context)?'Show one instruction at a time':d.change,context,a:d.a,b:d.b,directionsA:d.directionsA,directionsB:d.directionsB,custom:false,studentIds:alphabeticalIds(studentIds.filter(id=>lessonGoalsFor(id,domain).length)),objectiveIds:{},kind:'assignment',withVariations:false,questions:3};
 for(const id of draft.studentIds)draft.objectiveIds[id]=defaultLessonObjective(id,domain)?.id;
 return draft;
}
function eligibleForDraft(draft){return alphabeticalStudents(students.filter(s=>s.grade===Number(draft.grade)&&lessonGoalsFor(s.id,draft.domain).length))}
function draftObjectiveLabel(id,o){const gs=goalPlansFor(id),g=gs.find(g=>g.id===o.goalId);return `Goal ${gs.indexOf(g)+1} / Objective ${(g?.objectives.findIndex(x=>x.id===o.id)??0)+1} · ${o.skill}`}
function openDraftingModal(id){
 const s=getStudent(id),g=activeGoal(id),o=activeObjective(id);
 if(!g||!o)return toast('Establish an objective in the IEP plan first.');
 const context=guidanceFor(s).map(x=>x.title+'. '+x.detail).join('\n');
 const model=createLessonDraft(g.domain,context,[id]);model.objectiveIds[id]=o.id;model.kind='assessment';model.questions=5;
 assignmentFlow={stage:'setup',model,recordId:null};renderDraftingModal();
}
function renderDraftingModal(){const f=assignmentFlow;if(!f)return;openModal('Draft with AI',alphabeticalIds(f.model.studentIds).map(id=>getStudent(id).name).join(', '),assignmentSetupForm(f.model,true));}
function draftContext(form){return {form,popup:form?.dataset?.assignmentSetup==='popup',model:form?.dataset?.assignmentSetup==='popup'?assignmentFlow?.model:lesson}}
function preserveDraftInputs(model,form){
 if(!model||!form)return;
 for(const key of ['title','source','kind','change']){const input=form.querySelector?.(`[name="${key}"]`);if(input)model[key]=input.value;}
 const variation=form.querySelector?.('[name="withVariations"]');if(variation)model.withVariations=variation.checked;
}
function redrawDraft(ctx){if(ctx.popup)renderDraftingModal();else render()}
function handleAssignmentChange(input){
 const form=input.closest?.('form[data-assignment-setup]');if(!form)return false;
 const ctx=draftContext(form);if(!ctx.model)return false;
 preserveDraftInputs(ctx.model,form);return handleAssignmentSelection(input,ctx);
}
function submitAssignmentSetup(values,form){
 const ctx=draftContext(form),draft=ctx.model,error=ctx.popup?'draft-error':'lesson-error';if(!draft)return;
 if(!draft.studentIds.length)return formError(error,'Select at least one student.');
 normalizeDraftSelection(draft);
 const variations=!ctx.popup&&studioIntent==='variations';if(variations)reconcileSharedTargets(draft);
 if(variations&&(draft.studentIds.length<2||new Set(draft.studentIds.map(id=>getStudent(id).grade)).size!==1))return formError(error,'Choose at least two students in the same grade.');
 if(variations&&!selectedSharedGoal(draft))return formError(error,'Select a goal shared by all selected students.');
 if(variations&&!selectedSharedObjective(draft))return formError(error,'Select an established objective shared by all selected students for this goal.');
 if(!draftGoalsComplete(draft))return formError(error,'Select a goal for each student.');
 if(!draftObjectivesComplete(draft))return formError(error,'Select an established objective from each chosen goal.');
 const kind=values.kind||draft.kind;
 if(!['assignment','assessment'].includes(kind))return formError(error,'Choose an assignment or assessment.');
 if(variations&&!canCompareDraft(draft))return formError(error,'Choose a shared goal and objective for at least two students in the same grade.');
 syncDraftSelection(draft);
 Object.assign(draft,{title:values.title?.trim()||draft.title,source:values.source?.trim()||draft.source,kind,questions:kind==='assessment'?5:3,withVariations:variations,change:values.change||draft.change});
 const original=lessonDefaults[draft.domain];draft.custom=draft.source!==original.source;
 if(draft.withVariations){
  draft.a=original.a;draft.b=draft.change==='Show one instruction at a time'?'One step at a time':original.b;
  draft.directionsA=draft.custom?'Read the lesson.\nIdentify the key information.\nExplain your answer.\nReview your work.':original.directionsA;
  draft.directionsB=draft.custom?'Use the visual structure to organize your thinking.\nIdentify the key information.\nExplain your answer.\nReview your work.':original.directionsB;
  if(draft.change==='Show one instruction at a time')draft.directionsB=draft.directionsA+'\n\nTeacher: reveal one numbered direction at a time.';
  lesson=draft;state.lesson=structuredClone(lesson);persist();studioStep=2;groups={a:[],b:[]};cohort=lesson.studentIds.slice();render();toast('Variations created.');return;
 }
 if(!ctx.popup){state.lesson=structuredClone(draft);persist();}
 const records=createStudentAssignments(draft,{revisionOf:ctx.popup?assignmentFlow.recordId:null});
 if(!records)return formError(error,'Could not save the drafts. Free some browser storage and try again.');
 navigate('assignments/'+records[0].batchId);
}
// A generation is one batch, with an independently editable document per student.
function createStudentAssignments(draft,{revisionOf=null,applyGuidance=false}={}){
 const batchId=uid('batch'),now=new Date().toISOString(),base=state.assignments.find(a=>a.id===revisionOf);
 const records=alphabeticalIds(draft.studentIds).map(id=>{
  const model=materialForStudent(draft,id),record={id:uid('assignment'),batchId,kind:model.kind,title:model.title,model,studentIds:[id],objectiveIds:structuredClone(model.objectiveIds),html:buildAssignmentHTML(model),status:'draft',createdAt:now,updatedAt:now,modifiedAt:null,revisionOf:base?.studentIds.includes(id)?base.id:null};
  if(applyGuidance&&base?.studentIds.length===1&&base.studentIds[0]===id){
   const previous=sanitizeRichHTML(base.html),appendix=base.guidanceAppendix;
   const body=appendix&&previous.endsWith(appendix)?previous.slice(0,-appendix.length):previous;
   record.guidanceAppendix=sanitizeRichHTML(`<h3>Teaching notes</h3><ul>${guidanceUpdate(id).recommendations.map(t=>`<li>${esc(t.step)}</li>`).join('')}</ul>`);
   record.html=body+record.guidanceAppendix;
  }
  return record;
 });
 if(!records.length)return null;
 const before=state.assignments;state.assignments=[...records,...before];
 if(!persist()){state.assignments=before;return null;}
 for(const record of records)completeGuidanceDraft(record.model,record);
 return records;
}
function assignmentBatches(){
 const batches=new Map();for(const record of state.assignments){const key=record.batchId||record.id;if(!batches.has(key))batches.set(key,{id:key,records:[]});batches.get(key).records.push(record);}return [...batches.values()];
}
function assignmentOverview(id){
 const batch=assignmentBatches().find(b=>b.id===id);
 if(!batch)return `<div class="empty"><h2>Assignment not found</h2><a href="#studio" data-action="back-materials" class="btn">Back to saved materials</a></div>`;
 const rows=batch.records.flatMap(record=>record.studentIds.map(id=>({record,student:getStudent(id)}))).sort((a,b)=>a.student.name.localeCompare(b.student.name,'en',{sensitivity:'base'}));
 return `<a href="#studio" data-action="back-materials" class="back">${icon('back')}Saved materials</a><div class="page-head"><div><h1>Assignment overview</h1><p class="subtitle">${rows.length} ${rows.length===1?'student':'students'} · ${batch.records.length} ${batch.records.length===1?'draft':'drafts'} created</p></div></div><div class="table-card"><div class="table-wrap"><table class="roster assignment-overview"><caption class="sr-only">Students and their generated assignments</caption><thead><tr><th scope="col">Student</th><th scope="col">Assignment</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows.map(({record:r,student:s})=>`<tr><td><a class="student-name" href="#student/${s.id}">${avatar(s)}<span class="name-text">${esc(s.name)}<small>${gradeLabel(s.grade)}</small></span></a></td><td><span class="material-title">${esc(r.title)}</span>${r.revisionOf?'<small class="material-detail">Revised draft</small>':''}</td><td><span class="material-status">${r.status==='ready'?'Saved':'Draft'}</span></td><td class="material-action">${btn('Open draft','open-assignment','small',`data-id="${r.id}" aria-label="Open draft for ${esc(s.name)}"`)}</td></tr>`).join('')}</tbody></table></div></div><div class="overview-footer">${btn('Create another assignment','new-lesson')}</div>`;
}
function materialDate(value,empty='—'){
 if(!value||!Number.isFinite(Date.parse(value)))return `<span class="muted">${empty}</span>`;
 const date=new Date(value);return `<time datetime="${esc(date.toISOString())}" title="${esc(date.toLocaleString('en-US'))}">${date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}<small>${date.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</small></time>`;
}
function materialModifiedAt(record){return Object.prototype.hasOwnProperty.call(record,'modifiedAt')?record.modifiedAt:record.updatedAt}
function assignmentHistory(s){
 const records=[...state.assignments.filter(a=>a.studentIds.includes(s.id)).map(a=>({...a,type:'assignment'})),...state.drafts.filter(d=>d.studentIds?.includes(s.id)).map(d=>({...d,type:'variations'}))].sort((a,b)=>(b.createdAt||b.updatedAt||'').localeCompare(a.createdAt||a.updatedAt||''));
 return `<section class="assignment-history" aria-labelledby="assignment-history-heading"><div class="section-row"><h2 id="assignment-history-heading">Assignment history</h2></div>${records.length?`<div class="table-wrap"><table class="assignment-audit"><caption class="sr-only">Assignments, creation dates and last modifications for ${esc(s.name)}</caption><thead><tr><th scope="col">Assignment</th><th scope="col">Created</th><th scope="col">Last modified</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${records.map(r=>`<tr><td><span class="material-title">${esc(r.title)}</span><small class="material-detail">${r.type==='variations'?'Two lesson versions':r.revisionOf?'Revised '+r.kind:materialLabel(r.kind)}</small></td><td>${materialDate(r.createdAt,'Not recorded')}</td><td>${materialDate(materialModifiedAt(r))}</td><td class="material-action">${btn('Open',r.type==='variations'?'open-draft':'open-assignment','small',`data-id="${r.id}" aria-label="Open ${esc(r.title)}"`)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="section-description">No assignments created yet.</p>'}</section>`;
}
function studentMaterials(s){
 const records=state.assignments.filter(r=>r.studentIds.includes(s.id)).sort((a,b)=>(b.createdAt||b.updatedAt||'').localeCompare(a.createdAt||a.updatedAt||''));
 const plans=state.comparisons.filter(c=>trialStudents(c).includes(s.id)).slice().reverse();
 const drafts=state.drafts.filter(d=>d.studentIds?.includes(s.id));
 return `<div class="student-materials"><section class="content-section"><div class="section-row"><h2>Assignments & assessments</h2><span class="caption no-margin">${records.length} materials</span></div>${records.length?`<div class="table-wrap"><table class="assignment-audit"><caption class="sr-only">Materials for ${esc(s.name)}</caption><thead><tr><th>Material</th><th>Created</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${records.map(r=>{const goal=goalForDraft(r.model,s.id);return `<tr><td><span class="material-title">${esc(r.title)}</span><small class="material-detail">${r.revisionOf?'Revised '+r.kind:materialLabel(r.kind)}${goal?' · '+esc(goal.title):''}</small></td><td>${materialDate(r.createdAt,'Not recorded')}</td><td>${r.status==='ready'?'Saved':'Draft'}</td><td class="material-action">${btn('Open draft','open-assignment','small',`data-id="${r.id}"`)}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="section-description">Assignments and assessments created for this student will appear here.</p>'}</section><section class="content-section"><div class="section-row"><h2>Teaching plans</h2></div>${plans.length?plans.map(c=>{const v=c.decisions?.[s.id]||trialVersion(c,s.id);return `<article class="student-plan-row"><div><h3>${esc(c.title)}</h3><p>${esc(c.lesson[v])} · ${trialPhaseLabel(c)}</p><small>Starts ${formatDate(trialStart(c))} · Review ${formatDate(c.review)} · ${c.frequency} progress checks / week</small></div><div class="actions">${btn('View lesson','trial-lesson','small',`data-id="${c.id}" data-version="${v}"`)}<a class="btn small" href="#comparison/${c.id}">View plan</a></div></article>`;}).join(''):'<p class="section-description">No teaching plans for this student yet.</p>'}</section>${drafts.length?`<section class="content-section"><h2>Lesson variant drafts</h2>${drafts.map(d=>`<article class="student-plan-row"><div><h3>${esc(d.title)}</h3><p>Two versions · Not scheduled</p></div>${btn('Open versions','open-draft','small',`data-id="${d.id}"`)}</article>`).join('')}</section>`:''}</div>`;
}
function saveVariationDraft(){
 const index=state.drafts.findIndex(d=>d.id===lesson.id),old=state.drafts[index],now=new Date().toISOString();
 const content=d=>JSON.stringify({...d,createdAt:undefined,updatedAt:undefined,modifiedAt:undefined,studentPickerOpen:undefined});
 const changed=old&&content(old)!==content(lesson),record={...structuredClone(lesson),createdAt:old?old.createdAt||null:now,updatedAt:changed||!old?now:old.updatedAt,modifiedAt:changed?now:old?materialModifiedAt(old)||null:null};
 const before=state.drafts.slice();if(index<0)state.drafts.unshift(record);else state.drafts[index]=record;
 if(!persist()){state.drafts=before;return false;}return true;
}
function buildAssignmentHTML(d){
 if(d.studentIds?.length>1)return sanitizeRichHTML(`<h2>${esc(d.title)}</h2>`+alphabeticalIds(d.studentIds).map(id=>{const model=materialForStudent(d,id),o=objectiveForDraft(d,id);return `<h3>${esc(getStudent(id).name)} · ${esc(domainNames[model.domain])}</h3>${o?`<p>Objective: ${esc(o.skill)}</p>`:''}`+buildStudentAssignmentHTML(model).replace(/^<h2>[\s\S]*?<\/h2>/,'');}).join(''));
 const model=d.studentIds?.length===1?materialForStudent(d,d.studentIds[0]):d;
 return buildStudentAssignmentHTML(model);
}
function buildStudentAssignmentHTML(d){
 const count=+d.questions||3,custom=d.source!==lessonDefaults[d.domain].source;
 const prompts=custom?{
  reading:['What happens first?','What happens next?','What happens at the end?','Put the main events in order.','Retell the sequence in your own words.'],
  math:['Identify the information you need.','Choose the operation for the first problem.','Solve the problem and show your work.','Check your answer with another method.','Explain the steps you used.'],
  writing:['Say one complete idea about the topic.','Write your idea as a sentence.','Add a detail that makes your idea clear.','Check the capital letter and ending punctuation.','Read your sentence and revise it if needed.']
 }[d.domain]:{
  reading:['What did Maya do first?','What happened after the rain began?','What appeared a few days later?','Where did Maya put the pot?','Put the planting, rain, and new leaf in order.'],
  math:['How many seeds did Maya have at first?','How many seeds did the friend bring?','How many seeds did they have altogether?','How many seeds remained after planting 6?','Show how you checked your answer.'],
  writing:['Say a complete idea about something you saw in a garden.','Write your idea as a sentence.','Include who or what you saw and what happened.','Check the capital letter and ending punctuation.','Read your sentence and add a detail.']
 }[d.domain];
 const context=(d.context||'').toLowerCase(),oneStep=/one step|one direction|one instruction/.test(context),oral=/oral|aloud|rehearsal/.test(context),visual=/picture|visual/.test(context)&&!/clutter/.test(context),modeled=/model.*(first|step)/.test(context);
 const source=esc(d.source).split(/\n+/).map(s=>`<p>${s}</p>`).join('');
 const cues=visual&&!custom?`<p><strong>Picture guide:</strong> ${d.domain==='reading'?'🌱 Seed → 🌧 Rain → 🌿 New leaf':d.domain==='math'?'🌱 8 seeds + 🌱 5 seeds':'🌷 Flower · 🍃 Leaf · 🐦 Bird'}</p>`:'';
 const directions=`${d.kind==='assessment'?'Answer each question.':'Read the task and complete each step.'}${oneStep?' Work through one step at a time.':''}${oral?' Say your answer aloud before writing.':''}${modeled?' Work through the first step with your teacher, then try the next problem.':''}`;
 const items=prompts.slice(0,count).map((q,i)=>oneStep?`<h3>Step ${i+1}</h3><p>${esc(q)}</p><p>________________________________________________</p>`:`<li><p>${esc(q)}</p><p>________________________________________________</p></li>`).join('');
 return sanitizeRichHTML(`<h2>${esc(d.title)}</h2><p>Name: ____________________ &nbsp; Date: ______________</p>${cues}${source}<h3>Directions</h3><p>${directions}</p>${oneStep?items:`<ol>${items}</ol>`}`);
}
// Keep only simple document formatting. Never retain attributes, scripts, embeds or links.
function sanitizeRichHTML(value){
 const allowed=new Set(['p','div','br','h1','h2','h3','strong','b','em','i','u','ol','ul','li','blockquote']);
 const raw=String(value||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|iframe|object|svg|math|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 return (raw.match(/<[^>]*>|[^<]+|</g)||[]).map(token=>{
  if(!token.startsWith('<'))return token.replace(/>/g,'&gt;');
  const match=token.match(/^<\s*(\/?)\s*([a-z][a-z0-9]*)\b[^>]*>$/i);if(!match)return '&lt;';const tag=match[2].toLowerCase();return allowed.has(tag)?`<${match[1]?'/':''}${tag}>`:'';
 }).join('');
}
function richButton(command,label,title){return `<button type="button" class="rich-tool" data-action="rich-format" data-command="${command}" aria-label="${title}" title="${title}">${label}</button>`}
function openAssignmentEditor(id){
 const record=state.assignments.find(a=>a.id===id);if(!record)return;
 assignmentFlow={stage:'editor',recordId:id,model:structuredClone(record.model),returnStudent:route().page==='student'?route().id:null};richSelection=null;
 const names=alphabeticalIds(record.studentIds).map(id=>getStudent(id).name).join(', '),targets=record.studentIds.map(id=>{const o=objectiveForDraft(record.model,id);return o?getStudent(id).name+': '+o.skill:'';}).filter(Boolean);
 openModal(`${materialLabel(record.kind)} draft`,names,`<div class="assignment-editor-shell"><div class="editor-context"><span>${draftGradeLabel(record.model)} · ${draftAreaLabel(record.model)}</span><details><summary>Target objective${targets.length>1?'s':''}</summary><p>${targets.map(esc).join('; ')}</p></details></div><div class="rich-toolbar" role="toolbar" aria-label="Text formatting">${richButton('bold','<b>B</b>','Bold')}${richButton('italic','<i>I</i>','Italic')}${richButton('underline','<u>U</u>','Underline')}<span class="toolbar-divider"></span>${richButton('heading','H','Heading')}${richButton('paragraph','¶','Paragraph')}<span class="toolbar-divider"></span>${richButton('insertUnorderedList','• List','Bulleted list')}${richButton('insertOrderedList','1. List','Numbered list')}<span class="toolbar-divider"></span>${richButton('undo','↶','Undo')}${richButton('redo','↷','Redo')}</div><div class="assignment-paper"><div id="assignment-editor" class="rich-editor" contenteditable="true" role="textbox" aria-label="Edit assignment content" aria-multiline="true" spellcheck="true">${sanitizeRichHTML(record.html)}</div></div><div id="assignment-editor-error" aria-live="polite"></div><div class="editor-meta"><span id="assignment-save-state" role="status">Draft saved in this browser</span><span>Demo draft · Review before use</span></div><div class="modal-foot editor-footer"><button class="text-btn" data-action="edit-assignment-setup">Change selections</button><div class="actions">${btn(icon('print')+'Print','print-assignment')}${btn('Save '+record.kind,'save-assignment','primary')}</div></div></div>`,{wide:true,printable:true});
}
function flushAssignmentEditor(finalize=false){
 if(assignmentFlow?.stage!=='editor')return true;
 clearTimeout(assignmentSaveTimer);
 const editor=document.getElementById('assignment-editor'),record=state.assignments.find(a=>a.id===assignmentFlow.recordId);if(!editor||!record)return true;
 if(editor.innerHTML.length>60000){formError('assignment-editor-error','Keep the assignment under 60,000 characters.');return false;}
 const html=sanitizeRichHTML(editor.innerHTML);if(finalize&&!html.replace(/<[^>]+>/g,'').trim()){formError('assignment-editor-error','Add some content before saving.');return false;}
 const previous=structuredClone(record),heading=editor.querySelector?.('h1,h2'),title=heading?.textContent.trim().slice(0,100)||record.title;
 const changed=html!==sanitizeRichHTML(record.html)||title!==record.title;
 record.html=html;record.title=title;record.model.title=title;
 if(changed)record.updatedAt=record.modifiedAt=new Date().toISOString();
 if(finalize){record.status='ready';record.savedAt ||= new Date().toISOString();}
 const saved=persist();if(!saved)state.assignments[state.assignments.findIndex(a=>a.id===record.id)]=previous;
 const status=document.getElementById('assignment-save-state');if(status)status.textContent=saved?'Draft saved in this browser':'Not saved · browser storage unavailable';return saved;
}
function finishAssignmentModal(){
 if(!assignmentFlow)return true;
 if(assignmentFlow.stage==='editor'&&!flushAssignmentEditor())return false;
 assignmentFlow=null;richSelection=null;clearTimeout(assignmentSaveTimer);return true;
}
function queueAssignmentSave(){const status=document.getElementById('assignment-save-state');if(status)status.textContent='Saving…';clearTimeout(assignmentSaveTimer);assignmentSaveTimer=setTimeout(()=>flushAssignmentEditor(),500);}
function rememberRichSelection(){const editor=document.getElementById('assignment-editor'),selection=window.getSelection?.();if(editor&&selection?.rangeCount&&editor.contains(selection.anchorNode))richSelection=selection.getRangeAt(0).cloneRange();}
function formatAssignment(command){
 const editor=document.getElementById('assignment-editor');if(!editor)return;editor.focus();
 const selection=window.getSelection?.();if(richSelection&&selection){selection.removeAllRanges();selection.addRange(richSelection);}
 if(command==='heading'||command==='paragraph')document.execCommand('formatBlock',false,command==='heading'?'h2':'p');else document.execCommand(command,false,null);
 rememberRichSelection();queueAssignmentSave();
}
function handleAssignmentAction(action,el){
 if(handleSelectionAction(action,el))return true;
 if(action==='guided-materials'){openDraftingModal(el.dataset.id);return true;}
 if(action==='open-assignment'){openAssignmentEditor(el.dataset.id);return true;}
 if(action==='open-assignment-overview'){navigate('assignments/'+el.dataset.id);return true;}
 if(action==='back-materials'){studioTab='saved';navigate('studio/saved');return true;}
 if(action==='rich-format'){formatAssignment(el.dataset.command);return true;}
 if(action==='save-assignment'){if(flushAssignmentEditor(true)){const record=state.assignments.find(a=>a.id===assignmentFlow.recordId);const student=assignmentFlow.returnStudent;if(student){studentTab='materials';navigate('student/'+student);}else navigate('assignments/'+(record.batchId||record.id));toast('Material saved.');}return true;}
 if(action==='print-assignment'){if(flushAssignmentEditor())window.print();return true;}
 if(action==='edit-assignment-setup'){
  if(!flushAssignmentEditor())return true;
  const record=state.assignments.find(x=>x.id===assignmentFlow.recordId);assignmentFlow={stage:'setup',recordId:record.id,model:structuredClone(record.model)};assignmentFlow.model.withVariations=false;renderDraftingModal();return true;
 }
 return false;
}
function handleAssignmentInput(event){if(event.target.dataset?.assignmentSearch!==undefined){filterAssignmentStudents(event.target);return true;}if(event.target.id==='assignment-editor'||event.target.closest?.('#assignment-editor')){queueAssignmentSave();return true;}return false;}
function savedMaterials(){
 const items=[...assignmentBatches().map(b=>({type:'single',id:b.id,title:new Set(b.records.map(r=>r.title)).size===1?b.records[0].title:'Individual '+(b.records[0].kind==='assessment'?'assessments':'assignments'),studentIds:[...new Set(b.records.flatMap(r=>r.studentIds))],model:b.records[0].model,kind:b.records[0].kind,createdAt:b.records[0].createdAt||b.records[0].updatedAt})),...state.drafts.map(d=>({type:'variations',...d}))].sort((a,b)=>(b.createdAt||b.updatedAt||'').localeCompare(a.createdAt||a.updatedAt||''));
 if(!items.length)return `<div class="empty"><h3>No saved materials</h3><p class="small">Assignments, assessments and variations appear here.</p><div class="top-space">${btn('Create assignment','new-lesson','primary')}</div></div>`;
 return `<div class="saved-materials">${items.map(d=>`<article class="saved-draft"><div><h4>${esc(d.title)}</h4><p>${d.type==='single'?materialLabel(d.kind):'Two variations'} · ${esc(alphabeticalIds(d.studentIds||[]).map(id=>getStudent(id).name).join(', ')||'Select students')}</p></div>${btn('Open '+icon('arrow'),d.type==='single'?'open-assignment-overview':'open-draft','small',`data-id="${d.id}"`)}</article>`).join('')}</div>`;
}
document.addEventListener('selectionchange',rememberRichSelection);
document.addEventListener('mousedown',e=>{if(e.target.closest?.('.rich-toolbar button'))e.preventDefault();});
document.addEventListener('paste',e=>{if(!e.target.closest?.('#assignment-editor'))return;e.preventDefault();document.execCommand('insertText',false,e.clipboardData?.getData('text/plain')||'');queueAssignmentSave();});
document.addEventListener('drop',e=>{if(e.target.closest?.('#assignment-editor')){e.preventDefault();toast('Paste text into the editor to add content.');}});
