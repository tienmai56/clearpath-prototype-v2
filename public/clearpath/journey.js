'use strict';


function initializeJourneys(){state.interventions ||= [];}
function chronologicalGoals(id){return goalPlansFor(id).slice().sort((a,b)=>(a.deadline||'9999').localeCompare(b.deadline||'9999'));}
function chronologicalMilestones(g){return (g?.objectives||[]).slice().sort((a,b)=>(a.deadline||'9999').localeCompare(b.deadline||'9999'));}
function focusMilestone(s,g){
 const list=chronologicalMilestones(g),open=list.filter(o=>!o.completedAt);
 return open.find(o=>o.id===g?.currentObjectiveId)||open.find(o=>o.sample)||open.find(o=>o.status==='approved')||open[0]||list[list.length-1]||null;
}
function focusGoal(s){const goals=chronologicalGoals(s.id);return goals.find(g=>!goalAchieved(g))||goals[0]||null;}
function milestoneEvidence(s,o){
 if(!o)return [];
 const dates=['2026-09-04','2026-09-11','2026-09-18','2026-09-25','2026-10-02','2026-10-09'];
 const sample=o.sample?s.points.map((score,i)=>({id:'sample-check-'+s.id+'-'+i,student:s.id,objective:o.id,score,date:s.status==='evidence'?['2026-09-02','2026-09-09','2026-09-16','2026-09-23',s.id==='jayden'?'2026-09-30':'2026-10-01'][i]:dates[i],sample:true,support:'No extra help',strategy:'',note:''})):[];
 return [...sample,...objectiveLogs(s.id,o.id).slice().reverse()].filter(l=>Number.isFinite(l.score)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
}
function milestoneReady(s,o){const recent=milestoneEvidence(s,o).slice(-o.checks);return o.status==='approved'&&recent.length===o.checks&&recent.every(l=>l.score>=o.target);}
function milestoneState(s,g,o){
 if(o.completedAt)return {key:'complete',label:'Completed'};
 if(o.status!=='approved')return {key:'draft',label:'Needs approval'};
 if(milestoneReady(s,o))return {key:'ready',label:'Ready to confirm'};
 if(focusMilestone(s,g)?.id===o.id)return {key:'current',label:'Current focus'};
 return {key:'upcoming',label:milestoneEvidence(s,o).length?'Progress recorded':'No checks yet'};
}
function selectedJourney(s){
 const g=activeGoal(s.id),list=chronologicalMilestones(g);
 const o=list.find(o=>o.id===activeObjectiveIds[s.id])||focusMilestone(s,g);
 if(g)activeGoalIds[s.id]=g.id;if(o)activeObjectiveIds[s.id]=o.id;
 return {g,o};
}
function milestoneObservations(s,g,o){
 const isFocus=focusGoal(s)?.id===g.id&&focusMilestone(s,g)?.id===o.id;
 return notesFor(s).filter(n=>n.objective===o.id||(!n.objective&&!n.id.startsWith('sample-')&&(!n.goal||n.goal===g.id)&&isFocus)||(o.sample&&g.id==='goal-'+s.id&&n.id.startsWith('sample-')));
}
function legacyStrategy(log,s){
 const c=state.comparisons.find(c=>c.id===log.comparison&&c.objectiveIds?.[s.id]===log.objective);
 if(!c)return '';
 const version=c.groups?.b?.includes(s.id)?'b':'a';return c.lesson?.[version]||c.title||'';
}
function strategyResults(s,o){
 const groups=new Map();
 for(const log of milestoneEvidence(s,o)){
  const strategy=log.strategy?.trim()||legacyStrategy(log,s);if(!strategy)continue;
  const support=log.support||'No extra help',key=strategy.toLowerCase()+'|'+support;
  if(!groups.has(key))groups.set(key,{strategy,support,logs:[]});groups.get(key).logs.push(log);
 }
 return [...groups.values()].map(group=>{
  const first=group.logs[0],last=group.logs[group.logs.length-1],delta=last.score-first.score,n=group.logs.length;
  const status=n<2?'uncertain':delta>=10?'helping':delta<=-10?'difficulty':n>=3&&delta<10?'flat':'uncertain';
  return {...group,status,delta,first,last,summary:n<2?`${last.score}% · 1 check so far`:`${first.score}% → ${last.score}% across ${n} checks`};
 }).sort((a,b)=>b.last.date.localeCompare(a.last.date));
}
function interventionSummary(s,g,o){
 const groups=strategyResults(s,o),notes=milestoneObservations(s,g,o);
 const helped=groups.find(x=>x.status==='helping'),difficult=groups.find(x=>['difficulty','flat'].includes(x.status));
 const observation=pattern=>{for(const note of notes){const text=note.text.split(/(?<=[.!?])\s+|,\s+(?:but|then)\s+|\s+but\s+/).find(part=>pattern.test(part));if(text)return {...note,text:text.replace(/^./,c=>c.toUpperCase())};}return null;};
 const positive=observation(/helped|easier|longer|could explain|retold|clear idea|completed the calculation/i);
 const negative=observation(/harder|needed help|needed an adult|lost place|paused|difficult|distract/i);
 const line=(group,note,fallback)=>group?`<strong>${esc(group.strategy)}</strong><p>${group.summary}</p>`:note?`<p>${esc(note.text)}</p>`:`<p>${fallback}</p>`;
 return `<section class="milestone-learning"><div class="section-row"><h3>What we’re learning</h3></div><dl class="learning-summary"><div class="learning-item helping"><dt>What’s helping</dt><dd>${line(helped,positive,'No clear signal yet. Link a strategy to the next check.')}</dd></div><div class="learning-item difficult"><dt>Still difficult</dt><dd>${line(difficult,negative,'No difficulty recorded for this milestone yet.')}</dd></div></dl></section>`;
}
function interventionFor(id,oid){return (state.interventions||[]).filter(x=>x.student===id&&x.objective===oid&&!x.reviewedAt).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]||null;}
function teachingRecord(s,g,o){
 const checks=milestoneEvidence(s,o).map(l=>({kind:'check',date:l.date,record:l}));
 const notes=milestoneObservations(s,g,o).map(n=>({kind:'note',date:n.dateISO,record:n}));
 const interventions=(state.interventions||[]).filter(x=>x.student===s.id&&x.objective===o.id).map(x=>({kind:'plan',date:x.start||x.createdAt.slice(0,10),record:x}));
 const records=[...checks,...notes,...interventions].sort((a,b)=>b.date.localeCompare(a.date));
 return `<details class="teaching-record"><summary>Teaching record <span>${records.length} ${records.length===1?'entry':'entries'}</span>${icon('down')}</summary>${records.length?`<ol>${records.map(({kind,date,record:r})=>`<li><time datetime="${date}">${formatDate(date)}<small>${date.slice(0,4)}</small></time><div>${kind==='check'?`<div class="record-title"><strong>${esc(r.strategy||legacyStrategy(r,s)||'Progress check')}</strong><span>${r.score}%</span></div><p>${r.strategy||legacyStrategy(r,s)?esc(r.support||'No extra help'):'Strategy not recorded'}${r.sample?' · Sample check':''}</p>${r.note?`<p>${esc(r.note)}</p>`:''}${progressAttachments(r)}`:kind==='plan'?`<strong>${esc(r.title)}</strong><p>${r.reviewedAt?'Reviewed':'Planned'} · ${esc(r.step)}</p>`:`<strong>${esc(r.role)} observation</strong><p>${esc(r.text)}</p>`}</div></li>`).join('')}</ol>`:'<p class="muted">Record a check or add an observation to begin.</p>'}<button class="text-btn" data-action="milestone-note" data-id="${s.id}" data-goal="${g.id}" data-objective="${o.id}">+ Add an observation</button></details>`;
}
function milestoneDataCollected(s){
 const recent=typeof collectionState!=='undefined'&&collectionState.studentId===s.id?{method:(typeof collectionMethods!=='undefined'?collectionMethods.find(method=>method.id===collectionState.method)?.label:'')||'Accuracy',title:collectionState.name||'Data collection - Oct 23, 2026',file:collectionState.files?.[0]?.name||'Naturalistic group data sheet.pdf'}:null;
 const rows=[recent||{method:'Accuracy',title:'Data collection - Oct 23, 2026',file:'Naturalistic group data sheet.pdf'},{method:'Task completion',title:'Independent work - Oct 16, 2026',file:'Task completion data sheet.pdf'},{method:'Independence',title:'Classroom practice - Oct 9, 2026',file:'Independence data sheet.pdf'}];
 return `<section class="milestone-data-collected" aria-labelledby="milestone-data-heading"><div class="section-row"><h3 id="milestone-data-heading">Data collected</h3></div><div class="milestone-data-list">${rows.map(row=>`<article class="milestone-data-row"><span class="milestone-pdf-preview"><img src="/clearpath/naturalistic-data-sheet.jpg" alt=""><b>PDF</b></span><div><span class="milestone-data-method">${esc(row.method)}</span><h4>${esc(row.title)}</h4><p>${esc(row.file)}</p></div></article>`).join('')}</div></section>`;
}
function milestoneDetail(s,g,o){
 if(!o)return `<section id="milestone-detail" class="milestone-detail"><h2>Add the first stepping stone</h2><p class="section-description">Break this goal into smaller skills to track.</p>${btn('Add objective','add-objective','primary',`data-id="${s.id}" data-goal="${g.id}"`)}</section>`;
 const data=milestoneEvidence(s,o),latest=data[data.length-1];
 return `<section id="milestone-detail" class="milestone-detail" aria-labelledby="milestone-title" tabindex="-1"><div class="milestone-detail-head"><h2 id="milestone-title">${esc(o.skill)}</h2></div>${o.status!=='approved'?`<div class="milestone-draft"><p>Review this stepping stone before collecting progress.</p><div class="actions">${btn('Edit objective','edit-objective','',`data-id="${s.id}" data-goal="${g.id}" data-objective="${o.id}"`)}${btn('Approve objective','approve-objective','primary',`data-id="${s.id}" data-goal="${g.id}" data-objective="${o.id}"`)}</div></div>`:`<div class="milestone-progress">${interventionSummary(s,g,o)}<div class="milestone-result"><div><strong>${latest?latest.score+'%':'—'}</strong><span>${latest?'Latest independent accuracy':'No checks yet'}</span></div><div class="milestone-checks"><strong>${data.length}</strong><span>Data collected</span></div></div>${progressChart(s)}${milestoneDataCollected(s)}<div class="actions">${btn(icon('plus')+'Record progress','record-milestone','primary',`data-id="${s.id}" data-goal="${g.id}" data-objective="${o.id}"`)}${btn('View guidance','milestone-guidance','',`data-id="${s.id}" data-goal="${g.id}" data-objective="${o.id}"`)}</div>${!o.completedAt&&milestoneReady(s,o)?`<div class="milestone-ready"><p>${o.checks} consecutive checks meet the target.</p>${btn('Confirm milestone completed','complete-milestone','small',`data-id="${s.id}" data-goal="${g.id}" data-objective="${o.id}"`)}</div>`:''}</div>`}</section>`;
}
function journeyProgress(s){
 const {g,o}=selectedJourney(s);
 if(!g)return `<div class="empty-plan"><h2>Start with a goal</h2><p>Add a goal and the smaller skills that lead to it.</p>${btn('Add goal','add-goal','primary',`data-id="${s.id}"`)}</div>`;
 return `<div class="progress-journey">${milestoneDetail(s,g,o)}</div>`;
}
function currentInsight(s,g=focusGoal(s),o=focusMilestone(s,g)){
 if(!g||!o)return {key:'setup',priority:2,title:'Set the next learning goal',detail:'Add a goal and its stepping stones.'};
 const data=milestoneEvidence(s,o),latest=data[data.length-1],recent=data.slice(-3),delta=recent.length>1?latest.score-recent[0].score:0;
 if(o.status!=='approved')return {key:'draft',priority:2,title:'Review this milestone',detail:'Approve the objective before recording progress.'};
 if(milestoneReady(s,o)&&!o.completedAt)return {key:'ready',priority:0,title:'A milestone is ready to confirm',detail:`${o.checks} consecutive checks meet the ${o.target}% target.`};
 if(!latest)return {key:'evidence',priority:1,title:'Record a starting check',detail:'There is no progress evidence for this milestone yet.'};
 if((Date.parse(TODAY)-Date.parse(latest.date))/86400000>7)return {key:'evidence',priority:1,title:'Collect a fresh progress check',detail:`Last recorded ${formatDate(latest.date)} at ${latest.score}%.`};
 if(recent.length>=3&&latest.score<o.target&&delta<10)return {key:'support',priority:0,title:delta<0?'Recent results have dipped':'Progress is slowing',detail:`${recent.map(l=>l.score+'%').join(' → ')} across the last 3 checks.`};
 return {key:'track',priority:3,title:'Progress is moving forward',detail:`Latest result ${latest.score}% · Target ${o.target}%.`};
}
function guidanceForMilestone(s,g,o){
 if(!g||!o)return {...currentInsight(s,g,o),kind:'setup',s,g,o,title:'Set a learning goal',step:'Add the goal, then break it into smaller skills.',sources:[]};
 const insight=currentInsight(s,g,o),plan=interventionFor(s.id,o.id),data=milestoneEvidence(s,o),suggestions=guidanceRecommendations({...s,domain:g.domain},milestoneObservations(s,g,o));
 if(plan){const checks=data.filter(l=>l.intervention===plan.id),remaining=Math.max(0,3-checks.length);return {...insight,kind:'plan',s,g,o,plan,checks,remaining,title:remaining?plan.title:'Review: '+plan.title,step:remaining?`Record ${remaining} more ${remaining===1?'check':'checks'} to review this approach.`:'Compare the new results and decide what to continue.',sources:[]};}
 if(['setup','draft','ready','evidence'].includes(insight.key))return {...insight,kind:insight.key,s,g,o,step:insight.detail,sources:[]};
 const rec=suggestions[0];
 return {...insight,kind:rec||insight.key==='support'?'strategy':'check',s,g,o,title:rec?.title||(insight.key==='support'?'Adjust one support at a time':'Keep the approach consistent'),step:rec?.step||(insight.key==='support'?'Choose one support to change, keep the task comparable, and record what you try.':'Use the same task and supports for the next check, and record what you tried.'),sources:rec?.sources||[],basedOn:rec?'Notes suggest this next step.':'Based on the recorded checks.'};
}
function openMilestoneGuidance(s,g,o){
 const r=guidanceForMilestone(s,g,o),ids=`data-id="${s.id}" data-goal="${g?.id||''}" data-objective="${o?.id||''}"`;
 const go=r.kind==='setup'?btn('Add goal','add-goal','primary',`data-id="${s.id}"`):r.kind==='draft'?btn('Review milestone','guidance-to-milestone','primary',ids):r.kind==='ready'?btn('Review milestone','guidance-to-milestone','primary',ids):r.kind==='plan'&&r.remaining===0?btn('Mark review complete','review-intervention','primary',`${ids} data-intervention="${r.plan.id}"`):r.kind==='strategy'?btn('Try this approach','plan-milestone-guidance','primary',ids):btn('Record a check','record-milestone','primary',ids);
 const result=r.kind==='plan'&&r.checks.length?`<p class="guidance-evidence-line">${r.checks.map(l=>l.score+'%').join(' → ')} across ${r.checks.length} ${r.checks.length===1?'check':'checks'} using this approach${r.plan.baseline===null?'':` · Starting result ${r.plan.baseline}%`}.</p>`:'';
 openModal('Recommended guidance',s.name,`<div class="focused-guidance"><p class="guidance-target">${esc(g?.title||'Learning plan')}${o?`<span>${esc(o.skill)}</span>`:''}</p><div class="guidance-main"><span class="journey-eyebrow">${r.kind==='plan'?'Your selected approach':'Suggested next step'}</span><h3>${esc(r.title)}</h3><p>${esc(r.step)}</p>${result}</div><details class="guidance-reason"><summary>Why this guidance?</summary><p>${esc(r.detail||r.basedOn||r.step)}</p>${r.sources.length?r.sources.map(n=>`<blockquote><p>${esc(n.text)}</p><cite>${esc(n.role)} · ${formatDate(n.dateISO)}</cite></blockquote>`).join(''):'<p class="caption">Based on this milestone’s saved progress and review status.</p>'}<p class="caption">Review the suggestion before using it. Observations do not establish cause.</p></details><div class="modal-foot">${o?btn('View milestone','guidance-to-milestone','',ids):btn('Close','close')}${go}</div></div>`);
}
function selectMilestone(id,gid,oid,navigateTo=false){
 const g=findGoal(id,gid),o=g?.objectives.find(o=>o.id===oid);if(!g||!o)return false;
 activeGoalIds[id]=gid;activeObjectiveIds[id]=oid;studentTab='progress';
 navigate('student/'+id+'/'+gid+'/'+oid);return true;
}
function handleJourneyAction(action,el){
 const {id,goal:gid,objective:oid}=el.dataset,s=students.find(s=>s.id===id),g=findGoal(id,gid),o=g?.objectives.find(o=>o.id===oid);
 if(action==='select-milestone'||action==='guidance-to-milestone'){selectMilestone(id,gid,oid,action==='guidance-to-milestone');if(action==='select-milestone')setTimeout(()=>{const panel=document.getElementById('milestone-detail');panel?.focus({preventScroll:true});if(window.matchMedia?.('(max-width:760px)').matches)panel?.scrollIntoView({behavior:'smooth',block:'start'});},30);return true;}
 if(!s||!g||!o)return false;
 if(action==='milestone-guidance'){openMilestoneGuidance(s,g,o);return true;}
 if(action==='record-milestone'){activeGoalIds[id]=gid;activeObjectiveIds[id]=oid;openProgressModal(id);return true;}
 if(action==='milestone-note'){contextModal(id,gid,oid);return true;}
 if(action==='focus-milestone'||action==='complete-milestone'||action==='reopen-milestone'){
  if(action==='complete-milestone'&&!milestoneReady(s,o))return true;
  const before=structuredClone(g);
  if(action==='focus-milestone')g.currentObjectiveId=oid;
  else if(action==='reopen-milestone'){delete o.completedAt;g.currentObjectiveId=oid;g.status='active';g.achievedAt=null;}
  else{o.completedAt=new Date().toISOString();const next=chronologicalMilestones(g).find(x=>!x.completedAt&&x.status==='approved');g.currentObjectiveId=next?.id||'';if(g.objectives.every(x=>x.completedAt)){g.status='achieved';g.achievedAt=o.completedAt;}}
  if(!persist()){state.goalPlans[id]=state.goalPlans[id].map(x=>x.id===gid?before:x);return true;}
  render();toast(action==='complete-milestone'?'Milestone completed.':action==='reopen-milestone'?'Milestone reopened.':'Current focus updated.');return true;
 }
 if(action==='plan-milestone-guidance'){
  const r=guidanceForMilestone(s,g,o);if(r.kind!=='strategy')return true;
  const data=milestoneEvidence(s,o),plan={id:uid('intervention'),student:id,goal:gid,objective:oid,title:r.title,step:r.step,baseline:data.length?data[data.length-1].score:null,start:TODAY,createdAt:new Date().toISOString(),sourceIds:r.sources.map(n=>n.id),reviewedAt:null};
  state.interventions.unshift(plan);if(!persist()){state.interventions.shift();return true;}
  render();openMilestoneGuidance(s,g,o);toast('Approach saved. Review after 3 checks.');return true;
 }
 if(action==='review-intervention'){
  const plan=state.interventions.find(x=>x.id===el.dataset.intervention&&x.student===id&&x.objective===oid);if(!plan)return true;
  plan.reviewedAt=new Date().toISOString();if(!persist()){plan.reviewedAt=null;return true;}closeModal();render();toast('Review saved in the teaching record.');return true;
 }
 return false;
}
