import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {handleStudentIntake} from '../lib/student-intake.ts';
import {handlePhotoTransfer} from '../lib/photo-transfer.ts';
const {environment}=createRequire(import.meta.url)('./harness.cjs');
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys = ON');
for(const name of readdirSync(new URL('../drizzle',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
let failDraftSave=false;
const objects=new Map(),DB={prepare(query){if(failDraftSave&&query.startsWith('UPDATE student_intakes SET drafts'))throw Error('Save unavailable');const prepared=sql.prepare(query);return {args:[],bind(...args){this.args=args;return this},async run(){return {meta:{changes:prepared.run(...this.args).changes}}},async first(){return prepared.get(...this.args)||null},async all(){return {results:prepared.all(...this.args)}}};}};
const BUCKET={async put(key,bytes){objects.set(key,bytes)},async get(key){return objects.has(key)?{body:objects.get(key)}:null},async delete(keys){for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key)}};
const env={DB,BUCKET},origin='https://clearpath.example';
async function request(url,options={},owner='teacher-a'){
 const req=new Request(origin+url,{...options,headers:{origin,'oai-authenticated-user-id':owner,...options.headers}});
 return url.startsWith('/api/transfers')?handlePhotoTransfer(req,env):handleStudentIntake(req,env);
}
const pdf=new TextEncoder().encode('%PDF-1.7\nA sample report.\n%%EOF');
const video=new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0,109,112,52,50]);
const docx=new TextEncoder().encode('PK\x03\x04 mock-package word/document.xml');
const upload=(id,name,body,owner='teacher-a')=>request('/api/intakes/'+id+'/files?name='+encodeURIComponent(name),{method:'POST',body},owner);
const snapshot=async(id,owner='teacher-a')=>(await request('/api/intakes/'+id,{},owner)).json();
function app(){const e=environment();e.ctx.fetch=(url,options)=>request(url,options);return e;}
const settle=()=>new Promise(setImmediate);
let checks=0;async function check(name,fn){await fn();checks++;console.log('PASS '+name);}

await check('Laptop uploads validate files and remain isolated by account and student',async()=>{
 assert.equal((await request('/api/intakes/amir',{},'')).status,401);
 assert.equal((await upload('amir','report.pdf',pdf)).status,201);
 const a=await snapshot('amir');assert.equal(a.files.length,1);assert.equal(a.files[0].source,'laptop');
 assert.equal((await snapshot('ava')).files.length,0);assert.equal((await snapshot('amir','teacher-b')).files.length,0);
 assert.equal((await request('/api/intakes/amir/files/'+a.files[0].id,{},'teacher-b')).status,404);
 assert.equal((await request('/api/intakes/amir/files/'+a.files[0].id,{method:'DELETE'},'teacher-b')).status,404);
 assert.deepEqual(new Uint8Array(await (await request('/api/intakes/amir/files/'+a.files[0].id)).arrayBuffer()),pdf);
 assert.equal((await upload('amir','not-a-pdf.pdf',new TextEncoder().encode('<script>alert(1)</script>'))).status,415);
 assert.equal((await upload('amir','script.html',pdf)).status,415);
 assert.equal((await request('/api/intakes/amir/files?name=large.mov',{method:'POST',headers:{'Content-Length':String(26*1024*1024)},body:video})).status,413);
 assert.equal((await request('/api/intakes/amir/files?name=report.pdf',{method:'POST',body:pdf,headers:{origin:'https://other.example'}})).status,403);
});

