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
function assignmentObjectives(draft,prefix='lesson'){
 if(!draft.studentIds?.length)return '';
 return `<details class="disclosure lesson-objectives" ${draft.studentIds.length===1?'open':''}><summary>Target objectives · ${draft.studentIds.length} ${draft.studentIds.length===1?'student':'students'}</summary>${alphabeticalIds(draft.studentIds).map(id=>`<div class="field"><label for="${prefix}-objective-${id}">${esc(getStudent(id).name)}</label><select id="${prefix}-objective-${id}" data-assignment-objective="${id}">${lessonObjectiveOptions(id,draft.domain).map(o=>`<option value="${o.id}" ${draft.objectiveIds[id]===o.id?'selected':''}>${esc(draftObjectiveLabel(id,o))}</option>`).join('')}</select></div>`).join('')}</details>`;
}
function assignmentSetupForm(draft,popup=false){
 draft.studentIds ||= [];draft.objectiveIds ||= {};draft.kind ||= 'assignment';draft.questions ||= 3;
 const prefix=popup?'draft':'lesson';
 return `<form class="plain-form lesson-setup ${popup?'draft-popup-form':''}" id="${popup?'assignment-draft-form':'lesson-form'}" data-assignment-setup="${popup?'popup':'page'}">
 <div class="field-row"><div class="field"><label for="${prefix}-kind">Create</label><select id="${prefix}-kind" name="kind" data-assignment-field="kind"><option value="assignment" ${draft.kind==='assignment'?'selected':''}>Assignment</option><option value="assessment" ${draft.kind==='assessment'?'selected':''}>Assessment</option></select></div><div class="field"><label for="${prefix}-grade">Grade</label><select id="${prefix}-grade" name="grade" data-assignment-field="grade">${[...new Set(students.map(s=>s.grade))].sort((a,b)=>a-b).map(n=>`<option value="${n}" ${+draft.grade===n?'selected':''}>${gradeLabel(n)}</option>`).join('')}</select></div></div>
 <div class="field"><label for="${prefix}-domain">Goal area</label><select id="${prefix}-domain" name="domain" data-assignment-field="domain">${Object.entries(domainNames).map(([v,l])=>`<option value="${v}" ${draft.domain===v?'selected':''}>${l}</option>`).join('')}</select></div>
 <fieldset class="lesson-students"><legend>Students</legend><div class="cohort-chips">${eligibleForDraft(draft).map(s=>`<label class="student-chip"><input type="checkbox" name="lesson-student" value="${s.id}" ${draft.studentIds.includes(s.id)?'checked':''}>${avatar(s,'tiny')}${esc(s.name)}</label>`).join('')||'<p class="caption">No established objectives for this grade and goal area.</p>'}</div><div class="section-row"><span class="caption no-margin" data-selected-count>${draft.studentIds.length} selected</span><button type="button" class="text-btn" data-action="select-draft-students">Select all</button></div></fieldset>
 <div data-assignment-objectives>${assignmentObjectives(draft,prefix)}</div>
 <div class="field"><label for="${prefix}-title">Title</label><input id="${prefix}-title" name="title" value="${esc(draft.title)}" required maxlength="100"></div>
 <div class="field"><label for="${prefix}-source">Lesson content or passage</label><textarea class="draft-input" id="${prefix}-source" name="source" required maxlength="4000">${esc(draft.source)}</textarea></div>
 ${!popup?`<div class="optional-variations"><label><input type="checkbox" name="withVariations" data-assignment-field="withVariations" ${draft.withVariations?'checked':''}><span>Create two variations <small>Optional</small></span></label><div class="field variation-setting" ${draft.withVariations?'':'hidden'}><label for="${prefix}-change">Change to compare</label><select id="${prefix}-change" name="change"><option value="${esc(lessonDefaults[draft.domain].change)}">${esc(lessonDefaults[draft.domain].change)}</option><option value="Show one instruction at a time" ${draft.change==='Show one instruction at a time'?'selected':''}>Show one instruction at a time</option></select></div></div>`:''}
 <div id="${popup?'draft-error':'lesson-error'}"></div><div class="form-foot"><span class="caption">Demo: AI drafting is simulated.</span><button class="btn primary" type="submit" data-generate-material>${draft.withVariations&&!popup?'Generate variations':'Generate '+draft.kind.toLowerCase()}</button></div></form>`;
}
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
 const ctx=draftContext(form),d=ctx.model;if(!d)return false;
 const key=input.dataset.assignmentField;
 if(key==='kind'){d.kind=input.value;d.questions=input.value==='assessment'?5:3;}
 else if(key==='withVariations'){d.withVariations=input.checked;const setting=form.querySelector('.variation-setting');if(setting)setting.hidden=!input.checked;}
 else if(key==='grade'||key==='domain'){
  preserveDraftInputs(d,form);
  if(key==='grade')d.grade=+input.value;
  else{const defaults=lessonDefaults[input.value];Object.assign(d,{domain:input.value,title:defaults.title,source:defaults.source,change:defaults.change,context:''});}
  d.studentIds=[];d.objectiveIds={};if(!ctx.popup){groups={a:[],b:[]};cohort=[];}redrawDraft(ctx);return true;
 }
 else if(input.name==='lesson-student'){
  const id=input.value;d.studentIds=alphabeticalIds(input.checked?[...new Set([...d.studentIds,id])]:d.studentIds.filter(x=>x!==id));
  if(input.checked)d.objectiveIds[id]=defaultLessonObjective(id,d.domain)?.id;else delete d.objectiveIds[id];
  if(!ctx.popup){cohort=d.studentIds.slice();groups={a:[],b:[]};}
  form.querySelector('[data-selected-count]').textContent=d.studentIds.length+' selected';form.querySelector('[data-assignment-objectives]').innerHTML=assignmentObjectives(d,ctx.popup?'draft':'lesson');return true;
 }else if(input.dataset.assignmentObjective){d.objectiveIds[input.dataset.assignmentObjective]=input.value;return true;}
 else return false;
 const button=form.querySelector('[data-generate-material]');if(button)button.textContent=d.withVariations&&!ctx.popup?'Generate variations':'Generate '+d.kind;
 return true;
}
function submitAssignmentSetup(values,form){
 const ctx=draftContext(form),draft=ctx.model,error=ctx.popup?'draft-error':'lesson-error';if(!draft)return;
 if(!draft.studentIds.length)return formError(error,'Select at least one student.');
 if(draft.studentIds.some(id=>!eligibleForDraft(draft).some(s=>s.id===id)))return formError(error,'Select students in this grade with established objectives.');
 if(draft.studentIds.some(id=>!lessonObjectiveOptions(id,draft.domain).some(o=>o.id===draft.objectiveIds[id])))return formError(error,'Choose an established objective for each student.');
 if(!values.title?.trim()||!values.source?.trim())return formError(error,'Enter a title and lesson content.');
 if(!['assignment','assessment'].includes(values.kind))return formError(error,'Choose an assignment or assessment.');
 Object.assign(draft,{title:values.title.trim(),source:values.source.trim(),kind:values.kind,questions:values.kind==='assessment'?5:3,withVariations:!ctx.popup&&(values.withVariations==='on'||values.withVariations==='true'),change:values.change||draft.change});
 const original=lessonDefaults[draft.domain];draft.custom=draft.source!==original.source;
 if(draft.withVariations){
  draft.a=original.a;draft.b=draft.change==='Show one instruction at a time'?'One step at a time':original.b;
  draft.directionsA=draft.custom?'Read the lesson.\nIdentify the key information.\nExplain your answer.\nReview your work.':original.directionsA;
  draft.directionsB=draft.custom?'Use the visual structure to organize your thinking.\nIdentify the key information.\nExplain your answer.\nReview your work.':original.directionsB;
  if(draft.change==='Show one instruction at a time')draft.directionsB=draft.directionsA+'\n\nTeacher: reveal one numbered direction at a time.';
  lesson=draft;state.lesson=structuredClone(lesson);persist();studioStep=2;groups={a:[],b:[]};cohort=lesson.studentIds.slice();render();toast('Variations created.');return;
 }
 if(!ctx.popup){state.lesson=structuredClone(draft);persist();}
 const id=ctx.popup&&assignmentFlow.recordId?assignmentFlow.recordId:uid('assignment');
 const record={id,kind:draft.kind,title:draft.title,model:structuredClone(draft),studentIds:draft.studentIds.slice(),objectiveIds:structuredClone(draft.objectiveIds),html:buildAssignmentHTML(draft),status:'draft',updatedAt:new Date().toISOString()};
 const index=state.assignments.findIndex(x=>x.id===id);if(index<0)state.assignments.unshift(record);else state.assignments[index]=record;completeGuidanceDraft(draft,record);persist();render();openAssignmentEditor(id);
}
function buildAssignmentHTML(d){
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
 assignmentFlow={stage:'editor',recordId:id,model:structuredClone(record.model)};richSelection=null;
 const names=alphabeticalIds(record.studentIds).map(id=>getStudent(id).name).join(', '),targets=[...new Set(record.studentIds.map(id=>lessonObjectiveOptions(id,record.model.domain).find(o=>o.id===record.objectiveIds[id])?.skill).filter(Boolean))];
 openModal(`${materialLabel(record.kind)} draft`,names,`<div class="assignment-editor-shell"><div class="editor-context"><span>${gradeLabel(record.model.grade)} · ${domainNames[record.model.domain]}</span><details><summary>Target objective${targets.length>1?'s':''}</summary><p>${targets.map(esc).join('; ')}</p></details></div><div class="rich-toolbar" role="toolbar" aria-label="Text formatting">${richButton('bold','<b>B</b>','Bold')}${richButton('italic','<i>I</i>','Italic')}${richButton('underline','<u>U</u>','Underline')}<span class="toolbar-divider"></span>${richButton('heading','H','Heading')}${richButton('paragraph','¶','Paragraph')}<span class="toolbar-divider"></span>${richButton('insertUnorderedList','• List','Bulleted list')}${richButton('insertOrderedList','1. List','Numbered list')}<span class="toolbar-divider"></span>${richButton('undo','↶','Undo')}${richButton('redo','↷','Redo')}</div><div class="assignment-paper"><div id="assignment-editor" class="rich-editor" contenteditable="true" role="textbox" aria-label="Edit assignment content" aria-multiline="true" spellcheck="true">${sanitizeRichHTML(record.html)}</div></div><div id="assignment-editor-error" aria-live="polite"></div><div class="editor-meta"><span id="assignment-save-state" role="status">Draft saved in this browser</span><span>Demo draft · Review before use</span></div><div class="modal-foot editor-footer"><button class="text-btn" data-action="edit-assignment-setup">Edit details</button><div class="actions">${btn(icon('print')+'Print','print-assignment')}${btn('Save '+record.kind,'save-assignment','primary')}</div></div></div>`,{wide:true,printable:true});
}
function flushAssignmentEditor(finalize=false){
 if(assignmentFlow?.stage!=='editor')return true;
 clearTimeout(assignmentSaveTimer);
 const editor=document.getElementById('assignment-editor'),record=state.assignments.find(a=>a.id===assignmentFlow.recordId);if(!editor||!record)return true;
 if(editor.innerHTML.length>60000){formError('assignment-editor-error','Keep the assignment under 60,000 characters.');return false;}
 const html=sanitizeRichHTML(editor.innerHTML);if(finalize&&!html.replace(/<[^>]+>/g,'').trim()){formError('assignment-editor-error','Add some content before saving.');return false;}
 record.html=html;const heading=editor.querySelector?.('h1,h2');if(heading?.textContent.trim())record.title=heading.textContent.trim().slice(0,100);record.model.title=record.title;record.updatedAt=new Date().toISOString();if(finalize)record.status='ready';
 const saved=persist(),status=document.getElementById('assignment-save-state');if(status)status.textContent=saved?'Draft saved in this browser':'Not saved · browser storage unavailable';return saved;
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
 if(action==='guided-materials'){openDraftingModal(el.dataset.id);return true;}
 if(action==='open-assignment'){openAssignmentEditor(el.dataset.id);return true;}
 if(action==='select-draft-students'){
  const form=el.closest('form'),ctx=draftContext(form);preserveDraftInputs(ctx.model,form);ctx.model.studentIds=eligibleForDraft(ctx.model).map(s=>s.id);for(const id of ctx.model.studentIds)ctx.model.objectiveIds[id]=defaultLessonObjective(id,ctx.model.domain)?.id;if(!ctx.popup){groups={a:[],b:[]};cohort=ctx.model.studentIds.slice();}redrawDraft(ctx);return true;
 }
 if(action==='rich-format'){formatAssignment(el.dataset.command);return true;}
 if(action==='save-assignment'){if(flushAssignmentEditor(true)){closeModal();render();toast('Material saved.');}return true;}
 if(action==='print-assignment'){if(flushAssignmentEditor())window.print();return true;}
 if(action==='edit-assignment-setup'){
  if(!flushAssignmentEditor())return true;
  const record=state.assignments.find(x=>x.id===assignmentFlow.recordId);assignmentFlow={stage:'setup',recordId:record.id,model:structuredClone(record.model)};assignmentFlow.model.withVariations=false;renderDraftingModal();return true;
 }
 return false;
}
function handleAssignmentInput(event){if(event.target.id==='assignment-editor'||event.target.closest?.('#assignment-editor')){queueAssignmentSave();return true;}return false;}
function savedMaterials(){
 const items=[...state.assignments.map(d=>({type:'single',...d})),...state.drafts.map(d=>({type:'variations',...d}))];
 if(!items.length)return `<div class="empty"><h3>No saved materials</h3><p class="small">Assignments, assessments and variations appear here.</p><div class="top-space">${btn('Create assignment','new-lesson','primary')}</div></div>`;
 return `<div class="saved-materials">${items.map(d=>`<article class="saved-draft"><div><h4>${esc(d.title)}</h4><p>${d.type==='single'?materialLabel(d.kind):'Two variations'} · ${gradeLabel(d.type==='single'?d.model.grade:d.grade)} · ${esc(alphabeticalIds(d.studentIds||[]).map(id=>getStudent(id).name).join(', ')||'Select students')}</p></div>${btn('Open '+icon('arrow'),d.type==='single'?'open-assignment':'open-draft','small',`data-id="${d.id}"`)}</article>`).join('')}</div>`;
}
document.addEventListener('selectionchange',rememberRichSelection);
document.addEventListener('mousedown',e=>{if(e.target.closest?.('.rich-toolbar button'))e.preventDefault();});
document.addEventListener('paste',e=>{if(!e.target.closest?.('#assignment-editor'))return;e.preventDefault();document.execCommand('insertText',false,e.clipboardData?.getData('text/plain')||'');queueAssignmentSave();});
document.addEventListener('drop',e=>{if(e.target.closest?.('#assignment-editor')){e.preventDefault();toast('Paste text into the editor to add content.');}});
