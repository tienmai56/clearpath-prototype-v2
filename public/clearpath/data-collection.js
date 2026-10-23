'use strict';

const DATA_COLLECTION_KEY='clearpath-data-collection-v1';
const durationTimes=['8:00','8:15','8:30','8:45','9:00','9:15'];
const durationCodes=['','●','VB','VS','PP'];
const responseCodes=['','+','−','VB','VS','PP','NR'];

function initialCollectionData(){return {
 view:'library',saved:false,
 duration:{student:'Eli T.',behavior:'Leaving assigned area',date:'2026-10-09',notes:'Behavior followed the transition to independent work. The visual schedule was effective after the second prompt.',cells:{'1-2':'●','2-1':'VB','3-4':'●','4-3':'VS'}},
 goals:{student:'Maya R.',teacher:'Ms. Rivera',date:'2026-10-09',notes:'Accuracy increased with a visual cue. Fade the cue during the next session.',items:[
  {id:'goal-reading',text:'Read multisyllabic words with 80% accuracy',trials:['+','+','+','+','VB']},
  {id:'goal-work',text:'Begin independent work within 2 minutes',trials:['+','VS','+','−','+']},
  {id:'goal-break',text:'Request a break using an appropriate phrase',trials:['+','+','PP','NR','+']}
 ]},
 recent:[
  {id:'sample-duration',type:'duration',student:'Eli T.',detail:'Leaving assigned area',status:'Draft',date:'Oct 9'},
  {id:'sample-goals',type:'goals',student:'Maya R.',detail:'Reading + independence',status:'Complete',date:'Oct 8'},
  {id:'sample-on-task',type:'duration',student:'Sofia P.',detail:'On-task behavior',status:'Complete',date:'Oct 7'}
 ]
}}

let collectionData;
try{const stored=JSON.parse(localStorage.getItem(DATA_COLLECTION_KEY));collectionData=stored?.duration&&stored?.goals?{...initialCollectionData(),...stored,view:'library'}:initialCollectionData()}catch{collectionData=initialCollectionData()}

function collectionPersist(){try{localStorage.setItem(DATA_COLLECTION_KEY,JSON.stringify(collectionData));return true}catch{return false}}
function collectionAccuracy(trials){return Math.round(trials.filter(mark=>mark==='+').length/trials.length*100)}
function cycleCollectionCode(current,codes){const index=codes.indexOf(current||'');return codes[(index+1)%codes.length]}
function collectionTemplatePreview(type){if(type==='duration')return `<div class="collection-preview-paper"><div class="collection-preview-title">Behavior duration</div><div class="collection-preview-fields"><i></i><i></i></div><div class="collection-preview-grid duration">${Array.from({length:54},()=>'<i></i>').join('')}</div><div class="collection-preview-foot"><span>Total minutes</span><span>Prompts</span></div></div>`;return `<div class="collection-preview-paper"><div class="collection-preview-title">Multiple goal data</div><div class="collection-preview-fields"><i></i><i></i></div><div class="collection-preview-goals">${Array.from({length:3},()=>`<div><strong>Goal / objective</strong><span>${Array.from({length:12},()=>'<i></i>').join('')}</span></div>`).join('')}</div></div>`}

function collectionLibrary(){return `<section class="collection-page" aria-labelledby="collection-heading">
 <div class="page-head"><div><h1 id="collection-heading">Collect data</h1><p class="subtitle">Choose a familiar data sheet and record a session as it happens.</p></div><button class="btn" data-collection-action="print">${icon('print')}Print blank sheet</button></div>
 <div class="collection-intro"><div class="collection-intro-icon">${icon('collect')}</div><div><h2>Choose a structure for today’s observation</h2><p>Entries stay editable until you save the collection sheet.</p></div><span class="collection-private">Private draft</span></div>
 <div class="collection-template-grid">
  ${collectionTemplateCard('duration','Behavior duration','Duration + prompts','Track when a behavior occurs across time blocks, including verbal, visual, and physical prompts.')}
  ${collectionTemplateCard('goals','Multiple goal data sheet','Several goals','Collect trial-by-trial performance for several objectives on one student-friendly session sheet.')}
 </div>
 <section class="collection-recent" aria-labelledby="recent-collection-heading"><div class="section-row"><div><h2 id="recent-collection-heading">Recent collection sheets</h2><p>Continue a draft or review a completed session.</p></div></div><div class="collection-recent-grid">${collectionData.recent.map(collectionRecentCard).join('')}</div></section>
 </section>`}

