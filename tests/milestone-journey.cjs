const test=require('node:test');
const assert=require('node:assert/strict');
const {environment}=require('./harness.cjs');
const target={id:'amir',goal:'goal-amir',objective:'goal-amir-o3'};
function withPresentLevels(e){e.run("(()=>{const p=intakeSession('amir');p.loaded=true;p.savedDrafts.presentLevels={summary:'Saved present levels'};})()");return e;}

test('Progress shows one focused panel without the goals and stepping-stones column',()=>{
 const e=withPresentLevels(environment());e.view('student/amir/progress');assert(!e.html().includes('milestone-navigation'));assert(!e.html().includes('Goals &amp; stepping stones'));
 e.click('select-milestone',target);assert.equal((e.html().match(/id="milestone-detail"/g)||[]).length,1);assert(e.html().includes('What’s helping'));assert(e.html().includes('Still difficult'));assert(e.html().includes('Data collected'));assert.equal((e.html().match(/class="milestone-data-row"/g)||[]).length,3);assert(e.html().indexOf('What we’re learning')<e.html().indexOf('class="chart"'));assert(!e.html().includes('milestone-kicker'));assert(!e.html().includes('Current focus'));assert(!e.html().includes('Observation ·'));assert(!e.html().includes('Teaching record'));
 assert(!e.html().includes('Assignment history'));assert(!e.html().includes('id="progress-objective"'));
 e.click('select-milestone',{...target,objective:'goal-amir-o1'});assert.equal(e.run('activeObjective("amir").id'),'goal-amir-o1');assert(e.html().includes('No checks yet'));
 assert.equal(e.run('milestoneEvidence(getStudent("amir"),findGoal("amir","goal-amir").objectives[0]).length'),0);
 assert(!e.html().includes('A worked example helped'));
 e.view('student/amir/goal-amir/goal-amir-o3');assert.equal(e.run('activeObjective("amir").id'),'goal-amir-o3');
 e.click('select-milestone',{...target,objective:'goal-amir-o2'});assert.equal(e.run('activeObjective("amir").id'),'goal-amir-o2');
});

test('Guidance remains available from the selected milestone',()=>{
 const e=withPresentLevels(environment());e.view('student/amir/progress');e.click('milestone-guidance',target);assert(e.modal().includes('Model the first problem-solving step'));
 e.click('guidance-to-milestone',target);assert.equal(e.run('location.hash'),'#student/amir/goal-amir/goal-amir-o3');assert.equal(e.run('activeObjective("amir").id'),'goal-amir-o3');
});

test('A recorded strategy updates only its milestone and student, with dates in evidence order',async()=>{
 const e=withPresentLevels(environment());e.view('student/amir/progress');e.click('record-milestone',{...target,objective:'goal-amir-o1'});
 e.change({name:'evidence-method',value:'manual'});e.click('progress-next');assert(e.modal().includes('What did you try?'));
 await e.submit('log-form',{student:'amir',goal:'goal-amir',objective:'goal-amir-o1',comparison:'',date:'2026-10-09',correct:'4',attempts:'5',support:'independent',strategy:'Worked example',note:'Chose the operation without a cue.',phase:'followup'});
 assert.equal(e.run('state.logs[0].strategy'),'Worked example');
 e.run(`state.logs.unshift({id:'backdated',student:'amir',goal:'goal-amir',objective:'goal-amir-o1',date:'2026-10-02',score:40,strategy:'Worked example',support:'No extra help'})`);
 assert.equal(e.run('scoreForObjective(getStudent("amir"),findGoal("amir","goal-amir").objectives[0])'),80);
 assert.equal(e.run('strategyResults(getStudent("amir"),findGoal("amir","goal-amir").objectives[0])[0].status'),'helping');
 assert.equal(e.run('milestoneEvidence(getStudent("amir"),findGoal("amir","goal-amir").objectives[2]).length'),6);
 assert.equal(e.run('objectiveLogs("ben","goal-ben-o1").length'),0);
 e.click('select-milestone',{...target,objective:'goal-amir-o1'});assert(e.html().includes('40% → 80% across 2 checks'));assert(e.run('state.logs.some(log=>log.note==="Chose the operation without a cue.")'));assert(!e.html().includes('Observation ·'));
});

test('Trying guidance counts only linked checks and surfaces the review within the milestone',async()=>{
 const e=withPresentLevels(environment());e.click('milestone-guidance',target);e.click('plan-milestone-guidance',target);
 const plan=e.run('state.interventions[0]');assert.equal(plan.objective,target.objective);assert(e.modal().includes('Record 3 more checks'));
 for(let i=0;i<3;i++){
  e.click('record-milestone',target);assert.equal(e.run('progressCapture.values.strategy'),plan.title);
  e.change({name:'evidence-method',value:'manual'});e.click('progress-next');
  await e.submit('log-form',{student:'amir',goal:'goal-amir',objective:'goal-amir-o3',comparison:'',date:'2026-10-09',correct:String(3+i%2),attempts:'5',support:'independent',strategy:plan.title,intervention:plan.id,note:'',phase:'followup'});
 }
 assert.equal(e.run('guidanceForMilestone(getStudent("amir"),focusGoal(getStudent("amir")),focusMilestone(getStudent("amir"),focusGoal(getStudent("amir")))).remaining'),0);
 e.click('milestone-guidance',target);assert(e.modal().includes('Review: Model the first problem-solving step'));
 e.click('milestone-guidance',target);assert(e.modal().includes('60% → 80% → 60%'));e.click('review-intervention',{...target,intervention:plan.id});assert(e.run('state.interventions[0].reviewedAt'));
 const reload=environment(e.storage);assert(reload.run('state.interventions[0].reviewedAt'));assert.equal(reload.run('state.logs.length'),3);
});

