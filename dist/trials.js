'use strict';

function trialStudents(c){return alphabeticalIds([...c.groups.a,...c.groups.b])}
function trialVersion(c,id){return c.groups.b.includes(id)?'b':'a'}
function trialVersionName(c,v){return `${v==='a'?'Original':'Modified'} · ${c.lesson[v]}`}
function trialStart(c){return c.start||c.started||TODAY}
function trialTarget(c){return c.checksPerStudent||Math.max(1,Math.ceil((Date.parse(c.review)-Date.parse(trialStart(c)))/604800000)*c.frequency)}
function trialLogs(c,id){return state.logs.filter(l=>l.comparison===c.id&&l.student===id&&l.phase!=='baseline'&&l.date>=trialStart(c))}
function trialBaseline(c,id){return state.logs.find(l=>l.comparison===c.id&&l.student===id&&l.phase==='baseline')?.score??c.baselines[id]??null}
function trialPhase(c){
 if(c.completedAt)return 'reviewed';
 if(!c.activatedAt)return 'ready';
 if(trialStart(c)>TODAY)return 'scheduled';
 if(c.review<=TODAY||trialStudents(c).every(id=>trialLogs(c,id).length>=trialTarget(c)))return 'review';
 return 'teaching';
}
function trialPhaseLabel(c){return {ready:'Ready to teach',scheduled:'Scheduled',teaching:'Teaching in progress',review:'Ready to review',reviewed:'Reviewed'}[trialPhase(c)]}
function initializeTrials(){let changed=false;for(const c of state.comparisons){if(c.activatedAt===undefined){c.activatedAt=state.logs.some(l=>l.comparison===c.id)?(c.started||TODAY)+'T12:00:00Z':null;changed=true;}c.start ||= c.started||TODAY;c.decisions ||= {};}if(changed)persist()}
function currentTeachingPlan(id,objective){
 return state.comparisons.filter(c=>c.activatedAt&&trialStart(c)<=TODAY&&c.objectiveIds[id]===objective&&trialStudents(c).includes(id)).sort((a,b)=>trialStart(b).localeCompare(trialStart(a))||b.activatedAt.localeCompare(a.activatedAt))[0]||null;
}
function studentTeachingPlan(s,o){
 if(!o)return '';const c=currentTeachingPlan(s.id,o.id);if(!c)return '';
 const version=c.decisions?.[s.id]||trialVersion(c,s.id);
 return `<p class="current-teaching-plan">Current lesson: <a href="#comparison/${c.id}">${esc(c.title)} · ${esc(version==='a'?'Original':'Modified')}</a><span>${c.completedAt?'Chosen '+formatDate(c.completedAt.slice(0,10)):'Review '+formatDate(c.review)}</span></p>`;
}
function trialScope(c){
 const phase=trialPhase(c),ids=trialStudents(c),current=ids.filter(id=>currentTeachingPlan(id,c.objectiveIds[id])?.id===c.id).length;
 const superseded=c.activatedAt&&trialStart(c)<=TODAY&&current<ids.length;
 return `<div class="trial-scope"><h3>${phase==='ready'?'When this plan takes over':'What this plan changes'}</h3><p>${superseded?`This plan is current for ${current} of ${ids.length} students. The other students have a newer teaching plan.`:phase==='ready'?`Start teaching to make the assigned lessons current from ${formatDate(trialStart(c))}.`:phase==='scheduled'?`The assigned lessons become current on ${formatDate(trialStart(c))}.`:c.completedAt?'The lesson chosen at review is now current for each student.':`The assigned lessons are current from ${formatDate(trialStart(c))} until you review the plan.`} This applies to ${esc(domainNames[c.lesson.domain].toLowerCase())} practice for these ${trialStudents(c).length} students. IEP goals, progress history, and usual accommodations stay in place.</p></div>`;
}
function teachingPlanSetup(){
 cohort=(lesson.studentIds||[]).filter(id=>eligibleStudents().some(s=>s.id===id));
 return `<div class="two-col"><section class="card card-pad"><div class="section-row"><div><h2>Assign a lesson to each student</h2><p>${cohort.length} selected students · ${gradeLabel(lesson.grade)}</p></div><button class="text-btn" data-action="studio-step" data-value="1">Change students</button></div><p class="section-description">Each student uses one lesson throughout the plan.</p><div class="section-row top-space">${btn(icon('shuffle')+(groups.a.length?'Shuffle students again':'Assign students randomly'),'randomize','',cohort.length<2?'disabled':'')}</div>${cohort.length<2?'<p class="caption">Select at least two students in step 1.</p>':''}<div id="groups-panel">${groupPanels()}</div></section><form class="card card-pad" id="comparison-form"><div class="card-head"><h2>Teaching schedule</h2></div><div class="field"><label for="measure">What will you check?</label><textarea id="measure" name="measure" required rows="2">${esc(lessonDefaults[lesson.domain].measure)}</textarea></div><div class="field"><label for="frequency">Progress checks per student</label><select id="frequency" name="frequency"><option value="3">3 times per week</option><option value="2">2 times per week</option></select></div><div class="field-row"><div class="field"><label for="plan-start">Start teaching</label><input id="plan-start" name="start" type="date" min="${TODAY}" value="${TODAY}" required></div><div class="field"><label for="review-date">Review results</label><input id="review-date" name="review" type="date" min="${datePlus(1)}" value="${datePlus(14)}" required></div></div><p class="caption" id="window-suggestion">2 weeks · 6 checks per student · Decide what to continue at review.</p><details class="disclosure"><summary>Starting results</summary><div class="field"><label for="comparison-baseline">Compare progress against</label><select id="comparison-baseline" name="baseline"><option value="recent">Latest result for the same objective</option><option value="new">A new starting check</option></select></div></details><div id="comparison-error"></div><div class="form-foot"><button type="button" class="text-btn" data-action="studio-step" data-value="2">Back to lessons</button><button class="btn primary" type="submit" ${cohort.length<2?'disabled':''}>Create teaching plan</button></div></form></div>`;
}
function updateTrialScheduleHint(){
 const start=document.getElementById('plan-start')?.value,review=document.getElementById('review-date')?.value,frequency=+document.getElementById('frequency')?.value;
 const days=(Date.parse(review)-Date.parse(start))/86400000;
 const text=days>0?`${days} days · ${Math.ceil(days/7)*frequency} checks per student · Decide what to continue at review.`:'Choose a review date after the teaching start.';
 document.getElementById('window-suggestion').textContent=text;
}
function trialView(id){
 if(id==='sample')return sampleResultView();
 const c=state.comparisons.find(c=>c.id===id);if(!c)return '<div class="empty"><h2>Teaching plan not found</h2><a class="btn" href="#studio">Back to Generate assignments</a></div>';
 const ids=trialStudents(c),phase=trialPhase(c),target=trialTarget(c),done=ids.filter(id=>trialLogs(c,id).length>=target).length;
 const next={ready:['Start with the assigned lessons',`Open and print each lesson below. Begin on ${formatDate(trialStart(c))}, then collect ${c.frequency} quick progress checks per student each week.`],scheduled:['Your teaching plan is scheduled',`Use each student’s assigned lesson from ${formatDate(trialStart(c))}. Collect ${c.frequency} quick progress checks per student each week.`],teaching:['Teach, then record a quick check',`Use the assigned lesson. After teaching, record independent correct answers out of total opportunities. Aim for ${target} checks per student by ${formatDate(c.review)}.`],review:['Decide what to teach next',`${done} of ${ids.length} students have ${target} checks. Compare each student’s progress and choose the lesson to continue.`],reviewed:['Instruction choices saved','Each student’s chosen lesson is listed below. You can reopen the review to change a choice.']}[phase];
 const main=phase==='ready'?btn(trialStart(c)>TODAY?'Schedule teaching plan':'Start teaching plan','activate-trial','primary',`data-id="${c.id}"`):phase==='teaching'?btn('Record class progress','class-progress','primary',`data-id="${c.id}"`):phase==='review'?btn('Review student results','review-trial','primary',`data-id="${c.id}"`):phase==='reviewed'?btn('Review choices','review-trial','',`data-id="${c.id}"`):'';
 return `<a href="#studio" class="back" data-action="back-comparisons">${icon('back')}Teaching plans</a><div class="page-head"><div><h1>${esc(c.title)}</h1><p class="subtitle">${gradeLabel(c.lesson.grade)} · ${ids.length} students · ${trialPhaseLabel(c)}</p></div></div>
 <div class="content-column trial-page"><section class="trial-next"><div class="guidance-kicker">${phase==='reviewed'?'Completed':'Next step'}</div><h2>${next[0]}</h2><p>${next[1]}</p><div class="actions">${main}${phase==='ready'&&c.baseline==='new'?btn('Record starting results','class-progress','',`data-id="${c.id}"`):''}${phase==='review'?btn('Add more progress','class-progress','',`data-id="${c.id}"`):''}</div></section>
 <ol class="trial-timeline" aria-label="Teaching plan timeline"><li><span>Start teaching</span><strong>${formatDate(trialStart(c))}</strong><small>${phase==='ready'?'After you start the plan':'Assigned lessons take over'}</small></li><li><span>Collect progress</span><strong>${c.frequency} checks / week</strong><small>${target} checks per student</small></li><li><span>Review together</span><strong>${formatDate(c.review)}</strong><small>Planned decision date</small></li></ol>
 ${trialScope(c)}
 <section class="content-section trial-lessons"><div class="section-row"><h2>Lessons to teach</h2><span class="caption no-margin">Same content · One instructional change</span></div>${['a','b'].map(v=>`<div class="trial-lesson-row"><div><h3>${v==='a'?'Original lesson':'Modified lesson'}</h3><p>${esc(c.lesson[v])}${v==='b'?' · '+esc(c.lesson.change):''}</p></div>${btn('Open lesson','trial-lesson','',`data-id="${c.id}" data-version="${v}"`)}</div>`).join('')}</section>
 <section class="content-section"><div class="section-row"><h2>${c.completedAt?'What each student will use':'What each student should use'}</h2><span class="caption no-margin">${done} of ${ids.length} students have ${target} checks</span></div><div class="table-wrap"><table class="compact-table trial-roster"><thead><tr><th>Student</th><th>Assigned lesson</th><th>Progress checks</th><th>Latest result</th><th></th></tr></thead><tbody>${ids.map(id=>{const s=getStudent(id),logs=trialLogs(c,id),v=c.decisions?.[id]||trialVersion(c,id);return `<tr><td><a href="#student/${id}" class="student-name">${avatar(s,'tiny')}<span>${esc(s.name)}</span></a></td><td><strong>${v==='a'?'Original':'Modified'}</strong><small>${esc(c.lesson[v])}</small></td><td>${logs.length} / ${target}<span class="trial-check-track"><i style="width:${Math.min(logs.length/target,1)*100}%"></i></span></td><td>${logs.length?logs[0].score+'%':'Not recorded'}</td><td>${c.activatedAt&&trialStart(c)<=TODAY&&!c.completedAt?`<button class="text-btn" data-action="trial-record-student" data-id="${id}" data-comparison="${c.id}">Record</button>`:''}</td></tr>`}).join('')}</tbody></table></div></section>
 <details class="disclosure"><summary>Measurement and review</summary><p>Collect: ${esc(c.measure)}</p><p>At the ${formatDate(c.review)} review, compare progress for each student. You choose which lesson becomes their ongoing instruction.</p><p>Starting results: ${ids.map(id=>esc(getStudent(id).name)+' '+(trialBaseline(c,id)===null?'not recorded':trialBaseline(c,id)+'%')).join(' · ')}</p>${!c.completedAt?btn('Change dates','trial-dates','',`data-id="${c.id}"`):''}</details></div>`;
}
function activateTrial(id){
 const c=state.comparisons.find(c=>c.id===id);if(!c)return;
 if(c.review<=TODAY){trialDatesModal(id);toast('Choose a future review date before starting.');return;}
 c.start=trialStart(c)<TODAY?TODAY:trialStart(c);c.activatedAt=new Date().toISOString();persist();render();toast(c.start>TODAY?'Teaching plan scheduled.':'Teaching plan started. Assigned lessons are now current.');
}
function trialLessonModal(id,version){
 const c=state.comparisons.find(c=>c.id===id);if(!c||!['a','b'].includes(version))return;
 openModal(version==='a'?'Original lesson':'Modified lesson',alphabeticalIds(c.groups[version]).map(id=>getStudent(id).name).join(', '),`${worksheet(version,true,c.lesson)}<div class="modal-foot">${btn('Close','close')}${btn(icon('print')+'Print lesson','print','primary')}</div>`,{wide:true,printable:true});
}
function openClassProgress(id){
 const c=state.comparisons.find(c=>c.id===id);if(!c)return;
 if((!c.activatedAt||trialStart(c)>TODAY)&&c.baseline!=='new')return toast('Start teaching the plan before collecting progress.');
 const ids=trialStudents(c),todayCount=ids.filter(id=>trialLogs(c,id).some(l=>l.date===TODAY)).length;
 openModal('Record class progress',`${c.title} · ${todayCount} of ${ids.length} recorded today`, `<p class="class-record-intro">Choose a student to upload, scan, or enter progress.</p><div class="class-record-list">${ids.map(id=>{const s=getStudent(id),logs=trialLogs(c,id),recorded=logs.some(l=>l.date===TODAY);return `<div class="class-record-student">${avatar(s)}<div><strong>${esc(s.name)}</strong><small>${trialVersion(c,id)==='a'?'Original':'Modified'} lesson · ${logs.length} / ${trialTarget(c)} checks${recorded?' · Recorded today':''}</small></div>${btn(recorded?'Add another':'Record','trial-record-student','small',`data-id="${id}" data-comparison="${c.id}"`)}</div>`}).join('')}</div><div class="modal-foot">${btn('Done','close')}${btn('Enter scores together','class-scores','primary',`data-id="${c.id}"`)}</div>`,{wide:true});
}
function classScoresModal(id){
 const c=state.comparisons.find(c=>c.id===id);if(!c)return;
 openModal('Enter class scores',c.title,`<form id="class-scores-form"><input type="hidden" name="comparison" value="${c.id}"><div class="field"><label for="class-score-date">Check date</label><input id="class-score-date" type="date" name="date" value="${TODAY}" max="${TODAY}" required></div><div class="field"><label for="class-score-phase">Record</label><select id="class-score-phase" name="phase"><option value="followup">Progress checks during this plan</option><option value="baseline" ${c.baseline==='new'&&trialStudents(c).some(id=>trialBaseline(c,id)===null)?'selected':''}>Starting results</option></select></div><p class="class-record-intro">Count independent answers. Leave unobserved students blank.</p><div class="table-wrap"><table class="compact-table class-score-table"><thead><tr><th>Student</th><th>Correct</th><th>Out of</th><th>Extra support</th></tr></thead><tbody>${trialStudents(c).map(id=>`<tr><td><strong>${esc(getStudent(id).name)}</strong><small>${trialVersion(c,id)==='a'?'Original':'Modified'} lesson</small></td><td><input type="number" name="correct-${id}" min="0" max="100" placeholder="—" aria-label="${esc(getStudent(id).name)} independent correct answers"></td><td><input type="number" name="attempts-${id}" min="1" max="100" value="5" aria-label="${esc(getStudent(id).name)} total opportunities"></td><td><select name="support-${id}" aria-label="${esc(getStudent(id).name)} additional support"><option value="independent">None</option><option value="verbal">Verbal prompts</option><option value="guided">Guided support</option></select></td></tr>`).join('')}</tbody></table></div><div id="class-scores-error" aria-live="polite"></div><div class="modal-foot">${btn('Back','class-progress','',`data-id="${c.id}"`)}<button class="btn primary" type="submit">Save class progress</button></div></form>`,{wide:true});
}
function saveClassScores(d){
 const c=state.comparisons.find(c=>c.id===d.comparison);if(!c)return;
 if(d.phase!=='baseline'&&(!c.activatedAt||d.date<trialStart(c)))return formError('class-scores-error','Start teaching before entering progress checks, or record starting results.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||Number.isNaN(Date.parse(d.date))||d.date>TODAY)return formError('class-scores-error','Choose a date within the teaching period, on or before today.');
 const records=[];
 for(const id of trialStudents(c)){
  const value=d['correct-'+id];if(value===undefined||value.trim()==='')continue;
  const correct=+value,attempts=+d['attempts-'+id],o=lessonObjectiveOptions(id,c.lesson.domain).find(o=>o.id===c.objectiveIds[id]);
  if(!o)return formError('class-scores-error',`Review the IEP objective for ${getStudent(id).name} first.`);
  if(!Number.isInteger(correct)||!Number.isInteger(attempts)||attempts<1||attempts>100||correct<0||correct>attempts)return formError('class-scores-error',`Check the score for ${getStudent(id).name}. Correct answers cannot exceed the total.`);
  records.push({id:uid('log'),student:id,goal:o.goalId,objective:o.id,comparison:c.id,date:d.date,correct,attempts,score:Math.round(correct/attempts*100),support:d['support-'+id]==='verbal'?'Verbal prompts on other opportunities':d['support-'+id]==='guided'?'Guided support on other opportunities':'No extra help',entryMethod:'manual',phase:d.phase==='baseline'?'baseline':'followup',attachments:[],note:''});
 }
 if(!records.length)return formError('class-scores-error','Enter a score for at least one student.');
 const previous=state.logs;state.logs=[...records,...previous];if(!persist()){state.logs=previous;return formError('class-scores-error','Progress could not be saved. Browser storage may be full.');}
 closeModal();render();toast(`Progress saved for ${records.length} ${records.length===1?'student':'students'}.`);
}
function trialDatesModal(id){
 const c=state.comparisons.find(c=>c.id===id);if(!c)return;
 openModal('Teaching dates',c.title,`<form id="trial-dates-form"><input type="hidden" name="comparison" value="${id}"><div class="field-row"><div class="field"><label for="trial-start">Start teaching</label><input id="trial-start" type="date" name="start" value="${trialStart(c)}" ${c.activatedAt?'readonly':`min="${TODAY}"`} required></div><div class="field"><label for="trial-review">Review results</label><input id="trial-review" type="date" name="review" value="${c.review}" min="${datePlus(1)}" required></div></div><div id="trial-dates-error"></div><div class="modal-foot">${btn('Cancel','close')}<button class="btn primary" type="submit">Save dates</button></div></form>`);
}
function reviewTrialModal(id){
 const c=state.comparisons.find(c=>c.id===id);if(!c)return;
 openModal('Choose the next lesson',`Review planned for ${formatDate(c.review)} · ${c.title}`,`<form id="trial-review-form"><input type="hidden" name="comparison" value="${id}"><p class="class-record-intro">Choose what each student will use after this review.</p><div class="table-wrap"><table class="compact-table trial-review-table"><thead><tr><th>Student</th><th>Starting result</th><th>Latest result</th><th>Next lesson</th></tr></thead><tbody>${trialStudents(c).map(id=>{const logs=trialLogs(c,id),baseline=trialBaseline(c,id);return `<tr><td><strong>${esc(getStudent(id).name)}</strong><small>${logs.length} / ${trialTarget(c)} checks · ${trialVersion(c,id)==='a'?'Original':'Modified'} lesson</small></td><td>${baseline===null?'Not recorded':baseline+'%'}</td><td>${logs.length?logs[0].score+'%':'Not recorded'}</td><td><select name="choice-${id}" aria-label="Next lesson for ${esc(getStudent(id).name)}" required><option value="">Choose lesson</option><option value="a" ${c.decisions?.[id]==='a'?'selected':''}>Original lesson</option><option value="b" ${c.decisions?.[id]==='b'?'selected':''}>Modified lesson</option></select></td></tr>`}).join('')}</tbody></table></div><p class="caption">Choices become current for students still using this plan. Goals and accommodations continue.</p><div id="trial-review-error"></div><div class="modal-foot">${c.completedAt?btn('Close','close'):btn('Collect longer','trial-dates','',`data-id="${c.id}"`)}<button class="btn primary" type="submit">Save instruction choices</button></div></form>`,{wide:true});
}
function handleTrialSubmit(form,d){
 if(form.id==='class-scores-form'){saveClassScores(d);return true;}
 if(form.id==='trial-dates-form'){
  const c=state.comparisons.find(c=>c.id===d.comparison);if(!c)return true;
  if(!d.start||!d.review||d.review<=d.start||d.review<=TODAY||(!c.activatedAt&&d.start<TODAY))return formError('trial-dates-error','Choose a start date and a later review date.');
  if(!c.activatedAt)c.start=d.start;c.review=d.review;delete c.checksPerStudent;c.completedAt=null;c.decisions={};persist();closeModal();render();toast('Teaching dates updated.');return true;
 }
 if(form.id==='trial-review-form'){
  const c=state.comparisons.find(c=>c.id===d.comparison);if(!c)return true;
  if(trialStudents(c).some(id=>!['a','b'].includes(d['choice-'+id])))return formError('trial-review-error','Choose a next lesson for each student.');
  c.decisions=Object.fromEntries(trialStudents(c).map(id=>[id,d['choice-'+id]]));c.completedAt=new Date().toISOString();persist();closeModal();render();toast('Instruction choices saved for every student.');return true;
 }
 return false;
}
function handleTrialAction(action,el){
 const {id,version,comparison}=el.dataset;
 if(action==='activate-trial'){activateTrial(id);return true;}
 if(action==='trial-lesson'){trialLessonModal(id,version);return true;}
 if(action==='class-progress'){openClassProgress(id);return true;}
 if(action==='class-scores'){classScoresModal(id);return true;}
 if(action==='trial-record-student'){openProgressModal(id,comparison);if(progressCapture)progressCapture.returnToClass=true;return true;}
 if(action==='trial-dates'){trialDatesModal(id);return true;}
 if(action==='review-trial'){reviewTrialModal(id);return true;}
 return false;
}