await check('Phone document and video uploads appear on desktop and survive confirmation, closing, and reload',async()=>{
 const e=app();e.view('student/amir');await settle();await e.run('startIntakePhone("amir")');const t=e.run('intakeSession("amir").transfer');
 assert(t.qr.includes('<svg'));assert(e.html().includes('Scan with your phone'));
 for(const [name,bytes] of [['evaluation.docx',docx],['classroom.mov',video]]){
  const result=await request('/api/transfers/'+t.id+'/photos?name='+name,{method:'POST',headers:{'x-upload-key':t.key},body:bytes});assert.equal(result.status,201);
 }
 const before=await (await request('/api/transfers/'+t.id,{headers:{'x-upload-key':t.key}})).json();assert.equal(before.purpose,'present-levels');assert(before.files.every(f=>!f.delivered));
 await e.run('pollIntakePhone("amir",intakeSession("amir").transfer)');
 assert(e.html().includes('evaluation.docx'));assert(e.html().includes('classroom.mov'));assert(e.html().includes('2 files received from your phone'));
 const after=await (await request('/api/transfers/'+t.id,{headers:{'x-upload-key':t.key}})).json();assert(after.files.every(f=>f.delivered));
 const uploaded=(await snapshot('amir')).files;assert.equal(uploaded.length,3);assert.equal(uploaded.filter(f=>f.source==='phone').length,2);
 e.click('intake-phone-close',{id:'amir'});await settle();assert.equal((await snapshot('amir')).files.length,3);
 const movie=uploaded.find(f=>f.name==='classroom.mov');const download=await request('/api/intakes/amir/files/'+movie.id);assert.equal(download.headers.get('Content-Type'),'video/quicktime');assert.deepEqual(new Uint8Array(await download.arrayBuffer()),video);
 const reload=app();reload.view('student/amir');await settle();assert(reload.html().includes('classroom.mov'));assert(reload.html().includes('No present levels assessment yet'));
});

await check('Every class profile starts empty and analysis leads to independent output choices',async()=>{
 const e=app(),ids=JSON.parse(e.run('JSON.stringify(students.map(s=>s.id))'));assert.equal(ids.length,12);for(const id of ids){e.view('student/'+id);await settle();assert(e.html().includes('No present levels assessment yet'));assert(!e.html().includes('Example present levels'));assert.equal((e.html().match(/role="tab"/g)||[]).length,2);}
 e.view('student/amir');await settle();e.click('intake-analyze',{id:'amir'});assert(e.html().includes('Analyzing student information'));assert(e.html().includes('Analysis is simulated'));
 for(let i=0;i<3;i++)e.run('advanceIntakeAnalysis("amir",intakeSession("amir").analysisToken)');
 assert(e.html().includes('What would you like to draft?'));
 e.change({dataset:{intakeChoice:'goal',student:'amir'},checked:false});e.click('intake-create',{id:'amir'});
 assert(e.html().includes('data-intake-field="presentLevels.summary"'));assert(!e.html().includes('data-intake-field="goal.title"'));
 const before=e.run('goalPlansFor("amir").length');
 e.run('handleIntakeInput({dataset:{intakeField:"presentLevels.summary",student:"amir"},value:"Teacher-edited summary, supported by the report."})');
 await e.run('saveIntakeDrafts("amir")');assert.equal(e.run('intakeSession("amir").dirty'),false);assert.equal(e.run('goalPlansFor("amir").length'),before);
 const data=await snapshot('amir');assert.equal(data.drafts.presentLevels.summary,'Teacher-edited summary, supported by the report.');assert.equal(data.drafts.goal,undefined);
 assert.equal(e.run('intakeSession("amir").stage'),'saved');assert(e.html().includes('Saved draft'));assert(e.html().includes('Teacher-edited summary'));assert(!e.html().includes('data-intake-field='));assert(!e.html().includes('intake-steps'));
 assert(e.html().includes('present-academic-item'));assert(e.html().includes('present-parent-quote'));assert(e.html().includes('present-baseline'));assert(e.html().includes('baseline-assessment-list'));
 e.click('baseline-assessment',{id:'amir',assessment:'operations'});assert(e.modal().includes('Choose the Operation'));e.click('close');
 const reload=app();reload.view('student/amir');await settle();assert(reload.html().includes('Teacher-edited summary'));assert(reload.html().includes('Edit draft'));
});

