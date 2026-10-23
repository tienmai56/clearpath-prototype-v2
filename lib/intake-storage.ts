export type IntakeBindings = { DB: D1Database; BUCKET: R2Bucket };
export type IntakeRow = {id:string;owner:string;student:string;drafts:string;updated:number};
export class IntakeError extends Error {status:number;constructor(status:number,message:string){super(message);this.status=status;}}
export const INTAKE_FILE_COUNT=10;
export const intakeHeaders={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export async function readLimitedBody(request:Request,limit:number){
 if(Number(request.headers.get('content-length'))>limit)throw new IntakeError(413,'This file is too large. Documents and images can be up to 10 MB; videos up to 25 MB.');
 const reader=request.body?.getReader();if(!reader)throw new IntakeError(400,'No file received.');
 const chunks:Uint8Array[]=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new IntakeError(413,'This file exceeds the size limit.');}chunks.push(value);}
 if(!length)throw new IntakeError(400,'Choose a file that is not empty.');
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export function intakeFileSpec(name:string){
 const ext=name.split('.').pop()?.toLowerCase()||'';
 const types:Record<string,string>={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',heic:'image/heic',heif:'image/heif',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'};
 const type=types[ext];if(!type)throw new IntakeError(415,'Choose a PDF, Word document, JPG, PNG, HEIC, MP4, MOV, or WebM file.');
 return {type,ext,limit:(type.startsWith('video/')?25:10)*1024*1024};
}
export async function readIntakeFile(request:Request){
 const name=(new URL(request.url).searchParams.get('name')||'').replace(/[\x00-\x1f/\\]/g,'').slice(0,180);
 const spec=intakeFileSpec(name),bytes=await readLimitedBody(request,spec.limit);
 const starts=(prefix:number[])=>prefix.every((b,i)=>bytes[i]===b),text=new TextDecoder().decode(bytes.slice(0,80));
 let valid=false;
 if(spec.ext==='pdf')valid=text.startsWith('%PDF-');
 else if(spec.ext==='jpg'||spec.ext==='jpeg')valid=starts([255,216,255]);
 else if(spec.ext==='png')valid=starts([137,80,78,71,13,10,26,10]);
 else if(spec.ext==='doc')valid=starts([208,207,17,224,161,177,26,225]);
 else if(spec.ext==='docx')valid=starts([80,75,3,4])&&new TextDecoder().decode(bytes).includes('word/document.xml');
 else if(spec.ext==='webm')valid=starts([26,69,223,163]);
 else if(['heic','heif'].includes(spec.ext))valid=text.slice(4,8)==='ftyp'&&/heic|heix|hevc|hevx|mif1|msf1/.test(text);
 else valid=text.slice(4,8)==='ftyp'||spec.ext==='mov'&&['moov','mdat','wide'].includes(text.slice(4,8));
 if(!valid)throw new IntakeError(415,'The file contents do not match its format. Export the original file and try again.');
 return {name,type:spec.type,bytes};
}
export async function ensureIntake(env:IntakeBindings,owner:string,student:string):Promise<IntakeRow>{
 if(!/^[a-z0-9][a-z0-9-]{0,100}$/.test(student))throw new IntakeError(400,'Choose a student first.');
 await env.DB.prepare('INSERT INTO student_intakes (id,owner,student,drafts,updated) VALUES (?,?,?,?,?) ON CONFLICT(owner,student) DO NOTHING').bind(crypto.randomUUID(),owner,student,'{}',Date.now()).run();
 return (await env.DB.prepare('SELECT * FROM student_intakes WHERE owner = ? AND student = ?').bind(owner,student).first<IntakeRow>())!;
}
export async function intakeSnapshot(env:IntakeBindings,row:IntakeRow){
 const {results:files}=await env.DB.prepare('SELECT id,name,type,size,source,created FROM intake_files WHERE intake = ? ORDER BY created,id').bind(row.id).all();
 return {student:row.student,files,drafts:JSON.parse(row.drafts),updated:row.updated};
}
