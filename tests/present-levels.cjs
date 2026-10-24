const test=require('node:test');
const assert=require('node:assert/strict');
const {environment}=require('./harness.cjs');

function studentIds(e){return JSON.parse(e.run('JSON.stringify(students.map(s=>s.id))'));}
function showSavedPresentLevels(e,id){
 e.view('student/'+id);
 e.run(`(()=>{const p=intakeSession(${JSON.stringify(id)});p.loaded=true;p.loading=false;p.stage='saved';p.savedDrafts.presentLevels={summary:'Saved summary',strengths:'Saved strengths',needs:'Saved needs',parent:'Saved parent input',baseline:'Saved measurable baseline'};render();})()`);
}

test('Every student card opens an empty Present levels workspace',()=>{
 const e=environment(),ids=studentIds(e);
 assert.equal(ids.length,12);
 assert.equal((e.html().match(/data-action="open-student-profile"/g)||[]).length,ids.length);
 for(const id of ids){
  e.view('student/'+id);
  assert.equal((e.html().match(/role="tab"/g)||[]).length,3);
  assert(e.html().includes('Present levels'));
  assert(e.html().includes('IEP goals'));
  assert(e.html().includes('Progress & Data collection'));
  assert(e.html().includes('No present levels assessment yet'));
  assert(e.html().includes('Upload from laptop'));
  assert(!e.html().includes('Add at least one file to continue'));
  assert(!e.html().includes('Example present levels'));
  assert(!e.html().includes('present-summary-title'));
 }
});

test('Empty present levels leave IEP goals and Progress blank',()=>{
 const e=environment();
 e.click('open-student-profile',{id:'noah'});
 assert.equal(e.run('location.hash'),'#student/noah');
 assert(e.html().includes('No present levels assessment yet'));
 assert(!e.html().includes('milestone-timeline'));
 e.click('student-tab',{value:'goals'});
 assert.equal(e.run('location.hash'),'#student/noah/iep');
 assert(!e.html().includes('student-supporting-sections'));
 assert(!e.html().includes('milestone-timeline'));
 e.click('student-tab',{value:'progress'});
 assert.equal(e.run('location.hash'),'#student/noah/progress');
 assert(!e.html().includes('student-supporting-sections'));
 assert(!e.html().includes('milestone-timeline'));
 showSavedPresentLevels(e,'noah');
 e.click('student-tab',{value:'progress'});
 assert(e.html().includes('milestone-detail'));
 e.click('select-milestone',{id:'noah',goal:'goal-noah',objective:'goal-noah-o1'});
 assert.equal(e.run('location.hash'),'#student/noah/goal-noah/goal-noah-o1');
 e.click('student-tab',{value:'present'});
 assert(e.html().includes('Saved summary'));
 e.click('student-tab',{value:'progress'});
 assert.equal(e.run('activeObjective("noah").id'),'goal-noah-o1');
 e.handlers.keydown({target:{dataset:{action:'student-tab'}},key:'Home',preventDefault(){}});
 assert.equal(e.run('studentTab'),'present');
 e.handlers.keydown({target:{dataset:{action:'student-tab'}},key:'End',preventDefault(){}});
 assert.equal(e.run('studentTab'),'progress');
});

test('Seeded notes, progress, and goal baselines do not prefill present levels',()=>{
 const e=environment();
 e.run(`state.logs.unshift({id:'latest',student:'noah',goal:'goal-noah',objective:'goal-noah-o3',date:TODAY,score:95});findGoal('noah','goal-noah').baseline='Independently solves 4 of 10 problems.';persist();`);
 e.view('student/noah');
 assert(e.html().includes('No present levels assessment yet'));
 assert(!e.html().includes('Independently solves 4 of 10 problems.'));
 assert(!e.html().includes('95%'));
 assert(!e.html().includes('Example source'));
 showSavedPresentLevels(e,'noah');
 e.click('student-tab',{value:'goals'});
 assert(e.html().includes('Create IEP goals'));
 assert(e.html().includes('based on Noah’s saved present levels'));
 assert(!e.html().includes('Saved measurable baseline'));
 assert(!e.html().includes('Independently solves 4 of 10 problems.'));
 assert(!e.html().includes('milestone-timeline'));
 e.click('student-tab',{value:'progress'});
 assert(e.html().includes('milestone-detail'));
 assert(!e.html().includes('IEP goal details'));
});

test('A saved present-level draft reveals matching baseline assessment previews',()=>{
 const e=environment();
 for(const [id,assessment,title] of [['milo','literary','Comprehension Assessment — Literary'],['ellie','operations','Word Problems — Choose the Operation'],['isla','sentence','Written Expression — Sentence Writing']]){
  showSavedPresentLevels(e,id);
  assert(e.html().includes('Saved summary'));
  assert(e.html().includes(title));
  e.click('baseline-assessment',{id,assessment});
  assert(e.modal().includes('Example assessment · Preview'));
  assert(e.modal().includes('What to record'));
  assert(e.modal().includes(title));
  e.click('close');
 }
});

test('Newly added students also start with empty present levels after reload',()=>{
 const e=environment();e.submit('student-form',{name:'Alex Morgan',grade:'4'});
 const id=e.run('students[students.length-1].id');
 assert.equal(e.run('location.hash'),'#student/'+id);
 assert(e.html().includes('No present levels assessment yet'));
 assert(e.html().includes('Upload from laptop'));
 assert(!e.html().includes('Example present levels'));
 const reload=environment(e.storage);reload.view('student/'+id);
 assert(reload.html().includes('No present levels assessment yet'));
 assert(!reload.html().includes('Example present levels'));
});