await check('Selecting both outputs saves editable present levels and draft objectives without duplicating goals',async()=>{
 const e=app();e.view('student/amir');await settle();e.click('intake-edit',{id:'amir'});e.click('intake-choices',{id:'amir'});
 e.change({dataset:{intakeChoice:'goal',student:'amir'},checked:true});e.click('intake-create',{id:'amir'});
 assert(e.html().includes('data-intake-field="presentLevels.summary"'));assert(e.html().includes('data-intake-field="goal.title"'));
 e.run('handleIntakeInput({dataset:{intakeField:"goal.title",student:"amir"},value:"Choose and solve word problems"})');
 e.run('handleIntakeInput({dataset:{intakeField:"goal.objectives.0.skill",student:"amir"},value:"Choose the operation for a one-step problem"})');await e.run('saveIntakeDrafts("amir")');
 const data=await snapshot('amir');assert.equal(data.drafts.goal.title,'Choose and solve word problems');assert(data.drafts.goal.objectives.every(o=>o.status==='draft'));assert.equal(e.run('goalPlansFor("amir").length'),2);
 assert.equal(data.drafts.goal.objectives[0].skill,'Choose the operation for a one-step problem');assert.equal(e.run('intakeSession("amir").stage'),'saved');
 e.click('intake-edit',{id:'amir'});assert(e.html().includes('Objective 1:</label>'));assert(e.html().includes('Choose the operation for a one-step problem</textarea>'));
 e.run('handleIntakeInput({dataset:{intakeField:"goal.objectives.0.target",student:"amir"},value:"85"})');await e.run('saveIntakeDrafts("amir")');assert.equal(e.run('goalPlansFor("amir").length'),2);assert.equal((await snapshot('amir')).drafts.goal.objectives[0].target,85);
 e.click('intake-edit',{id:'amir'});e.click('intake-cancel',{id:'amir'});assert.equal(e.run('intakeSession("amir").stage'),'saved');
 const reload=app();reload.view('student/amir/iep');await settle();assert(reload.html().includes('Choose and solve word problems'));assert(reload.html().includes('Needs approval'));
});

await check('Goals-only output leaves present levels empty, and failed saves retain the edited draft',async()=>{
 await upload('ava','assessment.pdf',pdf);const e=app();e.view('student/ava');await settle();e.run('intakeSession("ava").stage="select";intakeSession("ava").selected.presentLevels=false;createIntakeDrafts("ava")');
 assert(!e.html().includes('data-intake-field="presentLevels.summary"'));assert(e.html().includes('data-intake-field="goal.title"'));
 await e.run('saveIntakeDrafts("ava")');assert.equal((await snapshot('ava')).drafts.presentLevels,undefined);assert(e.html().includes('No present levels assessment yet'));assert(e.html().includes('IEP draft saved'));
 e.run('intakeSession("ava").stage="drafts";handleIntakeInput({dataset:{intakeField:"goal.title",student:"ava"},value:"Retain this edit"})');
 failDraftSave=true;await e.run('saveIntakeDrafts("ava")');failDraftSave=false;
 assert.equal(e.run('intakeSession("ava").stage'),'drafts');assert.equal(e.run('intakeSession("ava").dirty'),true);assert.equal(e.run('intakeSession("ava").draft.goal.title'),'Retain this edit');assert.notEqual((await snapshot('ava')).drafts.goal.title,'Retain this edit');assert(e.html().includes('Could not save these materials'));
});

await check('Invalid drafts and concurrent file limits do not create phantom records',async()=>{
 assert.equal((await request('/api/intakes/ava/drafts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({presentLevels:{summary:''}})})).status,400);
 const pending=Array.from({length:11},(_,i)=>upload('ben','report-'+i+'.pdf',pdf));const results=await Promise.all(pending);assert.equal(results.filter(r=>r.status===201).length,10);assert.equal(results.filter(r=>r.status===409).length,1);assert.equal((await snapshot('ben')).files.length,10);
 const file=(await snapshot('ben')).files[0];assert.equal((await request('/api/intakes/ben/files/'+file.id,{method:'DELETE'})).status,200);assert.equal((await snapshot('ben')).files.length,9);
});
console.log(checks+' student intake, document/video transfer, draft, and persistence checks passed.');
