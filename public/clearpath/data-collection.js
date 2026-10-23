'use strict';

const collectionMethods=[
 {id:'accuracy',label:'Accuracy',description:'Correct responses ÷ total',icon:'compare'},
 {id:'frequency',label:'Frequency',description:'Count each occurrence',icon:'plan'},
 {id:'duration',label:'Duration',description:'Measure time on task',icon:'clock'},
 {id:'completion',label:'Task completion',description:'Track completed steps',icon:'circleCheck'},
 {id:'independence',label:'Independence',description:'Record prompting level',icon:'target'}
];
const collectionUploadLimit=5;
const collectionFileLimit=10*1024*1024;
let collectionPhone=null;
let collectionPhoneTimer=null;
let collectionState={stage:'upload',method:'accuracy',files:[],activeFile:0,name:'Data collection - Oct 23, 2026'};

function collectionMethod(){return collectionMethods.find(method=>method.id===collectionState.method)||collectionMethods[0]}
function collectionFileSize(size){return size<1024*1024?Math.max(1,Math.round(size/1024))+' KB':(size/(1024*1024)).toFixed(1)+' MB'}
function collectionFileType(file){const extension=file.name.split('.').pop().toLowerCase(),expected={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'}[extension];return expected&&(!file.type||file.type===expected)?expected:null}
function collectionMethodList(){return `<aside class="collection-methods" aria-label="Performance methods"><h2>Select performance method</h2><div>${collectionMethods.map(method=>`<button class="collection-method ${collectionState.method===method.id?'active':''}" data-collection-action="method" data-method="${method.id}" ${collectionState.method===method.id?'aria-current="true"':''}><span>${icon(method.icon)}</span><span><strong>${method.label}</strong><small>${method.description}</small></span></button>`).join('')}</div></aside>`}

function collectionUploadView(){const method=collectionMethod();return `<section class="collection-upload-page" aria-labelledby="collection-heading">
 <div class="page-head collection-page-head"><h1 id="collection-heading">Collect data</h1><button class="btn" data-collection-action="history">${icon('clock')}Analysis history</button></div>
 <div class="collection-upload-workspace">${collectionMethodList()}<section class="collection-uploader card" aria-labelledby="collection-upload-title">
  <header><h2 id="collection-upload-title">${method.label} - Upload data sheets</h2></header>
  <div class="collection-uploader-body">
   <label class="collection-dropzone" id="collection-dropzone" for="collection-files"><span class="collection-upload-icon">${icon('upload')}</span><strong><span>Click to upload</span> or drag and drop</strong><small>PDF, PNG, or JPG</small></label>
   <input id="collection-files" type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" multiple hidden>
   <button class="collection-phone-row" data-collection-action="phone"><span class="collection-phone-icon">${icon('phone')}</span><strong>Use your phone</strong><span>Scan QR ${icon('arrow')}</span></button>
   ${collectionState.files.length?collectionSelectedFiles():''}
   <section class="collection-sample" aria-labelledby="collection-sample-heading"><h3 id="collection-sample-heading">Try sample data</h3><button class="collection-sample-card" data-collection-action="sample"><img src="/clearpath/naturalistic-data-sheet.jpg" alt="Handwritten naturalistic group data sheet"><span><strong>Naturalistic group data sheet</strong><small>Accuracy example · 4 correct of 5 trials</small></span><span class="collection-sample-arrow">${icon('arrow')}</span></button></section>
  </div>
 </section></div>
 </section>`}

function collectionSelectedFiles(){return `<section class="collection-selected" aria-labelledby="selected-data-heading"><div><h3 id="selected-data-heading">Ready to analyze</h3><span>${collectionState.files.length} of ${collectionUploadLimit} files</span></div><ul>${collectionState.files.map((item,index)=>`<li><span>${item.previewURL?`<img src="${item.previewURL}" alt="">`:icon('plan')}</span><div><strong>${esc(item.name)}</strong><small>${collectionFileSize(item.size)}${item.source==='phone'?' · From phone':''}</small></div><button class="icon-btn" data-collection-action="remove-file" data-index="${index}" aria-label="Remove ${esc(item.name)}">${icon('close')}</button></li>`).join('')}</ul><button class="btn primary full" data-collection-action="analyze">Analyze ${collectionState.files.length} data ${collectionState.files.length===1?'sheet':'sheets'}</button></section>`}

function collectionAnalyzingView(){return `<section class="collection-processing" aria-live="polite"><span>${icon('spark')}</span><h1>Reading the data sheets</h1><p>Finding recorded responses and calculating ${collectionMethod().label.toLowerCase()}.</p><div><i></i></div></section>`}

function collectionSheetAnnotations(file,method){if(method.id!=='accuracy'||!(file?.source==='sample'||file?.previewURL?.includes('naturalistic-data-sheet')))return '';return `<div role="group" aria-label="Detected trials: four correct and one not correct" style="position:absolute;inset:0;pointer-events:none"><div aria-hidden="true" style="position:absolute;left:26.8%;top:71%;width:17.9%;height:4.4%;display:grid;grid-template-columns:repeat(5,1fr)"><i style="border:2px solid #2d7a58;background:#dff2e733"></i><i style="border:2px solid #2d7a58;background:#dff2e733"></i><i style="border:2px solid #2d7a58;background:#dff2e733"></i><i style="position:relative;border:2px solid #b55d45;background:#f7dfd833"><span style="position:absolute;top:calc(100% + 7px);left:50%;transform:translateX(-50%);padding:4px 7px;border-radius:4px;background:#a84e39;color:#fff;font:700 10px/1.2 Arial,sans-serif;white-space:nowrap;box-shadow:0 2px 7px #24352c33">1 not correct</span></i><i style="border:2px solid #2d7a58;background:#dff2e733"></i><span style="position:absolute;bottom:calc(100% + 7px);left:0;padding:4px 7px;border-radius:4px;background:#246b4d;color:#fff;font:700 10px/1.2 Arial,sans-serif;white-space:nowrap;box-shadow:0 2px 7px #24352c33">4 correct</span></div></div>`}

function collectionReviewView(){const method=collectionMethod(),file=collectionState.files[collectionState.activeFile]||collectionState.files[0],result=collectionResult(method.id);return `<section class="collection-review-page" aria-labelledby="collection-review-heading" style="margin-top:-20px">
 <div class="collection-review-head" style="align-items:center;margin-bottom:12px"><div style="display:flex;align-items:center;gap:14px;min-width:0"><button class="back" style="margin:0;white-space:nowrap" data-collection-action="back-upload">${icon('back')}Upload data sheets</button><h1 id="collection-review-heading" style="font-size:24px;line-height:1.2">Review ${method.label.toLowerCase()}</h1></div></div>
 <div class="collection-review-grid"><aside class="collection-file-sidebar"><h2>Data collection sheets: ${collectionState.files.length} ${collectionState.files.length===1?'worksheet':'worksheets'}</h2><div class="collection-file-choices">${collectionState.files.map((item,index)=>`<button class="collection-file-choice ${index===collectionState.activeFile?'active':''}" data-collection-action="select-file" data-index="${index}"><span>${icon('image')}</span><span style="min-width:0"><strong title="${esc(item.name)}">${esc(item.name)}</strong><small>Ready to review</small></span>${icon('circleCheck')}</button>`).join('')}</div><label>Collection name<input data-collection-name value="${esc(collectionState.name)}"></label><button class="btn primary full" data-collection-action="save-review">Save</button></aside>
  <section class="collection-document"><div class="collection-document-toolbar"><strong>${esc(file?.name||'Data sheet')}</strong><span>Page 1</span></div>${file?.previewURL?`<div class="collection-document-frame" style="position:relative"><img src="${file.previewURL}" alt="Uploaded data sheet">${collectionSheetAnnotations(file,method)}</div>`:`<div class="collection-document-empty">${icon('plan')}<strong>${esc(file?.name||'Uploaded data sheet')}</strong><span>PDF ready for review</span></div>`}</section>
  <aside class="collection-result"><span>${method.label}</span><strong>${result.value}</strong><small>${result.detail}</small><div class="collection-result-bar"><i style="width:${result.percent}%"></i></div><section><h2>How this was calculated</h2>${result.rows.map(([label,value])=>`<div><span>${label}</span><b>${value}</b></div>`).join('')}</section></aside>
 </div></section>`}

function collectionResult(method){if(method==='frequency')return {value:'5',detail:'recorded occurrences',percent:50,rows:[['Marks detected','5'],['Observation period','30 min']],rule:'Each recorded occurrence counts once.'};if(method==='duration')return {value:'25 min',detail:'across the selected observation',percent:63,rows:[['Observed intervals','5'],['Minutes per interval','5']],rule:'Observed intervals are multiplied by the interval length.'};if(method==='completion')return {value:'80%',detail:'4 of 5 steps completed',percent:80,rows:[['Completed steps','4'],['Total steps','5']],rule:'Completed steps are divided by total assigned steps.'};if(method==='independence')return {value:'60%',detail:'3 of 5 trials independent',percent:60,rows:[['Independent trials','3'],['Prompted or incomplete','2']],rule:'Trials completed without a prompt count as independent.'};return {value:'80%',detail:'4 of 5 trials correct',percent:80,rows:[['Correct “+” marks','4'],['Not correct marks','1'],['Total trials','5']],rule:'Only “+” counts as correct. Any other mark counts as not correct.'}}

function collectionHistoryModal(){openModal('Analysis history','',`<div class="collection-history"><div><span>${icon('image')}</span><p><strong>Naturalistic group data sheet</strong><small>Accuracy · 80% · Oct 23</small></p><button class="text-btn" data-collection-action="close-history">Close</button></div><p class="caption">New saved analyses will appear here.</p></div>`)}
function collectionPhoneModal(){const transfer=collectionPhone;if(!transfer)return;const body=transfer.loading?`<div class="collection-phone-loading" role="status">${icon('clock')}Creating your QR code…</div>`:transfer.error?`<div class="collection-phone-loading" role="alert"><p>${esc(transfer.error)}</p><button class="btn" data-collection-action="phone-retry">Try again</button></div>`:`<div class="collection-phone-modal"><div class="qr-image" role="img" aria-label="Scan this QR code with your phone camera">${transfer.qr}</div><div><h3>Scan with your phone</h3><ol><li>Open your phone’s camera and scan the code.</li><li>Choose a photo of the data sheet.</li><li>Keep this window open until the file appears.</li></ol><p role="status">${esc(transfer.status||'Waiting for photos…')}</p><small>${collectionState.files.length} of ${collectionUploadLimit} files received</small><button class="text-btn" data-collection-action="phone-copy">Copy upload link</button></div></div>`;openModal('Use your phone','Upload a data sheet',`${body}<div class="modal-foot"><button class="btn" data-collection-action="phone-close">Done</button></div>`,{wide:true})}

function dataCollectionView(){return collectionState.stage==='review'?collectionReviewView():collectionState.stage==='analyzing'?collectionAnalyzingView():collectionUploadView()}

function collectionAddFiles(files,source='device'){
 const errors=[];
 for(const file of files){if(collectionState.files.length>=collectionUploadLimit){errors.push(`You can add up to ${collectionUploadLimit} files.`);break}const type=collectionFileType(file);if(!type||(source==='phone'&&!type.startsWith('image/'))){errors.push(`${file.name}: choose a PDF, PNG, or JPG.`);continue}if(file.size<=0||file.size>collectionFileLimit){errors.push(`${file.name}: choose a file under 10 MB.`);continue}if(collectionState.files.some(item=>item.name===file.name&&item.size===file.size))continue;collectionState.files.push({name:file.name,size:file.size,type,source,previewURL:type.startsWith('image/')?URL.createObjectURL(file):'',file})}
 render();if(errors.length)toast(errors.join(' '));
}
function collectionUseSample(){if(!collectionState.files.some(item=>item.source==='sample'))collectionState.files.push({name:'Naturalistic group data sheet.jpg',size:102400,type:'image/jpeg',source:'sample',previewURL:'/clearpath/naturalistic-data-sheet.jpg'});collectionState.activeFile=collectionState.files.findIndex(item=>item.source==='sample');collectionStartAnalysis()}
function collectionStartAnalysis(){if(!collectionState.files.length)return toast('Choose a data sheet first.');collectionState.stage='analyzing';render();setTimeout(()=>{if(route().page!=='collect')return;collectionState.stage='review';collectionState.activeFile=Math.min(collectionState.activeFile,collectionState.files.length-1);render();window.scrollTo(0,0)},650)}
function collectionRemoveFile(index){const item=collectionState.files[index];if(item?.previewURL?.startsWith('blob:'))URL.revokeObjectURL(item.previewURL);collectionState.files.splice(index,1);collectionState.activeFile=Math.max(0,Math.min(collectionState.activeFile,collectionState.files.length-1));render()}

async function collectionStartPhone(){if(collectionState.files.length>=collectionUploadLimit)return toast(`You can add up to ${collectionUploadLimit} files.`);collectionStopPhone(false);collectionPhone={loading:true,status:'',error:'',seen:new Set()};collectionPhoneModal();try{const response=await fetch('/api/transfers',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({student:'Data collection',objective:collectionMethod().label,maxFiles:collectionUploadLimit-collectionState.files.length})}),data=await response.json().catch(()=>({error:'Could not create a phone upload.'}));if(!response.ok)throw new Error(data.error||'Could not create a phone upload.');Object.assign(collectionPhone,data,{loading:false});collectionPhoneModal();collectionPollPhone()}catch(error){if(collectionPhone){collectionPhone.loading=false;collectionPhone.error=error.message;collectionPhoneModal()}}}
async function collectionPhoneRequest(path='',options={}){const transfer=collectionPhone,response=await fetch('/api/transfers/'+transfer.id+path,{...options,credentials:'same-origin',cache:'no-store',headers:{...options.headers,'x-upload-key':transfer.key}});if(!response.ok){const data=await response.json().catch(()=>({error:'Could not connect.'}));throw new Error(data.error||'Could not connect.')}return response}
async function collectionPollPhone(){const transfer=collectionPhone;if(!transfer?.id)return;try{const data=await (await collectionPhoneRequest()).json();for(const item of data.files){if(item.delivered||transfer.seen.has(item.id))continue;const blob=await (await collectionPhoneRequest('/photos/'+item.id)).blob(),file=new File([blob],item.name,{type:item.type,lastModified:Date.now()});collectionAddFiles([file],'phone');transfer.seen.add(item.id);transfer.status='Photo received';await collectionPhoneRequest('/photos/'+item.id,{method:'DELETE'});collectionPhoneModal();toast('Photo received from your phone.')}if(!data.files.length)transfer.status='Waiting for photos…'}catch(error){if(collectionPhone)collectionPhone.status=error.message}if(collectionPhone===transfer)collectionPhoneTimer=setTimeout(collectionPollPhone,2500)}
function collectionStopPhone(close=true){clearTimeout(collectionPhoneTimer);const transfer=collectionPhone;collectionPhone=null;if(transfer?.id)fetch('/api/transfers/'+transfer.id,{method:'DELETE',credentials:'same-origin',keepalive:true,headers:{'x-upload-key':transfer.key}}).catch(()=>{});if(close){closeModal();render()}}

document.addEventListener('click',event=>{const button=event.target.closest('[data-collection-action]');if(!button)return;event.preventDefault();const action=button.dataset.collectionAction;
 if(action==='method'){collectionState.method=button.dataset.method;render()}
 if(action==='history')collectionHistoryModal();
 if(action==='close-history')closeModal();
 if(action==='sample')collectionUseSample();
 if(action==='remove-file')collectionRemoveFile(+button.dataset.index);
 if(action==='analyze')collectionStartAnalysis();
 if(action==='back-upload'){collectionState.stage='upload';render()}
 if(action==='select-file'){collectionState.activeFile=+button.dataset.index;render()}
 if(action==='save-review')toast('Data collection saved.');
 if(action==='phone')collectionStartPhone();
 if(action==='phone-retry')collectionStartPhone();
 if(action==='phone-copy'&&collectionPhone?.url)navigator.clipboard.writeText(collectionPhone.url).then(()=>toast('Upload link copied.')).catch(()=>toast('Scan the QR code instead.'));
 if(action==='phone-close')collectionStopPhone();
});
document.addEventListener('click',event=>{if(collectionPhone&&event.target.closest('[data-action="close"]'))collectionStopPhone(false)});
document.addEventListener('change',event=>{if(event.target.id==='collection-files')collectionAddFiles(Array.from(event.target.files||[]))});
document.addEventListener('input',event=>{if(event.target.dataset.collectionName!==undefined)collectionState.name=event.target.value});
document.addEventListener('dragover',event=>{if(event.target.closest?.('#collection-dropzone'))event.preventDefault()});
document.addEventListener('drop',event=>{if(!event.target.closest?.('#collection-dropzone'))return;event.preventDefault();collectionAddFiles(Array.from(event.dataTransfer?.files||[]))});
