import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {environment}=require('./harness.cjs');
import {handlePhotoTransfer} from '../lib/photo-transfer.ts';
const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys = ON');for(const name of readdirSync(new URL('../drizzle',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
const objects=new Map();
const DB={prepare(query){
 const prepared=sql.prepare(query);
 return {args:[],bind(...args){this.args=args;return this},
  async run(){const r=prepared.run(...this.args);return {meta:{changes:r.changes}}},
  async first(){return prepared.get(...this.args)||null},
  async all(){return {results:prepared.all(...this.args)}}
 };
}};
const BUCKET={async put(k,v){objects.set(k,v)},async get(k){const b=objects.get(k);return b?{body:b}:null},async delete(keys){for(const k of Array.isArray(keys)?keys:[keys])objects.delete(k)}};
const env={DB,BUCKET};const origin='https://clearpath.example';
async function req(path='',method='GET',body,options={}){const headers={origin,'oai-authenticated-user-id':options.owner??'teacher-a',...options.headers};if(options.key)headers['x-upload-key']=options.key;if(body&&typeof body==='object'&&!(body instanceof Uint8Array)){headers['Content-Type']='application/json';body=JSON.stringify(body)}return handlePhotoTransfer(new Request(origin+'/api/transfers'+path,{method,headers,body}),env)}
async function create(maxFiles=5){const r=await req('','POST',{student:'Ava Carter',objective:'Sequence events',maxFiles});assert.equal(r.status,201);return r.json()}
const photo=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6aXkAAAAASUVORK5CYII=','base64'));
const upload=(s,body=photo,extra={})=>req('/'+s.id+'/photos?name=student.png','POST',body,{key:s.key,headers:{'Content-Type':'image/png'},...extra});
let checks=0;async function check(name,fn){await fn();checks++;console.log('PASS '+name)}
await check('Anonymous transfer requests require sign-in',async()=>{assert.equal((await req('','POST',{student:'Ava',maxFiles:5},{owner:''})).status,401)});
await check('Cross-origin writes are rejected',async()=>{assert.equal((await req('','POST',{student:'Ava',maxFiles:5},{headers:{origin:'https://unrelated.example'}})).status,403)});
const s=await create();
await check('A real QR points to a unique, short-lived same-site upload',async()=>{assert(s.qr.includes('<svg'));assert(s.qr.includes('<path'));const link=new URL(s.url);assert.equal(link.origin,origin);assert.equal(link.pathname,'/phone');assert.equal(link.searchParams.get('session'),s.id);assert.equal(link.searchParams.get('key'),s.key);assert(s.expires<=Date.now()+900000);writeFileSync(join(tmpdir(),'clearpath-transfer-qr.svg'),s.qr);writeFileSync(join(tmpdir(),'clearpath-transfer-qr-url.txt'),s.url)});
await check('Another account cannot list, upload, download or close a session',async()=>{for(const [p,m,b] of [['','GET'],['/photos','POST',photo],['','DELETE']])assert.equal((await req('/'+s.id+p,m,b,{key:s.key,owner:'teacher-b'})).status,404);assert.equal(objects.size,0)});
await check('Owner identity without the QR key does not grant access',async()=>{assert.equal((await req('/'+s.id)).status,404)});
await check('Bad photo content and oversized requests are rejected before storage',async()=>{assert.equal((await upload(s,new Uint8Array(30))).status,415);assert.equal((await upload(s,photo,{headers:{'Content-Type':'image/png','Content-Length':String(11*1024*1024)}})).status,413);assert.equal(objects.size,0)});
let first;
await check('Phone upload becomes a real downloadable desktop attachment',async()=>{const r=await upload(s);assert.equal(r.status,201);first=await r.json();const list=await (await req('/'+s.id,'GET',undefined,{key:s.key})).json();assert.equal(list.files[0].id,first.id);const response=await req('/'+s.id+'/photos/'+first.id,'GET',undefined,{key:s.key});assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'image/png');assert.deepEqual(new Uint8Array(await response.arrayBuffer()),photo)});
await check('Another account cannot download a known photo ID',async()=>{assert.equal((await req('/'+s.id+'/photos/'+first.id,'GET',undefined,{key:s.key,owner:'teacher-b'})).status,404)});
await check('Desktop acknowledgement removes the server image without redelivery',async()=>{assert.equal((await req('/'+s.id+'/photos/'+first.id,'DELETE',undefined,{key:s.key})).status,200);assert.equal(objects.size,0);const list=await (await req('/'+s.id,'GET',undefined,{key:s.key})).json();assert.equal(list.files[0].delivered,1);assert.equal((await req('/'+s.id+'/photos/'+first.id,'GET',undefined,{key:s.key})).status,410)});
await check('Concurrent uploads cannot exceed the available attachment count',async()=>{const small=await create(1);const results=await Promise.all([upload(small),upload(small)]);assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);await req('/'+small.id,'DELETE',undefined,{key:small.key});assert.equal(objects.size,0)});
await check('Expiry blocks uploads and polling; next session cleans expired blobs',async()=>{const exp=await create();await upload(exp);sql.prepare('UPDATE photo_sessions SET expires = ? WHERE id = ?').run(Date.now()-1,exp.id);assert.equal((await upload(exp)).status,410);assert.equal((await req('/'+exp.id,'GET',undefined,{key:exp.key})).status,410);await create();assert.equal(objects.size,0);assert.equal(sql.prepare('SELECT id FROM photo_sessions WHERE id = ?').get(exp.id),undefined)});
await check('Closing a popup invalidates its session and removes pending photos',async()=>{await upload(s);assert.equal((await req('/'+s.id,'DELETE',undefined,{key:s.key})).status,200);assert.equal(objects.size,0);assert.equal((await upload(s)).status,404)});
await check('A cancelled in-flight upload cannot leave a stored photo',async()=>{const race=await create();const original=BUCKET.put;BUCKET.put=async(k,v)=>{await original(k,v);await req('/'+race.id,'DELETE',undefined,{key:race.key})};assert.equal((await upload(race)).status,410);assert.equal(objects.size,0);BUCKET.put=original});
await check('Sessions are isolated even for the same signed-in teacher',async()=>{const a=await create(),b=await create();const u=await (await upload(a)).json();assert.equal((await req('/'+b.id+'/photos/'+u.id,'GET',undefined,{key:b.key})).status,404);await req('/'+a.id,'DELETE',undefined,{key:a.key})});
await check('Desktop popup receives the actual phone file and saves it with scored progress',async()=>{
 const e=environment();e.ctx.fetch=async(url,options={})=>handlePhotoTransfer(new Request(origin+url,{...options,headers:{...options.headers,origin,'oai-authenticated-user-id':'teacher-a'}}),env);
 e.click('record-progress',{id:'ava'});await e.run("progressCapture.mode='scan';startMobileTransfer()");await new Promise(setImmediate);
 const transfer=e.run('progressCapture.transfer');assert(transfer.qr.includes('<svg'));assert.equal((await upload(transfer)).status,201);
 await e.run('pollMobileTransfer(progressCapture,progressCapture.transfer)');assert.equal(e.run('progressCapture.files.length'),1);assert.equal(objects.size,0);const received=e.run('progressCapture.files[0]');assert.deepEqual(new Uint8Array(await received.file.arrayBuffer()),photo);
 e.click('progress-next');await e.submit('log-form',{student:'ava',goal:'goal-ava',objective:e.run('progressCapture.objective'),comparison:'',date:'2026-10-09',correct:'4',attempts:'5',support:'independent',phase:'followup',note:'Uploaded on phone.'});
 assert.equal(e.run('state.logs[0].score'),80);assert.equal(e.run('state.logs[0].attachments[0].source'),'scan');assert(e.files.has(received.id));assert.equal(e.run('progressCapture'),null);await new Promise(setImmediate);
});
await check('A late photo cannot attach to a different student after the popup closes',async()=>{
 const e=environment();let release;let reached;let delay=false;const blocked=new Promise(resolve=>reached=resolve);
 e.ctx.fetch=async(url,options={})=>{const response=await handlePhotoTransfer(new Request(origin+url,{...options,headers:{...options.headers,origin,'oai-authenticated-user-id':'teacher-a'}}),env);if(delay&&url.includes('/photos/')&&!options.method){await new Promise(resolve=>{release=resolve;reached();});}return response;};
 e.click('record-progress',{id:'ava'});await e.run("progressCapture.mode='scan';startMobileTransfer()");await new Promise(setImmediate);await upload(e.run('progressCapture.transfer'));delay=true;
 const pending=e.run('pollMobileTransfer(progressCapture,progressCapture.transfer)');await blocked;assert(release);e.click('close');e.click('record-progress',{id:'milo'});release();await pending;assert.equal(e.run('progressCapture.student'),'milo');assert.equal(e.run('progressCapture.files.length'),0);
});
console.log(checks+' authenticated cross-device transfer checks passed.');
