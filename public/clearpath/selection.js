'use strict';

// Student -> goal -> objective selection, shared by the page and drafting popup.
function goalForDraft(draft,id){
 const plans=goalPlansFor(id);
 return plans.find(g=>g.id===draft.goalIds?.[id])||(!draft.goalIds?.[id]?plans.find(g=>g.objectives.some(o=>o.id===draft.objectiveIds?.[id])):null)||null;
}
function objectiveForDraft(draft,id){
 const goal=goalForDraft(draft,id),o=approvedObjectives(goal).find(o=>o.id===draft.objectiveIds?.[id]);
 return o?{...o,goalId:goal.id,goalTitle:goal.title}:null;
}
function normalizeDraftSelection(draft){
 draft.studentIds=alphabeticalIds((draft.studentIds||[]).filter(id=>students.some(s=>s.id===id)));
 draft.goalIds ||= {};draft.objectiveIds ||= {};draft.kind ||= 'assignment';
 for(const id of draft.studentIds){const goal=goalForDraft(draft,id);if(goal)draft.goalIds[id]=goal.id;}
}
function draftGoalsComplete(draft){return draft.studentIds.length>0&&draft.studentIds.every(id=>!!goalForDraft(draft,id))}
function draftObjectivesComplete(draft){return draftGoalsComplete(draft)&&draft.studentIds.every(id=>!!objectiveForDraft(draft,id))}
function canCompareDraft(draft){
 return draft.studentIds.length>=2&&draftObjectivesComplete(draft)&&new Set(draft.studentIds.map(id=>getStudent(id).grade)).size===1&&new Set(draft.studentIds.map(id=>goalForDraft(draft,id).domain)).size===1;
}
function syncDraftSelection(draft){
 normalizeDraftSelection(draft);
 const first=draft.studentIds.find(id=>goalForDraft(draft,id)),goal=first?goalForDraft(draft,first):null;
 if(goal&&goal.domain!==draft.domain){
  const before=lessonDefaults[draft.domain],next=lessonDefaults[goal.domain];
  if(!draft.title||draft.title===before?.title)draft.title=next.title;
  if(!draft.source||draft.source===before?.source)draft.source=next.source;
  Object.assign(draft,{domain:goal.domain,change:next.change,context:'',a:next.a,b:next.b,directionsA:next.directionsA,directionsB:next.directionsB});
 }
 if(draft.studentIds.length)draft.grade=getStudent(draft.studentIds[0]).grade;
 if(!canCompareDraft(draft))draft.withVariations=false;
}
function assignmentStudents(draft,prefix){
 const names=draft.studentIds.map(id=>getStudent(id).name),summary=names.length?names.slice(0,2).join(', ')+(names.length>2?' +'+(names.length-2):''):'Select students';
 return `<div class="assignment-section"><label class="assignment-field-label" id="${prefix}-students-label">Students</label><details class="student-picker" id="${prefix}-students" ${draft.studentPickerOpen?'open':''}><summary aria-labelledby="${prefix}-students-label ${prefix}-students-value"><span id="${prefix}-students-value" class="${names.length?'':'muted'}">${esc(summary)}</span>${icon('down')}</summary><div class="student-picker-menu"><label class="picker-search">${icon('search')}<input type="search" data-assignment-search placeholder="Search students" aria-label="Search students" autocomplete="off"></label><div class="student-picker-list">${alphabeticalStudents().map(s=>`<label class="assignment-student-row" data-student-name="${esc(s.name.toLowerCase())}"><input id="${prefix}-student-${s.id}" type="checkbox" name="lesson-student" value="${s.id}" ${draft.studentIds.includes(s.id)?'checked':''}>${avatar(s,'tiny')}<span>${esc(s.name)}</span><small>${gradeLabel(s.grade)}</small></label>`).join('')}<p class="picker-empty" hidden>No students found.</p></div><div class="student-picker-foot"><button type="button" class="text-btn" data-action="select-draft-students">Select all</button><span>${names.length} selected</span><button type="button" class="btn small" data-action="close-student-picker">Done</button></div></div></details></div>`;
}
function assignmentGoals(draft,prefix){
 if(!draft.studentIds.length)return '';
 return `<fieldset class="assignment-section assignment-targets" data-assignment-goals><legend>Goals</legend>${draft.studentIds.map(id=>{const s=getStudent(id),goals=goalPlansFor(id),ready=goals.filter(g=>approvedObjectives(g).length);return `<div class="field target-selection target-select-row">${draft.studentIds.length>1?`<span class="target-avatar" title="${esc(s.name)}">${avatar(s,'tiny')}</span>`:''}${ready.length?`<select aria-label="Goal for ${esc(s.name)}" id="${prefix}-goal-${id}" data-assignment-goal="${id}" required><option value="">Select a goal</option>${goals.map((g,i)=>`<option value="${g.id}" ${draft.goalIds[id]===g.id?'selected':''} ${approvedObjectives(g).length?'':'disabled'}>Goal ${i+1} · ${esc(g.title)}${approvedObjectives(g).length?'':' · Review objectives first'}</option>`).join('')}</select>`:`<p class="selection-empty">${goals.length?'Establish an objective before generating materials.':'No IEP goals yet.'} <a href="#student/${id}" class="text-btn" data-action="open-student-plan" data-id="${id}">${goals.length?'Review IEP plan':'Set an IEP goal'}</a></p>`}</div>`}).join('')}</fieldset>`;
}
function assignmentObjectives(draft,prefix='lesson'){
 if(!draftGoalsComplete(draft))return '';
 return `<fieldset class="assignment-section assignment-targets" data-assignment-objectives><legend>Objectives</legend>${draft.studentIds.map(id=>{const s=getStudent(id),g=goalForDraft(draft,id);return `<div class="field target-selection target-select-row">${draft.studentIds.length>1?`<span class="target-avatar" title="${esc(s.name)}">${avatar(s,'tiny')}</span>`:''}<select aria-label="Objective for ${esc(s.name)}" id="${prefix}-objective-${id}" data-assignment-objective="${id}" required><option value="">Select an objective</option>${approvedObjectives(g).map(o=>`<option value="${o.id}" ${draft.objectiveIds[id]===o.id?'selected':''}>Objective ${g.objectives.indexOf(o)+1} · ${esc(o.skill)}</option>`).join('')}</select></div>`}).join('')}</fieldset>`;
}
function assignmentSetupForm(draft,popup=false){
 normalizeDraftSelection(draft);
 const prefix=popup?'draft':'lesson',ready=draftObjectivesComplete(draft),experiment=canCompareDraft(draft),variations=!popup&&studioIntent==='variations';
 return `<form class="plain-form lesson-setup selection-form ${popup?'draft-popup-form':''}" id="${popup?'assignment-draft-form':'lesson-form'}" data-assignment-setup="${popup?'popup':'page'}">
 ${assignmentStudents(draft,prefix)}${assignmentGoals(draft,prefix)}${assignmentObjectives(draft,prefix)}
 ${ready?variations?`<div class="field variation-setting"><label for="${prefix}-change">What should differ between the lessons?</label><select id="${prefix}-change" name="change" data-assignment-field="change"><option value="${esc(lessonDefaults[draft.domain].change)}" ${draft.change===lessonDefaults[draft.domain].change?'selected':''}>${esc(lessonDefaults[draft.domain].change)}</option><option value="Show one instruction at a time" ${draft.change==='Show one instruction at a time'?'selected':''}>Show one instruction at a time</option></select><p class="caption">Next, review both versions and assign students to each one.</p></div>`:`<div class="field material-type"><label for="${prefix}-kind">Material type</label><select id="${prefix}-kind" name="kind" data-assignment-field="kind"><option value="assignment" ${draft.kind==='assignment'?'selected':''}>Assignment</option><option value="assessment" ${draft.kind==='assessment'?'selected':''}>Assessment</option></select></div>`:''}
 ${variations&&!experiment?'<p class="selection-requirement">Select at least two students in the same grade with goals in the same area.</p>':''}
 <div id="${popup?'draft-error':'lesson-error'}"></div><div class="form-foot"><span class="caption">Demo: AI drafting is simulated.</span><button class="btn primary" type="submit" data-generate-material ${ready&&(!variations||experiment)?'':'disabled'}>${variations?'Generate lesson variants':'Generate '+draft.kind}</button></div></form>`;
}
function redrawSelection(ctx,focusId=''){
 if(!ctx.popup){groups={a:[],b:[]};cohort=ctx.model.studentIds.slice();state.lesson=structuredClone(ctx.model);persist();}
 redrawDraft(ctx);
 if(focusId)setTimeout(()=>document.getElementById(focusId)?.focus(),50);
}
function handleAssignmentSelection(input,ctx){
 const d=ctx.model,prefix=ctx.popup?'draft':'lesson';normalizeDraftSelection(d);
 if(input.name==='lesson-student'){
  const id=input.value;d.studentIds=alphabeticalIds(input.checked?[...new Set([...d.studentIds,id])]:d.studentIds.filter(x=>x!==id));
  delete d.goalIds[id];delete d.objectiveIds[id];d.studentPickerOpen=true;
 }else if(input.dataset.assignmentGoal){
  const id=input.dataset.assignmentGoal;d.goalIds[id]=input.value;delete d.objectiveIds[id];d.studentPickerOpen=false;
 }else if(input.dataset.assignmentObjective){
  const id=input.dataset.assignmentObjective,g=goalForDraft(d,id);if(!approvedObjectives(g).some(o=>o.id===input.value))delete d.objectiveIds[id];else d.objectiveIds[id]=input.value;d.studentPickerOpen=false;
 }else if(input.dataset.assignmentField==='withVariations'){
  d.withVariations=input.checked&&canCompareDraft(d);
 }else if(input.dataset.assignmentField==='change'){d.change=input.value;return true;}
 else if(input.dataset.assignmentField==='kind'){d.kind=input.value;d.questions=input.value==='assessment'?5:3;}
 else return false;
 syncDraftSelection(d);redrawSelection(ctx,input.id||'');return true;
}
function handleSelectionAction(action,el){
 if(!['select-draft-students','close-student-picker'].includes(action))return false;
 const ctx=draftContext(el.closest('form')),d=ctx.model;if(!d)return true;
 normalizeDraftSelection(d);
 if(action==='select-draft-students'){d.studentIds=alphabeticalStudents().map(s=>s.id);d.studentPickerOpen=true;}else d.studentPickerOpen=false;
 syncDraftSelection(d);redrawSelection(ctx,action==='close-student-picker'?(ctx.popup?'draft':'lesson')+'-goal-'+d.studentIds[0]:'');return true;
}
function filterAssignmentStudents(input){
 const menu=input.closest('.student-picker-menu'),value=input.value.trim().toLowerCase();if(!menu)return;
 const rows=[...menu.querySelectorAll('[data-student-name]')];for(const row of rows)row.hidden=!row.dataset.studentName.includes(value);
 const empty=menu.querySelector('.picker-empty');if(empty)empty.hidden=rows.some(row=>!row.hidden);
}
function materialForStudent(draft,id){
 const s=getStudent(id),g=goalForDraft(draft,id),domain=g?.domain||draft.domain;
 const same=domain===draft.domain,defaults=lessonDefaults[domain];
 return {...structuredClone(draft),domain,grade:s.grade,title:same?draft.title:defaults.title,source:same?draft.source:defaults.source,studentIds:[id],goalIds:g?{[id]:g.id}:{},objectiveIds:{[id]:draft.objectiveIds[id]},context:draft.studentIds.length===1&&draft.context?draft.context:guidanceFor(s).map(t=>t.title+'. '+t.detail).join('\n')};
}
function draftGradeLabel(draft){const grades=[...new Set((draft.studentIds||[]).map(id=>getStudent(id).grade))];return grades.length>1?'Multiple grades':gradeLabel(grades[0]??draft.grade)}
function draftAreaLabel(draft){const areas=[...new Set((draft.studentIds||[]).map(id=>goalForDraft(draft,id)?.domain).filter(Boolean))];return areas.length>1?'Individual learning goals':domainNames[areas[0]||draft.domain]}
