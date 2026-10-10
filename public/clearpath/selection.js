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
// Shared targets match goal content within an area and objective skill text.
// Each match keeps the original student-specific IDs, SMART targets and deadlines.
function sharedTargetText(value){return String(value||'').normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[.!?]+$/,'').replace(/\s+/g,' ').trim()}
function sharedGoalKey(goal){return goal?JSON.stringify([goal.domain,sharedTargetText(goal.content||goal.title)]):''}
function sharedGoalOptions(draft){
 const ids=draft.studentIds||[];if(!ids.length)return [];
 const seen=new Set(),options=[];
 for(const first of goalPlansFor(ids[0])){
  const key=sharedGoalKey(first);if(seen.has(key)||!sharedTargetText(first.content||first.title))continue;seen.add(key);
  const candidates=Object.fromEntries(ids.map(id=>[id,goalPlansFor(id).filter(g=>sharedGoalKey(g)===key)]));
  if(ids.every(id=>candidates[id].length))options.push({key,title:first.title,content:first.content||first.title,candidates});
 }
 return options.sort((a,b)=>a.title.localeCompare(b.title,'en',{sensitivity:'base'}));
}
function selectedSharedGoal(draft){
 const first=goalForDraft(draft,draft.studentIds[0]),inferred=first&&draft.studentIds.every(id=>sharedGoalKey(goalForDraft(draft,id))===sharedGoalKey(first))?sharedGoalKey(first):'';
 return sharedGoalOptions(draft).find(g=>g.key===(draft.sharedGoalKey??inferred))||null;
}
function sharedObjectiveOptions(draft,goal=selectedSharedGoal(draft)){
 if(!goal)return [];
 const ids=draft.studentIds,seen=new Set(),options=[];
 const candidates=Object.fromEntries(ids.map(id=>[id,goal.candidates[id].flatMap(g=>approvedObjectives(g).map(o=>({goalId:g.id,objectiveId:o.id,key:sharedTargetText(o.skill),skill:o.skill})))]));
 for(const first of candidates[ids[0]]){
  if(!first.key||seen.has(first.key))continue;seen.add(first.key);
  const targets={};
  for(const id of ids){const matches=candidates[id].filter(o=>o.key===first.key),match=matches.find(o=>o.objectiveId===draft.objectiveIds?.[id])||matches[0];if(match)targets[id]=match;}
  if(ids.every(id=>targets[id]))options.push({key:first.key,skill:first.skill,targets});
 }
 return options;
}
function selectedSharedObjective(draft,goal=selectedSharedGoal(draft)){
 const first=objectiveForDraft(draft,draft.studentIds[0]),inferred=first&&draft.studentIds.every(id=>sharedTargetText(objectiveForDraft(draft,id)?.skill)===sharedTargetText(first.skill))?sharedTargetText(first.skill):'';
 return sharedObjectiveOptions(draft,goal).find(o=>o.key===(draft.sharedObjectiveKey??inferred))||null;
}
function applySharedTargets(draft,goal,objective=null){
 draft.sharedGoalKey=goal?.key||'';draft.sharedObjectiveKey=objective?.key||'';
 const previous=draft.goalIds;draft.goalIds={};draft.objectiveIds={};
 if(!goal)return;
 for(const id of draft.studentIds){
  draft.goalIds[id]=objective?.targets[id].goalId||goal.candidates[id].find(g=>g.id===previous?.[id])?.id||goal.candidates[id][0].id;
  if(objective)draft.objectiveIds[id]=objective.targets[id].objectiveId;
 }
}
function reconcileSharedTargets(draft){const goal=selectedSharedGoal(draft),objective=selectedSharedObjective(draft,goal);applySharedTargets(draft,goal,objective)}
function sharedGoals(draft,prefix){
 if(!draft.studentIds.length)return '';
 const goals=sharedGoalOptions(draft),selected=selectedSharedGoal(draft);
 return `<fieldset class="assignment-section shared-targets" data-shared-goals><legend>Shared goals</legend>${goals.length?`<div class="shared-target-list">${goals.map((g,i)=>`<label class="shared-target-option"><input type="radio" id="${prefix}-shared-goal-${i}" name="shared-goal" data-shared-goal value="${esc(g.key)}" ${selected?.key===g.key?'checked':''}><span><strong>${esc(g.title)}</strong>${sharedTargetText(g.title)!==sharedTargetText(g.content)?`<small>${esc(g.content)}</small>`:''}</span></label>`).join('')}</div>`:'<p class="selection-empty" role="status">No goals shared by all selected students. Choose a different group.</p>'}</fieldset>`;
}
function sharedObjectives(draft,prefix){
 const goal=selectedSharedGoal(draft);if(!goal)return '';
 const objectives=sharedObjectiveOptions(draft,goal),selected=selectedSharedObjective(draft,goal);
 return `<fieldset class="assignment-section shared-targets" data-shared-objectives><legend>Shared objectives</legend>${objectives.length?`<div class="shared-target-list">${objectives.map((o,i)=>`<label class="shared-target-option"><input type="radio" id="${prefix}-shared-objective-${i}" name="shared-objective" data-shared-objective value="${esc(o.key)}" ${selected?.key===o.key?'checked':''}><span>${esc(o.skill)}</span></label>`).join('')}</div>`:'<p class="selection-empty" role="status">No established objectives shared by all selected students for this goal. Choose another goal or group.</p>'}</fieldset>`;
}
function canCompareDraft(draft){
 return draft.studentIds.length>=2&&draftObjectivesComplete(draft)&&new Set(draft.studentIds.map(id=>getStudent(id).grade)).size===1&&new Set(draft.studentIds.map(id=>sharedGoalKey(goalForDraft(draft,id)))).size===1&&new Set(draft.studentIds.map(id=>sharedTargetText(objectiveForDraft(draft,id).skill))).size===1;
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
 const variations=!popup&&studioIntent==='variations';if(variations)reconcileSharedTargets(draft);
 const prefix=popup?'draft':'lesson',ready=draftObjectivesComplete(draft),experiment=canCompareDraft(draft);
 return `<form class="plain-form lesson-setup selection-form ${popup?'draft-popup-form':''}" id="${popup?'assignment-draft-form':'lesson-form'}" data-assignment-setup="${popup?'popup':'page'}">
 ${assignmentStudents(draft,prefix)}${variations?sharedGoals(draft,prefix)+sharedObjectives(draft,prefix):assignmentGoals(draft,prefix)+assignmentObjectives(draft,prefix)}
 ${ready?variations?`<div class="field variation-setting"><label for="${prefix}-change">What should differ between the lessons?</label><select id="${prefix}-change" name="change" data-assignment-field="change"><option value="${esc(lessonDefaults[draft.domain].change)}" ${draft.change===lessonDefaults[draft.domain].change?'selected':''}>${esc(lessonDefaults[draft.domain].change)}</option><option value="Show one instruction at a time" ${draft.change==='Show one instruction at a time'?'selected':''}>Show one instruction at a time</option></select><p class="caption">Next, review both versions and assign students to each one.</p></div>`:`<div class="field material-type"><label for="${prefix}-kind">Material type</label><select id="${prefix}-kind" name="kind" data-assignment-field="kind"><option value="assignment" ${draft.kind==='assignment'?'selected':''}>Assignment</option><option value="assessment" ${draft.kind==='assessment'?'selected':''}>Assessment</option></select></div>`:''}
 ${variations&&(draft.studentIds.length<2||new Set(draft.studentIds.map(id=>getStudent(id).grade)).size!==1)?'<p class="selection-requirement">Select at least two students in the same grade.</p>':''}
 <div id="${popup?'draft-error':'lesson-error'}"></div><div class="form-foot"><span class="caption">Demo: AI drafting is simulated.</span><button class="btn primary" type="submit" data-generate-material ${ready&&(!variations||experiment)?'':'disabled'}>${variations?'Generate lesson variants':'Generate '+draft.kind}</button></div></form>`;
}
function redrawSelection(ctx,focusId=''){
 if(!ctx.popup){groups={a:[],b:[]};cohort=ctx.model.studentIds.slice();state.lesson=structuredClone(ctx.model);persist();}
 redrawDraft(ctx);
 if(focusId)setTimeout(()=>document.getElementById(focusId)?.focus(),50);
}
function handleAssignmentSelection(input,ctx){
 const d=ctx.model,variations=!ctx.popup&&studioIntent==='variations';normalizeDraftSelection(d);
 if(input.name==='lesson-student'){
  const id=input.value;d.studentIds=alphabeticalIds(input.checked?[...new Set([...d.studentIds,id])]:d.studentIds.filter(x=>x!==id));
  delete d.goalIds[id];delete d.objectiveIds[id];d.studentPickerOpen=true;
 }else if(variations&&input.dataset.sharedGoal!==undefined){
  applySharedTargets(d,sharedGoalOptions(d).find(g=>g.key===input.value)||null);d.studentPickerOpen=false;
 }else if(variations&&input.dataset.sharedObjective!==undefined){
  const goal=selectedSharedGoal(d);applySharedTargets(d,goal,sharedObjectiveOptions(d,goal).find(o=>o.key===input.value)||null);d.studentPickerOpen=false;
 }else if(input.dataset.assignmentGoal){
  const id=input.dataset.assignmentGoal;d.goalIds[id]=input.value;delete d.objectiveIds[id];d.studentPickerOpen=false;
 }else if(input.dataset.assignmentObjective){
  const id=input.dataset.assignmentObjective,g=goalForDraft(d,id);if(!approvedObjectives(g).some(o=>o.id===input.value))delete d.objectiveIds[id];else d.objectiveIds[id]=input.value;d.studentPickerOpen=false;
 }else if(input.dataset.assignmentField==='withVariations'){
  d.withVariations=input.checked&&canCompareDraft(d);
 }else if(input.dataset.assignmentField==='change'){d.change=input.value;return true;}
 else if(input.dataset.assignmentField==='kind'){d.kind=input.value;d.questions=input.value==='assessment'?5:3;}
 else return false;
 if(variations)reconcileSharedTargets(d);syncDraftSelection(d);redrawSelection(ctx,input.id||'');return true;
}
function handleSelectionAction(action,el){
 if(!['select-draft-students','close-student-picker'].includes(action))return false;
 const ctx=draftContext(el.closest('form')),d=ctx.model;if(!d)return true;
 normalizeDraftSelection(d);
 if(action==='select-draft-students'){d.studentIds=alphabeticalStudents().map(s=>s.id);d.studentPickerOpen=true;}else d.studentPickerOpen=false;
 const variations=!ctx.popup&&studioIntent==='variations';if(variations)reconcileSharedTargets(d);
 syncDraftSelection(d);redrawSelection(ctx,action==='close-student-picker'?(variations?'lesson-shared-goal-0':(ctx.popup?'draft':'lesson')+'-goal-'+d.studentIds[0]):'');return true;
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
