'use strict';

let goalDraftEditor=null;
let goalMetadataChanged=false;
function goalAchieved(goal){return goal?.status==='achieved'}
function initializeGoalDetails(){
 const seedNames={reading:'Story sequencing',math:'One-step word problems',writing:'Complete sentences'};
 for(const [studentId,goals] of Object.entries(state.goalPlans||{}))for(const g of goals){
  if(g.content===undefined){g.content=g.title||'';if(g.id==='goal-'+studentId&&g.title===goalSummaries[g.domain])g.title=seedNames[g.domain];goalMetadataChanged=true;}
  for(const key of ['standard','baseline'])if(g[key]===undefined){g[key]='';goalMetadataChanged=true;}
  if(!g.status){g.status='active';goalMetadataChanged=true;}
  if(g.achievedAt===undefined){g.achievedAt=null;goalMetadataChanged=true;}
 }
}
function goalObjectiveFields(){
 return goalDraftEditor.objectives.map((o,i)=>`<div class="goal-objective-field"><div class="goal-objective-label"><label for="goal-objective-${i}">Objective ${i+1}</label>${!o.id&&i>0?`<button type="button" class="text-btn" data-action="remove-goal-objective" data-index="${i}" aria-label="Remove objective ${i+1}">Remove</button>`:''}</div><textarea id="goal-objective-${i}" name="goalObjective-${i}" data-goal-objective="${i}" rows="2" maxlength="1200" ${o.id?'required':''} placeholder="What smaller skill will the student work on?">${esc(o.skill)}</textarea></div>`).join('');
}
function goalModal(id,gid=''){
 const s=students.find(s=>s.id===id),g=findGoal(id,gid);if(!s)return;
 goalDraftEditor={student:id,goalId:gid,returnWorkspace:route().page==='plans',objectives:g?.objectives.length?g.objectives.map(o=>({id:o.id,skill:o.skill})):[{id:null,skill:''}]};
 openModal(g?'Edit goal':'Add goal',s.name,`<form id="goal-form" class="goal-editor"><input type="hidden" name="student" value="${id}"><input type="hidden" name="goalId" value="${gid}">
  <div class="field"><label for="goal-title">Goal name</label><input id="goal-title" name="title" required maxlength="160" placeholder="e.g. Story sequencing" value="${esc(g?.title||'')}"></div>
  <div class="field"><label for="goal-content">Content</label><textarea id="goal-content" name="content" required rows="3" maxlength="2000" placeholder="What should the student be able to do?">${esc(g?.content||'')}</textarea></div>
  <div class="field-row"><div class="field"><label for="goal-domain">Goal area</label><select id="goal-domain" name="domain">${Object.entries(domainNames).map(([v,l])=>`<option value="${v}" ${(g?.domain||s.domain)===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field"><label for="goal-deadline">Goal deadline</label><input id="goal-deadline" type="date" name="deadline" min="${g?.deadline&&g.deadline<TODAY?g.deadline:TODAY}" value="${g?.deadline||'2027-05-21'}" required></div></div>
  <div class="field"><label for="goal-standard">Standard <span class="optional-label">Optional</span></label><textarea id="goal-standard" name="standard" rows="2" maxlength="600" placeholder="Standard or competency">${esc(g?.standard||'')}</textarea></div>
  <div class="field"><label for="goal-baseline">Baseline <span class="optional-label">Optional</span></label><textarea id="goal-baseline" name="baseline" rows="2" maxlength="1200" placeholder="What can the student do now?">${esc(g?.baseline||'')}</textarea></div>
  <fieldset class="goal-objective-editor"><legend>Objectives</legend>${!g?'<p class="caption">Add skills below, or leave blank to generate objectives from the goal.</p>':''}<div id="goal-objective-fields">${goalObjectiveFields()}</div><button type="button" class="text-btn" data-action="add-goal-objective">+ Add objective</button></fieldset>
  <div id="goal-error" aria-live="polite"></div><div class="modal-foot"><button type="button" class="btn" data-action="close">Cancel</button><button class="btn primary" type="submit">${g?'Save goal':'Add goal'}</button></div></form>`,{wide:true});
}
function rememberGoalObjectives(){
 if(!goalDraftEditor)return;
 document.getElementById('goal-objective-fields')?.querySelectorAll('[data-goal-objective]').forEach(input=>{const o=goalDraftEditor.objectives[+input.dataset.goalObjective];if(o)o.skill=input.value;});
}
function goalObjectiveDraft(g,skill,index,total){
 const days=Math.max(0,Math.round((new Date(g.deadline+'T12:00:00')-new Date(TODAY+'T12:00:00'))/86400000));
 return {id:uid('objective'),skill,condition:'with usual accommodations',target:80,checks:3,deadline:index===total-1?g.deadline:datePlus(Math.round(days*(index+1)/total)),status:'draft',sample:false};
}
function saveGoalForm(d){
 const s=students.find(s=>s.id===d.student),previous=findGoal(d.student,d.goalId),title=d.title?.trim(),content=d.content?.trim(),standard=d.standard?.trim()||'',baseline=d.baseline?.trim()||'';
 if(!s||!title||title.length>160||!content||content.length>2000||standard.length>600||baseline.length>1200||!domainNames[d.domain])return formError('goal-error','Enter a goal name, content and goal area.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.deadline||'')||!Number.isFinite(Date.parse(d.deadline))||(d.deadline<TODAY&&d.deadline!==previous?.deadline))return formError('goal-error','Choose a valid goal deadline.');
 if(d.goalId&&!previous)return formError('goal-error','This goal is no longer available.');
 const now=new Date().toISOString(),g=previous?structuredClone(previous):{id:uid('goal'),objectives:[],measurement:{method:defaultMeasures[d.domain],frequency:'2',review:d.deadline<datePlus(14)?d.deadline:datePlus(14)},status:'active',achievedAt:null,createdAt:now};
 const changed=previous&&(previous.content!==content||previous.domain!==d.domain||previous.deadline!==d.deadline);
 Object.assign(g,{title,content,standard,baseline,domain:d.domain,deadline:d.deadline,updatedAt:now});
 const entries=Object.entries(d).filter(([key])=>/^goalObjective-\d+$/.test(key)).sort((a,b)=>+a[0].split('-')[1]-+b[0].split('-')[1]);
 const newSkills=[];let objectivesChanged=false;
 for(const [key,value] of entries){const index=+key.split('-')[1],skill=String(value).trim(),old=g.objectives[index];
  if(skill.length>1200||old&&!skill)return formError('goal-error','Add a skill for each existing objective.');
  if(old&&old.skill!==skill){old.skill=skill;old.status='draft';old.sample=false;delete old.completedAt;objectivesChanged=true;}
  else if(!old&&skill)newSkills.push(skill);
 }
 const total=g.objectives.length+newSkills.length;
 newSkills.forEach(skill=>g.objectives.push(goalObjectiveDraft(g,skill,g.objectives.length,total)));
 if(!g.objectives.length)g.objectives=draftObjectives(s,g);
 if(changed){for(const o of g.objectives){o.status='draft';delete o.completedAt;if(o.deadline>d.deadline)o.deadline=d.deadline;}if(g.measurement.review>d.deadline)g.measurement.review=d.deadline;}
 if(changed||objectivesChanged||newSkills.length){g.status='active';g.achievedAt=null;}
 const oldGoals=state.goalPlans[s.id]||[],first=!oldGoals.length,oldDomain=s.domain;
 state.goalPlans[s.id]=previous?oldGoals.map(x=>x.id===g.id?g:x):[...oldGoals,g];if(first)s.domain=g.domain;
 if(!persist()){state.goalPlans[s.id]=oldGoals;s.domain=oldDomain;return formError('goal-error','Could not save the goal. Try again after freeing browser storage.');}
 const returnWorkspace=goalDraftEditor?.returnWorkspace;activeGoalIds[s.id]=g.id;delete activeObjectiveIds[s.id];closeModal();if(returnWorkspace){workspaceGoalIds[s.id]=g.id;workspaceObjectiveIds[s.id]=g.objectives[0]?.id||'';navigateGoalWorkspace('goal',s.id);}else{openStudentSection(s.id,'iep','plan');}toast(previous?'Goal saved.':'Goal added. Review its objectives.');
}
function setGoalAchievement(id,gid,achieved){
 const g=findGoal(id,gid);if(!g)return;
 const before=structuredClone(g);g.status=achieved?'achieved':'active';g.achievedAt=achieved?new Date().toISOString():null;g.updatedAt=new Date().toISOString();
 if(!persist()){state.goalPlans[id]=state.goalPlans[id].map(x=>x.id===gid?before:x);return;}
 activeGoalIds[id]=gid;render();toast(achieved?'Goal marked achieved.':'Goal reopened.');
}
function goalAchievementAction(s,g){return `<button class="text-btn" data-action="${goalAchieved(g)?'reopen-goal':'achieve-goal'}" data-id="${s.id}" data-goal="${g.id}">${goalAchieved(g)?'Reopen goal':'Mark as achieved'}</button>`}
function goalAchievementLabel(g){return `<span class="achieved-goal">${icon('check')}Achieved goal${g.achievedAt?`<time datetime="${esc(g.achievedAt)}"> · ${new Date(g.achievedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</time>`:''}</span>`}
function handleGoalAction(action,el){
 if(action==='achieve-goal'||action==='reopen-goal'){setGoalAchievement(el.dataset.id,el.dataset.goal,action==='achieve-goal');return true;}
 if(!['add-goal-objective','remove-goal-objective'].includes(action))return false;
 if(!goalDraftEditor)return true;rememberGoalObjectives();
 if(action==='add-goal-objective')goalDraftEditor.objectives.push({id:null,skill:''});
 else{const index=+el.dataset.index;if(index>0&&!goalDraftEditor.objectives[index]?.id)goalDraftEditor.objectives.splice(index,1);}
 document.getElementById('goal-objective-fields').innerHTML=goalObjectiveFields();
 if(action==='add-goal-objective')document.getElementById('goal-objective-'+(goalDraftEditor.objectives.length-1))?.focus();
 return true;
}
