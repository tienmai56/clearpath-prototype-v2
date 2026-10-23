const test=require('node:test');
const assert=require('node:assert/strict');
const {environment}=require('./harness.cjs');

test('Student cards open Present levels; exactly two tabs preserve milestone navigation',()=>{
 const e=environment();
 assert.equal((e.html().match(/data-action="open-student-profile"/g)||[]).length,12);
 e.click('open-student-profile',{id:'noah'});
 assert.equal(e.run('location.hash'),'#student/noah');
 assert.equal((e.html().match(/role="tab"/g)||[]).length,2);
 assert(e.html().includes('Present levels'));
 assert(e.html().includes('IEP Goals &amp; Progress'));
 const sections=['present-summary-title','present-academic-title','present-parent-title','present-baseline-title','present-assessments-title'];
 sections.reduce((previous,id)=>{const position=e.html().indexOf('id="'+id+'"');assert(position>previous,id);return position;},-1);
 assert(!e.html().includes('milestone-timeline'));
 e.click('student-tab',{value:'iep'});
 assert.equal(e.run('location.hash'),'#student/noah/iep');
 assert(e.html().includes('milestone-timeline'));
 e.click('select-milestone',{id:'noah',goal:'goal-noah',objective:'goal-noah-o1'});
 assert.equal(e.run('location.hash'),'#student/noah/goal-noah/goal-noah-o1');
 e.click('student-tab',{value:'present'});
 assert(e.html().includes('Measurable baseline'));
 e.click('student-tab',{value:'iep'});
 assert.equal(e.run('activeObjective("noah").id'),'goal-noah-o1');
 e.view('student/ava');
 assert.equal(e.run('studentTab'),'present');
 e.handlers.keydown({target:{dataset:{action:'student-tab'}},key:'ArrowRight',preventDefault(){}});
 assert.equal(e.run('studentTab'),'iep');
 e.handlers.keydown({target:{dataset:{action:'student-tab'}},key:'Home',preventDefault(){}});
 assert.equal(e.run('studentTab'),'present');
});

test('Evidence examples preview the cited source and disclose their TBD destination',()=>{
 const e=environment();e.view('student/noah');const before=e.run('JSON.stringify(state)');
 e.click('present-evidence',{id:'noah',source:'sample-note-noah-0'});
 assert(e.modal().includes('Noah stayed with the task longer'));
 assert(e.modal().includes('Evidence link destination: TBD'));
 assert(e.modal().includes('Example source'));
 e.click('close');
 e.click('present-evidence',{id:'noah',source:'baseline:goal-noah'});
 assert(e.modal().includes('30% independent accuracy'));
 assert(e.modal().includes('Sep 4, 2026'));
 assert.equal(e.run('location.hash'),'#student/noah');
 assert.equal(e.run('JSON.stringify(state)'),before);
});

test('Baseline stays at the starting check and respects a teacher-entered baseline',()=>{
 const e=environment();
 e.run(`state.logs.unshift({id:'latest',student:'noah',goal:'goal-noah',objective:'goal-noah-o3',date:TODAY,score:95});`);
 e.view('student/noah');
 assert(e.html().includes('<strong>30%</strong>'));
 assert(!e.html().includes('<strong>95%</strong>'));
 e.run(`findGoal('noah','goal-noah').baseline='Independently solves 4 of 10 problems on October 1.';persist();render();`);
 assert(e.html().includes('Independently solves 4 of 10 problems on October 1.'));
 assert(!e.html().includes('<strong>30%</strong>'));
 const reload=environment(e.storage);reload.view('student/noah');
 assert(reload.html().includes('Independently solves 4 of 10 problems on October 1.'));
});

test('Suggested assessment previews match the student’s learning area',()=>{
 const e=environment();
 for(const [id,assessment,title] of [['milo','literary','Comprehension Assessment — Literary'],['milo','informational','Comprehension Assessment — Informational'],['ellie','operations','Word Problems — Choose the Operation'],['isla','sentence','Written Expression — Sentence Writing']]){
  e.view('student/'+id);assert(e.html().includes(title));
  e.click('baseline-assessment',{id,assessment});
  assert(e.modal().includes('Example assessment · Preview'));
  assert(e.modal().includes('What to record'));
  assert(e.modal().includes(title));e.click('close');
  assert.equal(e.run('studentTab'),'present');
 }
});

test('Added students get empty states and their saved parent input, never another student’s examples',()=>{
 const e=environment();e.submit('student-form',{name:'Alex Morgan',grade:'4'});
 const id=e.run('students[students.length-1].id');
 assert.equal(e.run('location.hash'),'#student/'+id);
 assert(e.html().includes('No present levels assessment yet'));
 assert(e.html().includes('Upload from laptop'));
 assert(!e.html().includes('Example starting point'));
 assert(!e.html().includes('Amir'));
 e.click('present-parent-note',{id});assert.equal(e.node('context-role').value,'Parent');
 e.submit('context-form',{student:id,author:'Alex’s parent',role:'Parent',dateISO:'2026-10-09',text:'Alex enjoys <art> and drawing at home.'});e.view('plans/notes/'+id);
 assert(e.html().includes('Alex enjoys &lt;art&gt; and drawing at home.'));
 const reload=environment(e.storage);reload.view('plans/notes/'+id);
 assert(reload.html().includes('Alex enjoys &lt;art&gt; and drawing at home.'));
 reload.view('student/ava');assert(!reload.html().includes('Alex enjoys'));
});
