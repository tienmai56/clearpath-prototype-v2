'use strict';
// A transfer belongs to one open progress popup. Never store its key in localStorage.
function mobileTransferView(){
 const p=progressCapture,t=p?.transfer;
 if(p.files.length>=EVIDENCE_COUNT)return '<p class="capture-hint">Five files attached. Continue to record progress.</p>';
 if(!t||t.loading)return '<div class="qr-upload"><p role="status">Creating your QR code…</p></div>';
 if(t.error)return `<div class="qr-upload"><p role="alert">${esc(t.error)}</p>${btn('Create new QR code','retry-mobile')}</div>`;
 return `<div class="qr-upload"><div class="qr-image" role="img" aria-label="Scan this QR code with your phone camera">${t.qr}</div><div class="qr-instructions"><h3>Scan with your phone</h3><p>Open your phone’s camera, scan this code, then upload a photo.</p><p class="caption">Sign in with the same ChatGPT account. Keep this window open.</p><span class="qr-status" role="status">${esc(t.status||'Waiting for photos…')}</span><small>Code expires at ${new Date(t.expires).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</small><button class="text-btn" data-action="copy-mobile-link">Copy upload link</button> · <button class="text-btn" data-action="retry-mobile">New code</button></div></div>`;
}
async function transferRequest(t,path='',options={}){
 const response=await fetch('/api/transfers/'+t.id+path,{...options,credentials:'same-origin',cache:'no-store',headers:{...options.headers,'x-upload-key':t.key}});
 if(!response.ok){const error=await response.json().catch(()=>({error:'Could not connect. Try again.'}));const e=new Error(error.error||'Could not transfer photo.');e.status=response.status;throw e;}return response;
}
function refreshMobileTransfer(p){
 if(progressCapture!==p||p.mode!=='scan')return;
 if(p.step===1){const picker=document.getElementById('evidence-picker');if(picker)picker.innerHTML=evidencePicker();const next=overlay.querySelector?.('[data-action="progress-next"]');if(next)next.disabled=!p.files.length;}
 else {const text=overlay.querySelector?.('.attached-summary span');if(text)text.textContent=p.files.length+' files attached';}
}
function stopMobileTransfer(p){
 const t=p?.transfer;if(!t)return;t.cancelled=true;clearTimeout(t.timer);p.transfer=null;
 if(t.id)transferRequest(t,'',{method:'DELETE',keepalive:true}).catch(()=>{});
}
async function startMobileTransfer(){
 const p=progressCapture;if(!p||p.mode!=='scan'||p.transfer||p.files.length>=EVIDENCE_COUNT)return;
 const t={loading:true,cancelled:false,seen:new Set()};p.transfer=t;refreshMobileTransfer(p);
 try{
  const goal=findGoal(p.student,p.goal),objective=goal?.objectives.find(o=>o.id===p.objective);
  const response=await fetch('/api/transfers',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({student:getStudent(p.student).name,objective:objective?.skill||'',maxFiles:EVIDENCE_COUNT-p.files.length})});
  const data=await response.json().catch(()=>({error:'Could not connect. Please try again.'}));if(!response.ok)throw new Error(data.error||'Could not create QR code.');
  Object.assign(t,data,{loading:false});
  if(progressCapture!==p||t.cancelled||p.transfer!==t){transferRequest(t,'',{method:'DELETE'}).catch(()=>{});return;}
  refreshMobileTransfer(p);await pollMobileTransfer(p,t);
 }catch(error){if(progressCapture===p&&!t.cancelled){t.loading=false;t.error=error.message;refreshMobileTransfer(p);}}
}
async function pollMobileTransfer(p,t){
 if(progressCapture!==p||p.transfer!==t||t.cancelled)return;
 if(Date.now()>=t.expires){t.error='This QR code has expired. Photos already received are still attached.';refreshMobileTransfer(p);return;}
 try{
  const data=await (await transferRequest(t)).json();
  if(progressCapture!==p||p.transfer!==t||t.cancelled)return;
  for(const f of data.files){
   if(f.delivered)continue;
   if(!t.seen.has(f.id)){
    const blob=await (await transferRequest(t,'/photos/'+f.id)).blob();
    if(progressCapture!==p||p.transfer!==t||t.cancelled||p.saving)return;
    if(p.files.length>=EVIDENCE_COUNT)break;
    const file=new File([blob],f.name,{type:f.type,lastModified:Date.now()});
    p.files.push({id:uid('evidence'),file,type:f.type,source:'scan',previewURL:URL.createObjectURL(file)});t.seen.add(f.id);t.status='Photo received';
    refreshMobileTransfer(p);toast('Photo received from your phone.');
   }
   await transferRequest(t,'/photos/'+f.id,{method:'DELETE'});
  }
  if(!data.files.some(f=>!f.delivered)&&!t.seen.size)t.status='Waiting for photos…';
  t.error='';refreshMobileTransfer(p);
 }catch(error){if(progressCapture!==p||p.transfer!==t||t.cancelled)return;if([401,404,410].includes(error.status)){t.error=error.message;refreshMobileTransfer(p);return;}t.status='Connection interrupted. Reconnecting…';refreshMobileTransfer(p);}
 if(progressCapture===p&&p.transfer===t&&!t.cancelled)t.timer=setTimeout(()=>pollMobileTransfer(p,t),2500);
}
function handleMobileTransferAction(action){
 if(action==='retry-mobile'){stopMobileTransfer(progressCapture);startMobileTransfer();return true;}
 if(action==='copy-mobile-link'){const url=progressCapture?.transfer?.url;if(url)navigator.clipboard.writeText(url).then(()=>toast('Upload link copied.')).catch(()=>toast('Could not copy the link. Scan the QR code instead.'));return true;}
 return false;
}
