const {test}=require('node:test');
const assert=require('node:assert/strict');
const {environment}=require('./harness.cjs');

test('Create & Track Goals replaces the roster with three student-first tabs',()=>{
 const e=environment();e.view('plans');const html=e.html();
 assert(html.includes('Create &amp; Track Goals'));
 assert(!html.includes('IEP plans'));assert(!html.includes('plan-table'));
 for(const label of ['IEP Goal','Service Time','Notes'])assert(html.includes('>'+label+'</button>'));
 assert(html.includes('Select student'));assert(!html.includes('id="workspace-goal"'));assert(!html.includes('id="workspace-objective"'));
 const select=html.split('id="goals-student"')[1].split('</select>')[0];
 const names=Array.from(e.run('alphabeticalStudents().map(s=>s.name)'));
 names.forEach((name,i)=>{assert(select.includes('>'+name+'</option>'));if(i)assert(select.indexOf(names[i-1])<select.indexOf(name));});
});

test('Student, goal, and objective choices reveal only the matching progress and keep recording in a popup',async()=>{
 const e=environment();e.view('plans');e.change({id:'goals-student',value:'ava'});
 assert.equal(e.run('location.hash'),'#plans/goal/ava');assert(e.html().includes('id="workspace-goal"'));assert(!e.html().includes('id="workspace-objective"'));
 e.change({id:'workspace-goal',value:'goal-ava'});assert(e.html().includes('Objective 1'));assert(!e.html().includes('data-action="record-progress"'));
 e.change({id:'workspace-objective',value:'goal-ava-o1'});assert(e.html().includes('data-action="record-progress"'));
 e.click('record-progress',{id:'ava'});assert.equal(e.run('progressCapture.objective'),'goal-ava-o1');assert(e.modal().includes('Upload files from this device'));assert(e.modal().includes('Scan using mobile device'));
 e.change({name:'evidence-method',value:'manual'});e.click('progress-next');
 await e.submit('log-form',{student:'ava',goal:'goal-ava',objective:'goal-ava-o1',comparison:'',date:'2026-10-09',correct:'3',attempts:'5',support:'independent',phase:'followup',note:''});
 assert.equal(e.run('location.hash'),'#plans/goal/ava');assert.equal(e.run('state.logs[0].objective'),'goal-ava-o1');assert(e.html().includes('60 percent'));assert.equal(e.modal(),'');
 e.change({id:'goals-student',value:'ben'});assert(!e.html().includes('value="goal-ava"'));assert(!e.html().includes('id="workspace-objective"'));
});

test('Goal details keep numbered objectives under a clear, minimal goal summary',()=>{
 const e=environment();e.view('plans/goal/ava');e.change({id:'workspace-goal',value:'goal-ava'});e.click('workspace-goal-details',{goal:'goal-ava'});
 assert(e.html().includes('Goal 1:'));assert(e.html().includes('objectives-nested'));assert(e.html().includes('Objective 1'));assert(e.html().includes('Objective 2'));assert(e.html().includes('How progress is measured'));
 assert(!e.html().includes('Content</dt>'));assert(!e.html().includes('Standard</dt>'));assert(!e.html().includes('Mark as achieved'));assert(!e.html().includes('Established'));
 e.click('achieve-goal',{id:'ava',goal:'goal-ava'});assert(e.run("goalAchieved(findGoal('ava','goal-ava'))"));assert(!e.run("goalAchieved(findGoal('milo','goal-milo'))"));
 e.click('reopen-goal',{id:'ava',goal:'goal-ava'});assert(!e.run("goalAchieved(findGoal('ava','goal-ava'))"));
});

test('Adding and editing a goal return to the goals workspace with draft objectives ready to review',()=>{
 const e=environment();e.view('plans/goal/ava');e.click('add-goal',{id:'ava'});
 const data={student:'ava',goalId:'',title:'Find the main idea',content:'Identify the main idea of a paragraph',domain:'reading',standard:'Literacy skill',baseline:'Needs a picture cue',deadline:'2027-05-21','goalObjective-0':'Identify the topic sentence'};
 e.submit('goal-form',data);assert.equal(e.run('location.hash'),'#plans/goal/ava');
 const g=e.run('state.goalPlans.ava.at(-1)'),o=g.objectives[0];
 assert(e.html().includes('Approve objective'));assert(!e.html().includes('data-action="record-progress"'));
 e.click('approve-objective',{id:'ava',goal:g.id,objective:o.id});assert(!e.html().includes('Approve objective'));assert(!e.html().includes('Established'));assert(e.html().includes('data-action="record-progress"'));
 e.click('edit-goal',{id:'ava',goal:g.id});e.submit('goal-form',{...data,goalId:g.id,title:'Main idea'});
 assert.equal(e.run('location.hash'),'#plans/goal/ava');assert.equal(e.run('activeGoal("ava").id'),g.id);assert.equal(e.run('activeObjective("ava").id'),o.id);
});

test('Notes moves to the workspace, preserves the student between tabs, and retains citations and portraits',()=>{
 const e=environment();e.view('student/ava');assert(!e.html().includes('data-value="evidence"'));
 e.click('open-student-notes',{id:'ava'});assert.equal(e.run('location.hash'),'#plans/notes/ava');assert(e.html().includes('Notes by week'));assert(e.html().includes('notes-summary'));assert(e.html().includes('stakeholder-avatar'));assert(e.html().includes('data-id="ava" data-note="sample-note-ava-0"'));
 e.click('goals-tab',{value:'service'});assert.equal(e.run('location.hash'),'#plans/service/ava');
 e.click('goals-tab',{value:'notes'});assert.equal(e.run('location.hash'),'#plans/notes/ava');
 const group={open:false},note=e.node('sample-prior-ava');let focused=false;note.closest=()=>group;note.focus=()=>focused=true;
 e.change({id:'notes-source',value:'Parent'});e.click('show-note',{id:'ava',note:'sample-prior-ava'});
 assert.equal(e.run('notesSource'),'all');assert(group.open);assert(focused);assert(e.html().includes('Jordan Bell'));
});

