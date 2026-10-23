import qrcode from 'qrcode-generator';
import {IntakeError,ensureIntake,readIntakeFile,INTAKE_FILE_COUNT} from './intake-storage.ts';

type Bindings = { DB: D1Database; BUCKET: R2Bucket };
type Session = { id: string; owner: string; token_hash: string; student: string; objective: string; expires: number; max_files: number; file_count: number; intake_id: string|null };
type Photo = { id: string; session: string; name: string; type: string; size: number; object_key: string; delivered: number; created: number };
const MAX_SIZE = 10 * 1024 * 1024;
const TTL = 15 * 60 * 1000;
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
class TransferError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(b => b.toString(16).padStart(2, '0')).join('');
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('');
function requireOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new TransferError(403, 'Open this upload from Clearpath.');
}
async function readBody(request: Request, limit: number) {
  if (Number(request.headers.get('content-length')) > limit) throw new TransferError(413, 'Choose a file under 10 MB.');
  const reader = request.body?.getReader(); if (!reader) throw new TransferError(400, 'No file received.');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > limit) { await reader.cancel(); throw new TransferError(413, 'Choose a file under 10 MB.'); } chunks.push(value); }
  const data = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; } return data;
}
function photoType(bytes: Uint8Array) {
  if (bytes.length > 12 && [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)) return 'image/png';
  if (bytes.length > 12 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  throw new TransferError(415, 'Choose a JPG or PNG photo.');
}
async function removeSession(env: Bindings, id: string) {
  // Close first so an in-flight upload cannot become visible after cancellation.
  await env.DB.prepare('UPDATE photo_sessions SET expires = 0 WHERE id = ?').bind(id).run();
  const { results } = await env.DB.prepare('SELECT object_key FROM photo_files WHERE session = ? AND object_key NOT IN (SELECT object_key FROM intake_files)').bind(id).all<{object_key: string}>();
  if (results.length) await env.BUCKET.delete(results.map(f => f.object_key));
  await env.DB.prepare('DELETE FROM photo_sessions WHERE id = ?').bind(id).run();
}
export async function handlePhotoTransfer(request: Request, env: Bindings): Promise<Response> {
  try {
    const owner = request.headers.get('oai-authenticated-user-id');
    if (!owner) throw new TransferError(401, 'Sign in to the same ChatGPT account as your computer.');
    const url = new URL(request.url), parts = url.pathname.replace(/^\/api\/transfers\/?/, '').split('/').filter(Boolean);
    if (!['GET','POST','DELETE'].includes(request.method)) return json({error: 'Method not allowed.'},405);
    if (request.method !== 'GET') requireOrigin(request);
    if (!parts.length && request.method === 'POST') {
      const { results: expired } = await env.DB.prepare('SELECT id FROM photo_sessions WHERE expires <= ? LIMIT 20').bind(Date.now()).all<{id:string}>();
      for (const row of expired) await removeSession(env,row.id);
      const active = await env.DB.prepare('SELECT count(*) AS count FROM photo_sessions WHERE owner = ? AND expires > ?').bind(owner,Date.now()).first<{count:number}>();
      if ((active?.count || 0) >= 10) throw new TransferError(429, 'Close another mobile upload, then try again.');
      let input: {student?:unknown;objective?:unknown;maxFiles?:unknown;purpose?:unknown;studentId?:unknown};
      try { input = JSON.parse(new TextDecoder().decode(await readBody(request,4096))); } catch (e) { if(e instanceof TransferError) throw e; throw new TransferError(400,'Invalid upload request.'); }
      if (!input || typeof input !== 'object') throw new TransferError(400,'Invalid upload request.');
      const student = typeof input.student === 'string' ? input.student.trim().slice(0,100) : '';
      const objective = typeof input.objective === 'string' ? input.objective.trim().slice(0,300) : '';
      const maxFiles = Number(input.maxFiles);
      if (!student || !Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > (input.purpose==='present-levels'?10:5)) throw new TransferError(400,'Choose a valid number of files for this upload.');
      const intake=input.purpose==='present-levels'?await ensureIntake(env,owner,typeof input.studentId==='string'?input.studentId:''):null;
      const id = crypto.randomUUID(), key = token(), expires = Date.now()+TTL;
      await env.DB.prepare('INSERT INTO photo_sessions (id,owner,token_hash,student,objective,expires,max_files,file_count,intake_id) VALUES (?,?,?,?,?,?,?,0,?)').bind(id,owner,await hash(key),student,objective,expires,maxFiles,intake?.id||null).run();
      const link = new URL('/phone',url.origin); link.searchParams.set('session',id);link.searchParams.set('key',key);
      const qr = qrcode(0,'M');qr.addData(link.toString());qr.make();
      return json({id,key,expires,url:link.toString(),qr:qr.createSvgTag({cellSize:4,margin:16,scalable:true})},201);
    }
    if (parts.length < 1 || !/^[a-f0-9-]{36}$/.test(parts[0])) throw new TransferError(404,'Upload link not found.');
    const session = await env.DB.prepare('SELECT * FROM photo_sessions WHERE id = ? AND owner = ?').bind(parts[0],owner).first<Session>();
    const key = request.headers.get('x-upload-key') || '';
    if (!session || key.length !== 48 || await hash(key) !== session.token_hash) throw new TransferError(404,'Open this link using the same ChatGPT account as your computer.');
    if (request.method === 'DELETE' && parts.length === 1) { await removeSession(env,session.id); return json({closed:true}); }
    if (session.expires <= Date.now()) throw new TransferError(410,'This QR code has expired. Create a new code on your computer.');
    if (parts.length === 1 && request.method === 'GET') {
      const {results} = await env.DB.prepare('SELECT id,name,type,size,delivered FROM photo_files WHERE session = ? ORDER BY created,id').bind(session.id).all();
      return json({student:session.student,objective:session.objective,purpose:session.intake_id?'present-levels':'progress',expires:session.expires,remaining:Math.max(0,session.max_files-session.file_count),files:results});
    }
    if (parts[1] === 'photos' && parts.length === 2 && request.method === 'POST') {
      const document=session.intake_id?await readIntakeFile(request):null;
      const bytes=document?.bytes||await readBody(request,MAX_SIZE), type=document?.type||photoType(bytes);
      if (!document&&request.headers.get('content-type')?.split(';')[0] !== type) throw new TransferError(415,'Photo format does not match its file type. Choose a JPG or PNG.');
      const reserved = await env.DB.prepare('UPDATE photo_sessions SET file_count = file_count + 1 WHERE id = ? AND file_count < max_files AND expires > ? RETURNING file_count').bind(session.id,Date.now()).first();
      if (!reserved) throw new TransferError(409,'This upload is full or has ended. Check your computer.');
      const id = crypto.randomUUID(), objectKey = `photo-transfer/${session.id}/${id}`;
      const rawName = (url.searchParams.get('name') || 'Student work').replace(/[\x00-\x1f/\\]/g,'').slice(0,100).replace(/\.[^.]+$/,'');
      const name = document?.name||(rawName || 'Student work')+(type==='image/png'?'.png':'.jpg');
      try {
        await env.BUCKET.put(objectKey,bytes,{httpMetadata:{contentType:type}});
        const active = await env.DB.prepare('SELECT id FROM photo_sessions WHERE id = ? AND expires > ?').bind(session.id,Date.now()).first();
        if (!active) throw new TransferError(410,'This upload has ended. Create a new code on your computer.');
        const inserted = await env.DB.prepare('INSERT INTO photo_files (id,session,name,type,size,object_key,delivered,created) SELECT ?,?,?,?,?,?,0,? WHERE EXISTS (SELECT id FROM photo_sessions WHERE id = ? AND expires > ?)').bind(id,session.id,name,type,bytes.length,objectKey,Date.now(),session.id,Date.now()).run();
        if (!inserted.meta.changes) throw new TransferError(410,'This upload has ended. Create a new code on your computer.');
        if(session.intake_id){
          const saved=await env.DB.prepare('INSERT INTO intake_files (id,intake,name,type,size,object_key,source,created) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT id FROM photo_sessions WHERE id = ? AND expires > ?) AND (SELECT count(*) FROM intake_files WHERE intake = ?) < ?').bind(id,session.intake_id,name,type,bytes.length,objectKey,'phone',Date.now(),session.id,Date.now(),session.intake_id,INTAKE_FILE_COUNT).run();
          if(!saved.meta.changes)throw new TransferError(409,'The upload has ended or all 10 source-file spaces are filled. Check your computer.');
        }
      } catch (error) { await env.BUCKET.delete(objectKey);await env.DB.prepare('DELETE FROM photo_files WHERE id = ? AND session = ?').bind(id,session.id).run();await env.DB.prepare('UPDATE photo_sessions SET file_count = file_count - 1 WHERE id = ?').bind(session.id).run();throw error; }
      return json({id,name,size:bytes.length,type},201);
    }
    if (parts[1] === 'photos' && parts.length === 3) {
      const photo = await env.DB.prepare('SELECT * FROM photo_files WHERE id = ? AND session = ?').bind(parts[2],session.id).first<Photo>();
      if (!photo) throw new TransferError(404,'Photo not found.');
      if (request.method === 'DELETE') { if(!session.intake_id)await env.BUCKET.delete(photo.object_key);await env.DB.prepare('UPDATE photo_files SET delivered = 1 WHERE id = ? AND session = ?').bind(photo.id,session.id).run();return json({received:true}); }
      if (request.method === 'GET') {
        if (photo.delivered) throw new TransferError(410,'Photo has already reached your computer.');
        const object = await env.BUCKET.get(photo.object_key);if (!object) throw new TransferError(404,'Photo is no longer available.');
        return new Response(object.body,{headers:{...headers,'Content-Type':photo.type,'Content-Length':String(photo.size),'Content-Disposition':`attachment; filename="${encodeURIComponent(photo.name)}"`}});
      }
    }
    throw new TransferError(404,'Upload action not found.');
  } catch(error) {
    if (error instanceof TransferError||error instanceof IntakeError) return json({error:error.message},error.status);
    console.error('Photo transfer operation failed');
    return json({error:'Could not transfer the photo. Please try again.'},500);
  }
}
