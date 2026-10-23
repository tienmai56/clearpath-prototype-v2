'use strict';

let goalsTab='goal',goalsStudentId='';
let workspaceGoalIds={},workspaceObjectiveIds={},workspaceExpandedGoals={};
const serviceTypes={
 'Occupational therapy':'Occupational therapist',
 'Speech therapy':'Speech therapist',
 'Special education instruction':'Special education teacher',
 'Physical therapy':'Physical therapist',
 'Counseling':'School counselor'
};

function navigateGoalWorkspace(tab='goal',studentId=goalsStudentId){
 goalsTab=['goal','service','notes'].includes(tab)?tab:'goal';
 goalsStudentId=students.some(s=>s.id===studentId)?studentId:'';
 navigate('plans/'+goalsTab+(goalsStudentId?'/'+goalsStudentId:''));
}
function goalWorkspaceView(){
 const r=route();
 if(r.id){goalsTab=['goal','service','notes'].includes(r.id)?r.id:'goal';goalsStudentId=students.some(s=>s.id===r.student)?r.student:'';}
 if(!students.some(s=>s.id===goalsStudentId))goalsStudentId='';
 const s=students.find(s=>s.id===goalsStudentId);
 return `<div class="page-head"><h1>Create &amp; Track Goals</h1></div>
  <div class="tabs goal-workspace-tabs" role="tablist" aria-label="Create and track goals">${[['goal','IEP Goal'],['service','Service Time'],['notes','Notes']].map(([value,label])=>`<button id="goals-tab-${value}" class="tab ${goalsTab===value?'active':''}" role="tab" aria-selected="${goalsTab===value}" aria-controls="goal-workspace-panel" data-action="goals-tab" data-value="${value}">${label}${value==='notes'&&s&&hasNewGuidance(s.id)?`<span class="tab-unread"><i class="unread-dot"></i>${newGuidanceNotes(s).length} new</span>`:''}</button>`).join('')}</div>
  <div id="goal-workspace-panel" class="goal-workspace" role="tabpanel" aria-labelledby="goals-tab-${goalsTab}">
   <div class="workspace-student-row"><div class="field"><label for="goals-student">Student</label><select id="goals-student"><option value="">Select student</option>${alphabeticalStudents().map(student=>`<option value="${student.id}" ${student.id===goalsStudentId?'selected':''}>${esc(student.name)}</option>`).join('')}</select></div>${s&&goalsTab==='notes'?btn(icon('plus')+'Add note','context','',`data-id="${s.id}"`):''}</div>
   ${s?(goalsTab==='goal'?workspaceGoalView(s):goalsTab==='service'?serviceTimeView(s):studentEvidence(s)):`<p class="workspace-placeholder">Select a student to ${goalsTab==='goal'?'create or track a goal':goalsTab==='service'?'log service time':'view notes and guidance'}.</p>`}
  </div>`;
}
function workspaceGoalView(s){
 const goals=goalPlansFor(s.id),g=goals.find(g=>g.id===workspaceGoalIds[s.id]);
 const o=g?.objectives.find(o=>o.id===workspaceObjectiveIds[s.id]);
 if(g)activeGoalIds[s.id]=g.id;
 if(o)activeObjectiveIds[s.id]=o.id;
 return `<div class="workspace-goal-fields">
  <div class="field"><div class="progress-goal-label"><label for="workspace-goal">Goal</label>${goals.length?`<button class="text-btn" data-action="add-goal" data-id="${s.id}">+ Add goal</button>`:''}</div><select id="workspace-goal" ${goals.length?'':'disabled'}><option value="">${goals.length?'Select goal':'No goals yet'}</option>${goals.map(goal=>`<option value="${goal.id}" ${g?.id===goal.id?'selected':''}>${esc(goal.title)}${goalAchieved(goal)?' · Achieved':''}</option>`).join('')}</select></div>
  ${!goals.length?`<div class="workspace-first-goal">${btn('Add goal','add-goal','primary',`data-id="${s.id}"`)}</div>`:''}
  ${g?`<div class="workspace-goal-meta"><span>Goal deadline: ${formatDate(g.deadline)}, ${g.deadline.slice(0,4)}</span></div>
   <div class="field"><label for="workspace-objective">Objective</label><select id="workspace-objective" ${g.objectives.length?'':'disabled'}><option value="">${g.objectives.length?'Select objective':'No objectives yet'}</option>${g.objectives.map((objective,i)=>`<option value="${objective.id}" ${o?.id===objective.id?'selected':''}>Objective ${i+1} · ${esc(objective.skill)}${objective.status==='approved'?'':' · Draft'}</option>`).join('')}</select></div>
   ${o?`<section class="workspace-objective" aria-label="Selected objective"><p class="workspace-smart">${esc(smartText(o,s))}</p>${o.status==='approved'?`${progressChart(s)}<div class="workspace-primary-action">${btn('Record progress','record-progress','primary',`data-id="${s.id}"`)}</div>`:`<div class="actions">${btn('Edit objective','edit-objective','',`data-id="${s.id}" data-goal="${g.id}" data-objective="${o.id}"`)}${btn('Approve objective','approve-objective','primary',`data-id="${s.id}" data-goal="${g.id}" data-objective="${o.id}"`)}</div>`}</section>`:''}
   <div class="workspace-goal-tools"><button class="text-btn" data-action="workspace-goal-details" data-goal="${g.id}" aria-expanded="${workspaceExpandedGoals[s.id]===g.id}" aria-controls="workspace-goal-details">${workspaceExpandedGoals[s.id]===g.id?'Hide':'View'} goal &amp; objectives ${icon('chevron')}</button></div>
   ${workspaceExpandedGoals[s.id]===g.id?`<div id="workspace-goal-details" class="workspace-goal-details">${studentPlan(s,g.id)}</div>`:''}`:''}
 </div>`;
}
function serviceTimeView(s){
 const entries=state.serviceEntries.filter(entry=>entry.student===s.id).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
 return `<form id="service-time-form" class="service-time-form"><input type="hidden" name="student" value="${s.id}">
  <div class="field"><label for="service-type">Service</label><select id="service-type" name="service" required><option value="">Select service</option>${Object.keys(serviceTypes).map(service=>`<option>${service}</option>`).join('')}</select></div>
  <div class="field"><label for="service-provider">Provider</label><input id="service-provider" name="provider" placeholder="Provider name" required maxlength="100"></div>
  <div class="field-row"><div class="field"><label for="service-date">Date</label><input id="service-date" name="date" type="date" value="${TODAY}" required></div><div class="field"><label for="service-minutes">Time (minutes)</label><input id="service-minutes" name="minutes" type="number" min="1" max="1440" step="1" placeholder="30" required></div></div>
  <div class="field"><label for="service-goal">Goal <span class="optional-label">Optional</span></label><select id="service-goal" name="goal"><option value="">No linked goal</option>${goalPlansFor(s.id).map(g=>`<option value="${g.id}">${esc(g.title)}</option>`).join('')}</select></div>
  <div class="field"><label for="service-note">Session note <span class="optional-label">Optional</span></label><textarea id="service-note" name="note" rows="3" maxlength="3000" placeholder="What helped the student during this session?"></textarea><p class="caption">Appears in Notes and updates guidance.</p></div>
  <div id="service-error" aria-live="polite"></div><button type="submit" class="btn primary">Save service time</button>
 </form><section class="service-history" aria-labelledby="service-history-heading"><div class="section-row"><h2 id="service-history-heading">Service history</h2>${entries.length?`<span class="caption no-margin">${entries.reduce((total,entry)=>total+entry.minutes,0)} minutes logged</span>`:''}</div>${entries.length?`<div class="table-wrap"><table class="compact-table"><thead><tr><th>Date</th><th>Service</th><th>Provider</th><th>Minutes</th></tr></thead><tbody>${entries.map(entry=>`<tr><td><time datetime="${entry.date}">${formatDate(entry.date)}, ${entry.date.slice(0,4)}</time></td><td>${esc(entry.service)}${entry.goal?`<small>${esc(findGoal(s.id,entry.goal)?.title||'Goal no longer available')}</small>`:''}</td><td>${esc(entry.provider)}</td><td>${entry.minutes}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No service time recorded yet.</p>'}</section>`;
}
function saveServiceTime(d){
 const student=students.find(s=>s.id===d.student),provider=String(d.provider||'').trim(),note=String(d.note||'').trim(),minutes=Number(d.minutes);
 if(!student||!Object.hasOwn(serviceTypes,d.service)||!provider||provider.length>100||!Number.isInteger(minutes)||minutes<1||minutes>1440)return formError('service-error','Choose a service, enter a provider, and add 1–1,440 minutes.');
 const parsed=new Date(d.date+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date||'')||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==d.date)return formError('service-error','Choose a valid session date.');
 if(d.goal&&!findGoal(student.id,d.goal))return formError('service-error','Choose a goal belonging to this student.');
 if(note.length>3000)return formError('service-error','Keep the session note under 3,000 characters.');
 const previous={entries:state.serviceEntries.slice(),contexts:state.contexts.slice(),guidance:structuredClone(state.guidanceUpdates)};
 const entry={id:uid('service'),student:student.id,service:d.service,provider,date:d.date,minutes,goal:d.goal||'',createdAt:new Date().toISOString()};
 if(note){const observation={id:uid('note'),student:student.id,role:serviceTypes[d.service],author:provider,dateISO:d.date,date:formatDate(d.date),text:note,serviceId:entry.id,initials:provider.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase(),color:'sage'};entry.noteId=observation.id;state.contexts.unshift(observation);refreshGuidance(student);}
 state.serviceEntries.unshift(entry);
 if(!persist()){state.serviceEntries=previous.entries;state.contexts=previous.contexts;state.guidanceUpdates=previous.guidance;return formError('service-error','Could not save service time. Free some browser storage and try again.');}
 render();toast(note?'Service time saved. Note and guidance updated.':'Service time saved.');
}
function handleGoalWorkspaceAction(action,el){
 if(action==='goals-tab'){navigateGoalWorkspace(el.dataset.value);return true;}
 if(action==='workspace-goal-details'){workspaceExpandedGoals[goalsStudentId]=workspaceExpandedGoals[goalsStudentId]===el.dataset.goal?'':el.dataset.goal;render();return true;}
 return false;
}
function handleGoalWorkspaceChange(target){
 if(target.id==='goals-student'){notesSource='all';navigateGoalWorkspace(goalsTab,target.value);return true;}
 const s=students.find(s=>s.id===goalsStudentId);
 if(target.id==='workspace-goal'&&s){workspaceGoalIds[s.id]=findGoal(s.id,target.value)?.id||'';delete workspaceObjectiveIds[s.id];delete activeObjectiveIds[s.id];render();return true;}
 if(target.id==='workspace-objective'&&s){const g=findGoal(s.id,workspaceGoalIds[s.id]);workspaceObjectiveIds[s.id]=g?.objectives.find(o=>o.id===target.value)?.id||'';render();return true;}
 return false;
}