test('Milestones require enough successful checks before completion; completion persists',()=>{
 const e=withPresentLevels(environment());e.click('complete-milestone',target);assert(!e.run('findGoal("amir","goal-amir").objectives[2].completedAt'));
 e.run(`for(let i=0;i<3;i++)state.logs.unshift({id:'mastery-'+i,student:'amir',goal:'goal-amir',objective:'goal-amir-o1',date:TODAY,score:100})`);
 e.click('complete-milestone',{...target,objective:'goal-amir-o1'});assert(e.run('findGoal("amir","goal-amir").objectives[0].completedAt'));
 assert.equal(e.run('focusMilestone(getStudent("amir"),findGoal("amir","goal-amir")).id'),'goal-amir-o2');
 const reload=environment(e.storage);assert(reload.run('findGoal("amir","goal-amir").objectives[0].completedAt'));
 e.click('reopen-milestone',{...target,objective:'goal-amir-o1'});assert(!e.run('findGoal("amir","goal-amir").objectives[0].completedAt'));
});

test('Drafts and storage failures do not create phantom evidence or changes',async()=>{
 const e=withPresentLevels(environment());e.run('findGoal("amir","goal-amir").objectives[0].status="draft"');e.click('record-milestone',{...target,objective:'goal-amir-o1'});assert.equal(e.run('progressCapture'),null);
 e.failStorage(true);e.click('plan-milestone-guidance',target);assert.equal(e.run('state.interventions.length'),0);
 e.click('focus-milestone',{...target,objective:'goal-amir-o2'});assert.equal(e.run('findGoal("amir","goal-amir").currentObjectiveId'),undefined);
 e.failStorage(false);e.click('record-milestone',target);e.change({name:'evidence-method',value:'manual'});e.click('progress-next');e.failStorage(true);
 await e.submit('log-form',{student:'amir',goal:'goal-amir',objective:'goal-amir-o3',comparison:'',date:'2026-10-09',correct:'4',attempts:'5',support:'independent',strategy:'New approach',note:''});assert.equal(e.run('state.logs.length'),0);
});

test('New student notes affect milestone guidance, while milestone-specific notes stay scoped',()=>{
 const e=withPresentLevels(environment());e.submit('context-form',{student:'amir',author:'Teacher',role:'General education teacher',dateISO:'2026-10-09',text:'Too many visual cues were distracting. One picture was easier.'});
 e.click('milestone-guidance',target);assert(e.modal().includes('Reduce visual clutter'));
 e.click('milestone-note',{...target,objective:'goal-amir-o1'});assert(e.modal().includes('name="objective" value="goal-amir-o1"'));
 e.submit('context-form',{student:'amir',goal:'goal-amir',objective:'goal-amir-o1',author:'Teacher',role:'General education teacher',dateISO:'2026-10-09',text:'An operation chart helped choose addition.'});
 assert(e.run('milestoneObservations(getStudent("amir"),findGoal("amir","goal-amir"),findGoal("amir","goal-amir").objectives[0]).some(n=>n.text.includes("operation chart"))'));
 assert(!e.run('milestoneObservations(getStudent("amir"),findGoal("amir","goal-amir"),findGoal("amir","goal-amir").objectives[2]).some(n=>n.text.includes("operation chart"))'));
});

test('Lesson variants are gone from every entry point; previous evidence remains stored',()=>{
 const e=withPresentLevels(environment());e.view('studio');assert(!/lesson variants|Teaching plans|two versions/i.test(e.html()));assert(e.html().includes('Adapt a class lesson'));assert(e.html().includes('Create from scratch'));
 e.view('studio/variants');assert.equal(e.run('location.hash'),'#studio');e.view('comparison/sample');assert.equal(e.run('location.hash'),'#studio');
 e.click('new-variants');assert.equal(e.run('location.hash'),'#studio');e.submit('comparison-form',{start:'2026-10-09',review:'2026-10-23',frequency:'3'});assert.equal(e.run('state.comparisons.length'),0);
 e.run(`state.comparisons.push({id:'legacy',title:'Past instruction',groups:{a:[],b:['amir']},objectiveIds:{amir:'goal-amir-o3'},lesson:{b:'Visual boxes'}});state.logs.unshift({id:'legacy-log',student:'amir',goal:'goal-amir',objective:'goal-amir-o3',comparison:'legacy',date:TODAY,score:80,note:'Worked independently.'});state.drafts.push({id:'old-draft',title:'Old variants',studentIds:['amir']});persist()`);
 e.view('student/amir/progress');assert.equal(e.run('legacyStrategy(state.logs.find(log=>log.id==="legacy-log"),getStudent("amir"))'),'Visual boxes');assert(!e.html().includes('Old variants'));e.click('student-tab',{value:'goals'});assert(!/Teaching plans|Lesson variant drafts|open-draft/.test(e.html()));
 const reload=environment(e.storage);assert.equal(reload.run('state.comparisons.length'),1);assert.equal(reload.run('state.logs.length'),1);
});
