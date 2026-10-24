const test=require('node:test');
const assert=require('node:assert/strict');
const {environment}=require('./harness.cjs');

function seedBatch(env,{count=7,kind='lesson',batchId='lesson-batch'}={}){
 env.run(`state.assignments=students.slice(0,${count}).map((student,index)=>({
  id:'${batchId}-'+index,
  batchId:'${batchId}',
  kind:'${kind}',
  title:'Lesson '+(index+1),
  studentIds:[student.id],
  model:{workflow:'scratch'},
  status:'draft'
 }))`);
 env.view('assignments/'+batchId);
}

test('lesson overview paginates batches larger than five lessons',()=>{
 const env=environment();
 seedBatch(env);
 assert.match(env.html(),/7 personalized lessons ready to review/);
 assert.match(env.html(),/Showing 1–5 of 7 lessons/);
 assert.equal((env.html().match(/data-action="open-assignment"/g)||[]).length,5);
 assert.match(env.html(),/aria-current="page"[^>]*>1<\/button>/);

 env.click('lesson-overview-page',{id:'lesson-batch',page:'2'});
 assert.match(env.html(),/Showing 6–7 of 7 lessons/);
 assert.equal((env.html().match(/data-action="open-assignment"/g)||[]).length,2);
 assert.match(env.html(),/aria-current="page"[^>]*>2<\/button>/);
});

test('lesson overview does not show pagination for five lessons',()=>{
 const env=environment();
 seedBatch(env,{count:5,batchId:'five-lessons'});
 assert.doesNotMatch(env.html(),/aria-label="Lesson pages"/);
 assert.equal((env.html().match(/data-action="open-assignment"/g)||[]).length,5);
});

test('non-lesson overviews keep all rows on one page',()=>{
 const env=environment();
 seedBatch(env,{count:7,kind:'assignment',batchId:'assignment-batch'});
 assert.doesNotMatch(env.html(),/aria-label="Lesson pages"/);
 assert.equal((env.html().match(/data-action="open-assignment"/g)||[]).length,7);
});