test('Student guidance and legacy notes navigation land in the Notes tab',()=>{
 const e=environment();e.click('review-guidance',{id:'ava'});assert.equal(e.run('location.hash'),'#plans/notes/ava');assert(e.modal().includes('Recommended lesson update'));
 e.view('plans/notes/ava');assert(e.modal().includes('Create revised draft'));e.click('show-note',{id:'ava',note:'sample-note-ava-0'});assert.equal(e.modal(),'');assert(e.run('hasNewGuidance("ava")'));
 e.run("studentTab='evidence'");e.view('student/amir');assert.equal(e.run('location.hash'),'#plans/notes/amir');
 e.click('context',{id:'amir'});e.submit('context-form',{student:'amir',role:'Parent',author:'Amir’s family',dateISO:'2026-10-09',text:'Picture cues helped with starting homework.'});
 assert.equal(e.run('location.hash'),'#plans/notes/amir');assert(e.html().includes('Amir’s family'));assert(e.run('hasNewGuidance("amir")'));
});

const service={student:'ava',service:'Occupational therapy',provider:'Maya Chen',date:'2026-10-09',minutes:'30',goal:'goal-ava',note:''};

test('Service time saves and reloads per student without altering goals or manufacturing guidance',()=>{
 const e=environment();e.view('plans/service/ava');assert(e.html().includes('No service time recorded yet.'));
 const before=e.run('JSON.stringify(state.goalPlans)'),revision=e.run('guidanceUpdate("ava").revision');
 e.submit('service-time-form',service);assert.equal(e.run('state.serviceEntries.length'),1);assert(e.html().includes('30 minutes logged'));assert(e.html().includes('Maya Chen'));assert.equal(e.run('guidanceUpdate("ava").revision'),revision);assert.equal(e.run('JSON.stringify(state.goalPlans)'),before);
 e.change({id:'goals-student',value:'ben'});assert(e.html().includes('No service time recorded yet.'));assert(!e.html().includes('Maya Chen'));
 const reload=environment(e.storage);reload.view('plans/service/ava');assert(reload.html().includes('30 minutes logged'));assert.equal(reload.run('state.serviceEntries[0].goal'),'goal-ava');
});

test('Session notes retain the provider and role and update cited instructional guidance',()=>{
 const e=environment();e.view('plans/service/ava');const revision=e.run('guidanceUpdate("ava").revision');
 e.submit('service-time-form',{...service,note:'One step at a time helped Ava start independently.'});
 assert.equal(e.run('state.contexts[0].role'),'Occupational therapist');assert.equal(e.run('state.contexts[0].author'),'Maya Chen');assert.equal(e.run('state.contexts[0].serviceId'),e.run('state.serviceEntries[0].id'));assert.equal(e.run('guidanceUpdate("ava").revision'),revision+1);
 e.click('goals-tab',{value:'notes'});assert(e.html().includes('One step at a time helped Ava start independently.'));assert(e.html().includes('Maya Chen'));assert(e.html().includes('notes-summary'));assert(e.html().includes('data-note="'+e.run('state.contexts[0].id')+'"'));
});

test('Service validation rejects invalid minutes, dates, services, providers, and another student’s goal',()=>{
 const e=environment();e.view('plans/service/ava');
 for(const bad of [{minutes:''},{minutes:'0'},{minutes:'2.5'},{minutes:'1441'},{date:'2026-02-30'},{service:'Unknown'},{provider:'  '},{goal:'goal-ben'},{student:'missing'},{note:'a'.repeat(3001)}]){
  e.submit('service-time-form',{...service,...bad});assert.equal(e.run('state.serviceEntries.length'),0);assert.equal(e.run('state.contexts.length'),0);
 }
});

test('Storage failures roll back service time, source notes, and guidance together',()=>{
 const e=environment();e.view('plans/service/ava');const before=e.run('JSON.stringify({entries:state.serviceEntries,notes:state.contexts,guidance:state.guidanceUpdates})');
 e.failStorage(true);e.submit('service-time-form',{...service,note:'Picture cues helped.'});
 assert.equal(e.run('JSON.stringify({entries:state.serviceEntries,notes:state.contexts,guidance:state.guidanceUpdates})'),before);assert(e.node('service-error').innerHTML.includes('Could not save service time'));assert(e.html().includes('id="service-time-form"'));
});

test('Students without goals can start a goal and record service time; invalid routes never select a fallback student',()=>{
 const e=environment();e.submit('student-form',{name:'Zoe Adams',grade:'3'});const id=e.run('students.at(-1).id');e.view('plans/goal/'+id);
 assert(e.html().includes('No goals yet'));assert.equal((e.html().match(/data-action="add-goal"/g)||[]).length,1);assert(!e.html().includes('id="workspace-objective"'));
 e.click('goals-tab',{value:'service'});e.submit('service-time-form',{...service,student:id,goal:''});assert(e.html().includes('30 minutes logged'));
 e.view('plans/notes/unknown');assert(e.html().includes('Select a student'));assert(!e.html().includes('Notes by week'));
});