function collectionTemplateCard(type,title,tag,description){return `<article class="collection-template card"><div class="collection-preview">${collectionTemplatePreview(type)}</div><div class="collection-template-body"><div class="collection-template-meta"><span class="collection-template-icon">${icon(type==='duration'?'clock':'collect')}</span><span class="collection-tag">${tag}</span></div><h2>${title}</h2><p>${description}</p><button class="btn primary full" data-collection-action="open" data-template="${type}">Use this layout ${icon('arrow')}</button></div></article>`}
function collectionRecentCard(item){return `<button class="collection-recent-card card" data-collection-action="open" data-template="${item.type}"><span class="collection-recent-top"><span class="collection-template-icon">${icon(item.type==='duration'?'clock':'collect')}</span><span class="collection-status ${item.status==='Draft'?'draft':''}">${item.status}</span></span><strong>${esc(item.student)}</strong><span>${item.type==='duration'?'Behavior duration':'Multiple goal data sheet'} · ${esc(item.detail)}</span><small>${item.date} · ${item.status==='Draft'?'Continue sheet':'Review session'} ${icon('arrow')}</small></button>`}

function collectionHeader(title,description){return `<div class="collection-sheet-head"><div><button class="back" data-collection-action="back">${icon('back')}Collection layouts</button><h1>${title}</h1><p class="subtitle">${description}</p></div><div class="actions"><button class="btn" data-collection-action="print">${icon('print')}Print</button><button class="btn primary" data-collection-action="save">${icon('save')}${collectionData.saved?'Saved':'Save sheet'}</button></div></div>`}
function collectionLegend(items){return `<div class="collection-legend">${items.map(([mark,label])=>`<span><b>${mark}</b>${label}</span>`).join('')}</div>`}
function durationTotals(){const entries=Object.values(collectionData.duration.cells).filter(Boolean);return {minutes:entries.filter(mark=>mark==='●').length*5,prompts:entries.filter(mark=>['VB','VS','PP'].includes(mark)).length,observed:entries.filter(mark=>mark==='●').length}}

function behaviorDurationView(){const data=collectionData.duration,totals=durationTotals();return `<section class="collection-page collection-sheet-page" aria-labelledby="duration-heading">
 ${collectionHeader('Behavior duration','Tap a cell to cycle through observed behavior and prompt types.')}
 <div class="collection-sheet card">
  <div class="collection-sheet-band"><div><span>Live collection</span><h2 id="duration-heading">Behavior duration</h2></div>${collectionLegend([['●','Observed'],['VB','Verbal'],['VS','Visual'],['PP','Physical']])}</div>
  <div class="collection-fields"><label>Student<input data-collection-field="duration.student" value="${esc(data.student)}"></label><label>Target behavior<input data-collection-field="duration.behavior" value="${esc(data.behavior)}"></label><label>Date<input type="date" data-collection-field="duration.date" value="${data.date}"></label></div>
  <div class="collection-table-wrap"><table class="collection-table duration-table"><caption class="sr-only">Behavior duration observation grid</caption><thead><tr><th>Time</th>${Array.from({length:10},(_,i)=>`<th>${i+1}</th>`).join('')}<th>Minutes</th><th>Prompts</th></tr></thead><tbody>${durationTimes.map((time,row)=>durationRow(time,row,data.cells)).join('')}</tbody><tfoot><tr><th colspan="11">Session total</th><td>${totals.minutes} min</td><td>${totals.prompts}</td></tr></tfoot></table></div>
  <div class="collection-summary-grid"><label class="collection-notes">Context and observation notes<textarea data-collection-field="duration.notes">${esc(data.notes)}</textarea></label><aside class="collection-summary"><span>Live summary</span><strong>${totals.minutes} min</strong><p>Observed across ${totals.observed} ${totals.observed===1?'interval':'intervals'}</p><div><span>Prompts delivered</span><b>${totals.prompts}</b></div></aside></div>
 </div></section>`}

function durationRow(time,row,cells){const entries=Array.from({length:10},(_,column)=>cells[`${row}-${column}`]||'');const minutes=entries.filter(mark=>mark==='●').length*5,prompts=entries.filter(mark=>['VB','VS','PP'].includes(mark)).length;return `<tr><th>${time}</th>${entries.map((mark,column)=>`<td><button class="collection-cell ${mark==='●'?'observed':mark?'prompt':''}" data-collection-action="duration-cell" data-key="${row}-${column}" aria-label="${time}, interval ${column+1}: ${mark||'empty'}">${mark||'·'}</button></td>`).join('')}<td class="collection-total">${minutes}</td><td class="collection-total">${prompts}</td></tr>`}

