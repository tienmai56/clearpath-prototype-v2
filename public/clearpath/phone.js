'use strict';
const params=new URLSearchParams(location.search),session=params.get('session'),key=params.get('key');
const phoneAPI='/api/transfers/'+encodeURIComponent(session||''),statusNode=document.getElementById('phone-status'),errorNode=document.getElementById('phone-error');
let phoneRemaining=0,phoneBusy=false,phoneExpires=0;
function phoneButtons(disabled){for(const id of ['phone-camera-button','phone-files-button'])document.getElementById(id).disabled=disabled;}
async function phoneRequest(path='',options={}){
 const response=await fetch(phoneAPI+path,{...options,credentials:'same-origin',cache:'no-store',headers:{...options.headers,'x-upload-key':key}});
 const json=await response.json().catch(()=>({error:'Could not connect. Please try again.'}));
 if(!response.ok)throw new Error(json.error||'Could not connect.');return json;
}
async function phoneConnect(){
 if(!session||!key){statusNode.textContent='Scan a QR code from Record progress to begin.';return;}
 try{const data=await phoneRequest();phoneRemaining=data.remaining;phoneExpires=data.expires;document.getElementById('phone-student').textContent=data.student;document.getElementById('phone-objective').textContent=data.objective;document.getElementById('phone-content').hidden=false;statusNode.textContent=data.files.length?'Connected · '+data.files.length+' photo(s) sent':'Connected to your computer';document.getElementById('phone-expiry').textContent='Link expires at '+new Date(data.expires).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});phoneButtons(!phoneRemaining);}catch(error){statusNode.textContent='Upload unavailable';errorNode.textContent=error.message;}
}
async function phoneUpload(files){
 if(phoneBusy)return;phoneBusy=true;phoneButtons(true);errorNode.textContent='';
 for(const file of files){
  if(phoneRemaining<1){errorNode.textContent='All photo spaces are filled. Continue on your computer.';break;}
  if(Date.now()>=phoneExpires){errorNode.textContent='This link has expired. Create a new QR code on your computer.';break;}
  if(!['image/jpeg','image/png'].includes(file.type)||!file.size||file.size>10*1024*1024){errorNode.textContent='Choose a JPG or PNG photo under 10 MB.';continue;}
  statusNode.textContent='Sending '+file.name+'…';
  try{
   const result=await phoneRequest('/photos?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':file.type},body:file});phoneRemaining--;
   const row=document.createElement('div');row.className='phone-sent';const img=document.createElement('img');const preview=URL.createObjectURL(file);img.src=preview;img.alt='Uploaded student work';img.onload=()=>URL.revokeObjectURL(preview);const label=document.createElement('span');label.textContent=result.name+' · Sent';row.append(img,label);document.getElementById('phone-previews').append(row);
   statusNode.textContent='Photo sent. Continue on your computer.';
  }catch(error){statusNode.textContent='Photo was not sent';errorNode.textContent=error.message;break;}
 }
 phoneBusy=false;phoneButtons(!phoneRemaining||Date.now()>=phoneExpires);
}
document.getElementById('phone-camera-button').onclick=()=>document.getElementById('phone-camera').click();
document.getElementById('phone-files-button').onclick=()=>document.getElementById('phone-files').click();
for(const id of ['phone-camera','phone-files'])document.getElementById(id).onchange=e=>{phoneUpload(Array.from(e.target.files||[]));e.target.value='';};
phoneConnect();
