import {IntakeError,intakeHeaders,readLimitedBody,readIntakeFile,ensureIntake,intakeSnapshot,INTAKE_FILE_COUNT} from './intake-storage.ts';
import type {IntakeBindings,IntakeRow} from './intake-storage.ts';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:intakeHeaders});
function text(value:unknown,max:number,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())throw new IntakeError(400,'Complete the draft fields before saving.');return value.trim();}
function validateDrafts(input:any){
 if(!input||typeof input!=='object')throw new IntakeError(400,'Choose a draft to save.');
 const out:Record<string,unknown>={};const now=new Date().toISOString();
 if(input.presentLevels){const p=input.presentLevels;out.presentLevels={summary:text(p.summary,6000,true),strengths:text(p.strengths,6000),needs:text(p.needs,6000),parent:text(p.parent,6000),baseline:text(p.baseline,6000),updatedAt:now,status:'draft'};}
 if(input.goal){
  const g=input.goal;if(!['reading','math','writing'].includes(g.domain)||!Array.isArray(g.objectives)||!g.objectives.length||g.objectives.length>10)throw new IntakeError(400,'Add a goal area and at least one objective.');
  const deadline=text(g.deadline,10,true);if(!/^\d{4}-\d{2}-\d{2}$/.test(deadline)||!Number.isFinite(Date.parse(deadline)))throw new IntakeError(400,'Choose a valid goal deadline.');
  const id=typeof g.id==='string'&&/^intake-goal-[a-z0-9-]+$/.test(g.id)?g.id:'intake-goal-'+crypto.randomUUID();
  const objectives=g.objectives.map((o:any,i:number)=>{const target=Number(o.target),checks=Number(o.checks),date=text(o.deadline,10,true);if(!Number.isFinite(target)||target<1||target>100||!Number.isInteger(checks)||checks<1||checks>10||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||date>deadline)throw new IntakeError(400,'Check each objective’s target, successful checks, and date within the goal deadline.');return {id:id+'-o'+(i+1),skill:text(o.skill,1200,true),condition:text(o.condition,500,true),target,checks,deadline:date,status:'draft',sample:false};});
  out.goal={id,title:text(g.title,160,true),content:text(g.content,2000,true),domain:g.domain,baseline:text(g.baseline||'',1200),standard:'',deadline,objectives,status:'active',achievedAt:null,updatedAt:now,measurement:{method:'Teacher-reviewed skill check',frequency:'2',review:objectives[0].deadline},source:'intake-draft'};
 }
 if(!Object.keys(out).length)throw new IntakeError(400,'Choose a draft to save.');return out;
}
export async function handleStudentIntake(request:Request,env:IntakeBindings):Promise<Response>{
 try{
  const owner=request.headers.get('oai-authenticated-user-id');if(!owner)throw new IntakeError(401,'Sign in to save this student’s materials.');
  if(!['GET','POST','DELETE'].includes(request.method))return json({error:'Method not allowed.'},405);
  if(request.method!=='GET'&&request.headers.get('origin')!==new URL(request.url).origin)throw new IntakeError(403,'Open this upload from Clearpath.');
  const parts=new URL(request.url).pathname.replace(/^\/api\/intakes\/?/,'').split('/').filter(Boolean),student=parts[0];
  if(!student||!/^[a-z0-9][a-z0-9-]{0,100}$/.test(student))throw new IntakeError(404,'Student not found.');
  let row=await env.DB.prepare('SELECT * FROM student_intakes WHERE owner = ? AND student = ?').bind(owner,student).first<IntakeRow>();
  if(parts.length===1&&request.method==='GET')return json(row?await intakeSnapshot(env,row):{student,files:[],drafts:{}});
  if(parts[1]==='files'&&parts.length===2&&request.method==='POST'){
   row ||= await ensureIntake(env,owner,student);
   const file=await readIntakeFile(request),id=crypto.randomUUID(),key='student-intake/'+row.id+'/'+id,created=Date.now();
   await env.BUCKET.put(key,file.bytes,{httpMetadata:{contentType:file.type}});
   try{const inserted=await env.DB.prepare('INSERT INTO intake_files (id,intake,name,type,size,object_key,source,created) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM intake_files WHERE intake = ?) < ?').bind(id,row.id,file.name,file.type,file.bytes.length,key,'laptop',created,row.id,INTAKE_FILE_COUNT).run();if(!inserted.meta.changes)throw new IntakeError(409,'Up to 10 source files can be attached. Remove one before adding another.');}catch(error){await env.BUCKET.delete(key);throw error;}
   return json({id,name:file.name,type:file.type,size:file.bytes.length,source:'laptop',created},201);
  }
  if(!row)throw new IntakeError(404,'This student has no uploaded materials yet.');
  if(parts[1]==='files'&&parts.length===3){
   const file=await env.DB.prepare('SELECT * FROM intake_files WHERE id = ? AND intake = ?').bind(parts[2],row.id).first<{id:string;name:string;type:string;size:number;object_key:string}>();if(!file)throw new IntakeError(404,'File not found.');
   if(request.method==='GET'){const object=await env.BUCKET.get(file.object_key);if(!object)throw new IntakeError(404,'This file is unavailable.');return new Response(object.body,{headers:{...intakeHeaders,'Content-Type':file.type,'Content-Length':String(file.size),'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`}});}
   if(request.method==='DELETE'){await env.BUCKET.delete(file.object_key);await env.DB.prepare('DELETE FROM intake_files WHERE id = ? AND intake = ?').bind(file.id,row.id).run();return json({removed:true});}
  }
  if(parts[1]==='drafts'&&parts.length===2&&request.method==='POST'){
   let input;try{input=JSON.parse(new TextDecoder().decode(await readLimitedBody(request,70000)));}catch(error){if(error instanceof IntakeError)throw error;throw new IntakeError(400,'Could not read the draft.');}
   const count=await env.DB.prepare('SELECT count(*) AS count FROM intake_files WHERE intake = ?').bind(row.id).first<{count:number}>();if(!count?.count)throw new IntakeError(400,'Upload at least one source file before saving a draft.');
   const update=validateDrafts(input),drafts={...JSON.parse(row.drafts),...update},updated=Date.now();
   await env.DB.prepare('UPDATE student_intakes SET drafts = ?, updated = ? WHERE id = ? AND owner = ?').bind(JSON.stringify(drafts),updated,row.id,owner).run();
   return json(await intakeSnapshot(env,{...row,drafts:JSON.stringify(drafts),updated}));
  }
  throw new IntakeError(404,'Action not found.');
 }catch(error){if(error instanceof IntakeError)return json({error:error.message},error.status);console.error('Student intake operation failed');return json({error:'Could not save these materials. Please try again.'},500);}
}