function multipleGoalsView(){const data=collectionData.goals,totalCorrect=data.items.reduce((sum,item)=>sum+item.trials.filter(mark=>mark==='+').length,0),totalTrials=data.items.reduce((sum,item)=>sum+item.trials.length,0),accuracy=Math.round(totalCorrect/totalTrials*100);return `<section class="collection-page collection-sheet-page" aria-labelledby="goals-sheet-heading">
 ${collectionHeader('Multiple goal data sheet','Tap each trial to cycle through correct, incorrect, prompt, or no-response codes.')}
 <div class="collection-sheet card">
  <div class="collection-sheet-band"><div><span>Live collection</span><h2 id="goals-sheet-heading">Multiple goal data sheet</h2></div>${collectionLegend([['+','Correct'],['−','Incorrect'],['VB','Verbal'],['VS','Visual'],['PP','Physical'],['NR','No response']])}</div>
  <div class="collection-fields"><label>Student<input data-collection-field="goals.student" value="${esc(data.student)}"></label><label>Teacher<input data-collection-field="goals.teacher" value="${esc(data.teacher)}"></label><label>Session date<input type="date" data-collection-field="goals.date" value="${data.date}"></label></div>
  <div class="goal-collection-list">${data.items.map(goalCollectionBlock).join('')}</div>
  <button class="btn collection-add-goal" data-collection-action="add-goal">${icon('plus')}Add another goal</button>
  <div class="collection-summary-grid"><label class="collection-notes">Session notes<textarea data-collection-field="goals.notes">${esc(data.notes)}</textarea></label><aside class="collection-summary"><span>Session snapshot</span><strong>${accuracy}%</strong><p>${totalCorrect} of ${totalTrials} trials marked +</p><div><span>Goals observed</span><b>${data.items.length}</b></div></aside></div>
  <p class="collection-scoring-note"><strong>Scoring rule:</strong> Only “+” counts as correct. Every other mark, including a blank trial, counts as not correct.</p>
 </div></section>`}

function goalCollectionBlock(item,index){const score=collectionAccuracy(item.trials);return `<section class="goal-collection-block"><label><span>Goal / objective ${index+1}</span><textarea data-collection-goal="${index}">${esc(item.text)}</textarea></label><div class="collection-table-wrap"><table class="collection-table goal-trial-table"><caption class="sr-only">Trial data for goal ${index+1}</caption><thead><tr><th>Date</th>${item.trials.map((_,i)=>`<th>${i+1}</th>`).join('')}<th>Score</th></tr></thead><tbody><tr><th>${collectionData.goals.date.slice(5).replace('-','/')}</th>${item.trials.map((mark,trial)=>`<td><button class="collection-cell ${mark==='+'?'correct':mark?'prompt':''}" data-collection-action="goal-cell" data-goal="${index}" data-trial="${trial}" aria-label="Goal ${index+1}, trial ${trial+1}: ${mark||'blank'}">${mark||'·'}</button></td>`).join('')}<td class="collection-score"><strong>${score}%</strong><small>${item.trials.filter(mark=>mark==='+').length}/${item.trials.length}</small></td></tr></tbody></table></div></section>`}

function dataCollectionView(){return collectionData.view==='duration'?behaviorDurationView():collectionData.view==='goals'?multipleGoalsView():collectionLibrary()}

document.addEventListener('click',event=>{const button=event.target.closest('[data-collection-action]');if(!button)return;event.preventDefault();const action=button.dataset.collectionAction;
 if(action==='open'){collectionData.view=button.dataset.template;collectionData.saved=false;render();window.scrollTo(0,0)}
 if(action==='back'){collectionData.view='library';collectionData.saved=false;render();window.scrollTo(0,0)}
 if(action==='print')window.print();
 if(action==='duration-cell'){const key=button.dataset.key;collectionData.duration.cells[key]=cycleCollectionCode(collectionData.duration.cells[key],durationCodes);collectionData.saved=false;render()}
 if(action==='goal-cell'){const goal=collectionData.goals.items[+button.dataset.goal];goal.trials[+button.dataset.trial]=cycleCollectionCode(goal.trials[+button.dataset.trial],responseCodes);collectionData.saved=false;render()}
 if(action==='add-goal'){collectionData.goals.items.push({id:'goal-'+Date.now(),text:'New goal or objective',trials:['','','','','']});collectionData.saved=false;render()}
 if(action==='save'){collectionData.saved=true;const isDuration=collectionData.view==='duration',source=isDuration?collectionData.duration:collectionData.goals;collectionData.recent=collectionData.recent.filter(item=>item.id!=='saved-'+collectionData.view);collectionData.recent.unshift({id:'saved-'+collectionData.view,type:collectionData.view,student:source.student||'Untitled student',detail:isDuration?source.behavior:`${source.items.length} goals`,status:'Complete',date:'Today'});collectionPersist();render();toast('Collection sheet saved.')}
});

document.addEventListener('input',event=>{const field=event.target.dataset.collectionField;if(field){const [section,key]=field.split('.');collectionData[section][key]=event.target.value;collectionData.saved=false}if(event.target.dataset.collectionGoal!==undefined){collectionData.goals.items[+event.target.dataset.collectionGoal].text=event.target.value;collectionData.saved=false}});
