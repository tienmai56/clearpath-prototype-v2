'use strict';
const params=new URLSearchParams(location.search),session=params.get('session'),key=params.get('key');
const phoneAPI='/api/transfers/'+encodeURIComponent(session||''),statusNode=document.getElementById('phone-status'),errorNode=document.getElementById('phone-error');
let phoneRemaining=0,phoneBusy=false,phoneExpires=0,phonePurpose='progress',phoneTimer=null;
const phoneRows=new Map();
const phoneTypes={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',heic:'image/heic',heif:'image/heif',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'};
function phoneButtons(disabled){for(const id of ['phone-camera-button','phone-files-button'])document.getElementById(id).disabled=disabled;}
async function phoneRequest(path='',options={}){
 const response=await fetch(phoneAPI+path,{...options,credentials:'same-origin',cache:'no-store',headers:{...options.headers,'x-upload-key':key}});
 const json=await response.json().catch(()=>({error:'Could not connect. Please try again.'}));
 if(!response.ok){const error=new Error(json.error||'Could not connect.');error.status=response.status;throw error;}return json;
}
function phoneFileRow(file){
 if(phoneRows.has(file.id))return phoneRows.get(file.id);
 const row=document.createElement('div');row.className='phone-sent';
 const icon=document.createElement('span');icon.className='phone-file-type';icon.textContent=file.name.split('.').pop().toUpperCase();
 const text=document.createElement('div'),name=document.createElement('strong'),state=document.createElement('small');
 name.textContent=file.name;state.textContent=file.delivered?'Received on your computer':'Uploaded · Waiting for computer';
 text.append(name,state);row.append(icon,text);document.getElementById('phone-previews').append(row);
 const entry={state,received:!!file.delivered};phoneRows.set(file.id,entry);return entry;
}
async function phoneConfirm(){
 clearTimeout(phoneTimer);if(!phoneRows.size||Array.from(phoneRows.values()).every(x=>x.received))return;
 try{const data=await phoneRequest();for(const file of data.files){const row=phoneFileRow(file);if(file.delivered){row.received=true;row.state.textContent='Received on your computer';}}
  if(Array.from(phoneRows.values()).every(x=>x.received)){if(!phoneBusy)statusNode.textContent='Upload confirmed. Your files are displayed on your computer.';return;}
 }catch(error){if([401,404,410].includes(error.status)){if(!phoneBusy)statusNode.textContent='Files uploaded. Return to the student profile on your computer.';return;}}
 phoneTimer=setTimeout(phoneConfirm,2000);
}
async function phoneConnect(){
 if(!session||!key){statusNode.textContent='Scan a QR code from Clearpath to begin.';return;}
 try{const data=await phoneRequest();phoneRemaining=data.remaining;phoneExpires=data.expires;phonePurpose=data.purpose||'progress';
  document.getElementById('phone-student').textContent=data.student;document.getElementById('phone-objective').textContent=data.objective;document.getElementById('phone-content').hidden=false;
  if(phonePurpose==='present-levels'){
   document.getElementById('phone-description').textContent='Choose reports, assessments, evaluations, photos, or videos. Uploaded files will appear in this student’s profile on your computer.';
   document.getElementById('phone-files-button').textContent='Choose documents or videos';document.getElementById('phone-camera-button').textContent='Take a photo or video';
   document.getElementById('phone-files').accept=Object.keys(phoneTypes).map(x=>'.'+x).join(',');document.getElementById('phone-camera').accept='image/*,video/*';
   document.getElementById('phone-formats').textContent='PDF, Word, JPG, PNG, HEIC, MP4, MOV, WebM · Documents/images 10 MB; videos 25 MB';
  }
  statusNode.textContent='Connected to your computer';document.getElementById('phone-expiry').textContent='Link expires at '+new Date(data.expires).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  data.files.forEach(phoneFileRow);phoneButtons(!phoneRemaining);phoneConfirm();
 }catch(error){statusNode.textContent='Upload unavailable';errorNode.textContent=error.message;}
}
async function phoneUpload(files){
 if(phoneBusy)return;phoneBusy=true;phoneButtons(true);errorNode.textContent='';
 for(const file of files){
  if(phoneRemaining<1){errorNode.textContent='This upload is full. Continue on your computer.';break;}
  if(Date.now()>=phoneExpires){errorNode.textContent='This link has expired. Create a new QR code on your computer.';break;}
  const ext=file.name.split('.').pop().toLowerCase(),type=phoneTypes[ext],limit=(type?.startsWith('video/')?25:10)*1024*1024;
  if(!type||phonePurpose!=='present-levels'&&!['image/jpeg','image/png'].includes(type)||!file.size||file.size>limit){errorNode.textContent=phonePurpose==='present-levels'?'Choose a supported document or image up to 10 MB, or a video up to 25 MB.':'Choose a JPG or PNG photo under 10 MB.';continue;}
  statusNode.textContent='Uploading '+file.name+'…';
  try{const result=await phoneRequest('/photos?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':type},body:file});phoneRemaining--;phoneFileRow(result);statusNode.textContent='Uploaded. Waiting for your computer to confirm…';}
  catch(error){statusNode.textContent='File was not uploaded';errorNode.textContent=error.message;break;}
 }
 phoneBusy=false;phoneButtons(!phoneRemaining||Date.now()>=phoneExpires);phoneConfirm();
}
document.getElementById('phone-camera-button').onclick=()=>document.getElementById('phone-camera').click();
document.getElementById('phone-files-button').onclick=()=>document.getElementById('phone-files').click();
for(const id of ['phone-camera','phone-files'])document.getElementById(id).onchange=e=>{phoneUpload(Array.from(e.target.files||[]));e.target.value='';};
phoneConnect();
