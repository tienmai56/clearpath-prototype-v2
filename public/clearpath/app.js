'use strict';

const icons={
 upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
 laptop:'<rect x="4" y="3" width="16" height="13" rx="1"/><path d="m4 16-2 4h20l-2-4M9 20h6"/>',
 phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/>',
 video:'<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
 class:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 plan:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/>',
 book:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1ZM12 5v15"/>',
 collect:'<path d="M4 5h16M4 10h16M4 15h16M4 20h16M8 5v15M16 5v15"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 back:'<path d="M19 12H5m5-5-5 5 5 5"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 circleCheck:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 circle:'<circle cx="12" cy="12" r="9"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/>',
 sprout:'<path d="M12 21v-9C7 13 3 9 4 4c5-1 9 3 8 8Zm0 3c-1-5 3-9 8-8 1 5-3 9-8 8Z"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 edit:'<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z"/>',
 note:'<path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9M8 10h4M8 14h8M8 18h5m11-15-7 7-3 1 1-3 7-7"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 shuffle:'<path d="m17 3 4 4-4 4M3 17h3c5 0 5-10 10-10h5M3 7h3c2 0 3 2 4 4m4 4c.7 1.2 1.3 2 3 2h4m-4-4 4 4-4 4"/>',
 compare:'<path d="M4 20V10h5v10M15 20V4h5v16M2 20h20"/>',
 people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
 rain:'<path d="M5 14a5 5 0 0 1 1-10 6 6 0 0 1 11 2 4 4 0 0 1 1 8H5Zm2 3-1 3m6-3-1 3m6-3-1 3"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
 bulb:'<path d="M9 18h6m-5 3h4M8 15a7 7 0 1 1 8 0l-1 3H9l-1-3Z"/>',
 print:'<path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6ZM17 12h1"/>',
 save:'<path d="M4 3h13l4 4v14H3V3h1Zm3 0v6h10V3M7 21v-8h10v8"/>',
 swap:'<path d="M3 8h17m-4-4 4 4-4 4M21 16H4m4-4-4 4 4 4"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M8 15h2M14 15h2"/>',
 flag:'<path d="M5 22V3c5-4 9 4 14 0v11c-5 4-9-4-14 0"/>',
 message:'<path d="M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10ZM7 7h10M7 11h7"/>',
 minus:'<path d="M5 12h14"/>'
};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.circle}</svg>`;
const logo='<svg class="brand-mark" viewBox="0 0 34 38" aria-hidden="true"><path d="M17 35V17" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M16.8 22C7 22 2 15 4 6c9-1 15 6 12.8 16Z" fill="currentColor"/><path d="M18 16C17 8 23 2 31 3c1 8-5 14-13 13Z" fill="#93ad7a"/></svg>';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TODAY='2026-10-09';
const STORE_KEY='clearpath-prototype-v1';
const domainNames={reading:'Reading comprehension',math:'Math word problems',writing:'Written expression'};
const goalSummaries={reading:'Sequence three events in a short story',math:'Solve one-step addition and subtraction problems',writing:'Write a complete sentence with a clear idea'};
const students=[
 {id:'ava',name:'Ava Carter',initials:'AC',color:'peach',domain:'reading',score:55,status:'support',last:'Today',points:[30,40,45,50,55,55]},
 {id:'milo',name:'Milo Brooks',initials:'MB',color:'lilac',domain:'reading',score:60,status:'support',last:'Yesterday',points:[35,40,45,55,60,60]},
 {id:'jayden',name:'Jayden Lee',initials:'JL',color:'blue',domain:'reading',score:55,status:'evidence',last:'9 days ago',points:[30,35,45,50,55]},
 {id:'lena',name:'Lena Patel',initials:'LP',color:'sage',domain:'reading',score:70,status:'track',last:'Today',points:[40,40,50,55,65,70]},
 {id:'noah',name:'Noah Kim',initials:'NK',color:'sand',domain:'reading',score:75,status:'track',last:'Today',points:[30,40,45,60,70,75]},
 {id:'zoe',name:'Zoe Rivera',initials:'ZR',color:'rose',domain:'reading',score:75,status:'track',last:'Yesterday',points:[40,50,50,60,65,75]},
 {id:'amir',name:'Amir Hassan',initials:'AH',color:'blue',domain:'math',score:70,status:'track',last:'Today',points:[30,35,45,55,65,70]},
 {id:'ellie',name:'Ellie Nguyen',initials:'EN',color:'peach',domain:'math',score:80,status:'track',last:'Yesterday',points:[45,50,55,65,70,80]},
 {id:'ben',name:'Ben Wilson',initials:'BW',color:'sand',domain:'math',score:60,status:'evidence',last:'8 days ago',points:[30,40,50,55,60]},
 {id:'isla',name:'Isla Davis',initials:'ID',color:'lilac',domain:'writing',score:80,status:'track',last:'Today',points:[40,50,55,65,75,80]},
 {id:'lucas',name:'Lucas Chen',initials:'LC',color:'sage',domain:'writing',score:50,status:'support',last:'Yesterday',points:[30,35,40,45,50,50]},
 {id:'samira',name:'Samira Ali',initials:'SA',color:'rose',domain:'writing',score:75,status:'track',last:'Today',points:[30,40,45,55,65,75]}
].map(s=>({...s,grade:3}));

const SEED_STUDENT_COUNT=12;
const defaultMeasures={reading:'5-question reading check',math:'5-item problem-solving check',writing:'5-opportunity writing sample'};
function uid(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function goalPlansFor(id){return state.goalPlans?.[id]||[]}
function activeGoal(id){const plans=goalPlansFor(id);return plans.find(g=>g.id===activeGoalIds[id])||plans.find(g=>!goalAchieved(g))||plans[0]||null}
function approvedObjectives(g){return (g?.objectives||[]).filter(o=>o.status==='approved')}
function activeObjective(id){const g=activeGoal(id),list=approvedObjectives(g),selected=g?.objectives.find(o=>o.id===activeObjectiveIds[id]);if(selected)return selected.status==='approved'?selected:null;const focus=focusMilestone(getStudent(id),g);return focus?.status==='approved'?focus:list[0]||null}
function findGoal(id,gid){return goalPlansFor(id).find(g=>g.id===gid)}
function objectiveLogs(id,oid){return state.logs.filter(l=>l.student===id&&l.objective===oid)}
function scoreForObjective(s,o){const values=milestoneEvidence(s,o);return values.length?values[values.length-1].score:null}
function smartText(o,s){return `By ${formatDate(o.deadline)}, ${new Date(o.deadline+'T12:00:00').getFullYear()}, ${s.name.split(' ')[0]} will ${o.skill.replace(/[.!?]$/,'').replace(/^./,c=>c.toLowerCase())}, ${o.condition.replace(/[.!?]$/,'')}, with at least ${o.target}% accuracy across ${o.checks} consecutive checks.`}
function draftObjectives(s,g,seed=false){const total=Math.max(0,Math.round((new Date(g.deadline+'T12:00:00')-new Date(TODAY+'T12:00:00'))/86400000));const content=g.content||g.title;const known=content.toLowerCase()===goalSummaries[g.domain].toLowerCase();const skills=known?{
 reading:['Identify the first and last events in a short story','Put two story events in order','Sequence three events in a short story'],
 math:['Choose addition or subtraction for a one-step problem','Solve one-step addition problems','Solve one-step addition and subtraction problems'],
 writing:['State a complete idea aloud before writing','Write a complete sentence using a sentence frame','Write a complete sentence with a clear idea']
}[g.domain]:[content];return skills.map((skill,i)=>({id:seed?g.id+'-o'+(i+1):uid('objective'),skill,condition:i===0?'with a worked example and usual accommodations':i===1?'with a visual guide and usual accommodations':'with usual accommodations',target:80,checks:3,deadline:i===skills.length-1?g.deadline:datePlus(Math.round(total*(i+1)/skills.length)),status:seed?'approved':'draft',sample:seed&&i===skills.length-1}));}
function initializeModel(){state.serviceEntries ||= [];state.assignments ||= [];state.addedStudents ||= [];for(const s of state.addedStudents)if(!students.some(x=>x.id===s.id))students.push(s);if(!state.goalPlans){state.goalPlans={};for(const s of students){if(s.isNew){state.goalPlans[s.id]=[];continue}const p=state.plans[s.id]||initialPlans()[s.id];const g={id:'goal-'+s.id,domain:s.domain,title:p.goal,deadline:p.deadline,measurement:{method:p.method,frequency:p.frequency||'2',review:p.review}};g.objectives=draftObjectives(s,g,true);g.objectives[g.objectives.length-1].target=p.target||80;if(s.id==='samira')g.objectives[g.objectives.length-1].status='draft';state.goalPlans[s.id]=[g]}}for(const log of state.logs){if(!log.objective){const g=goalPlansFor(log.student)[0];if(g){log.goal=g.id;log.objective=g.objectives[g.objectives.length-1]?.id}}}initializeGoalDetails();initializeJourneys();state.schemaVersion=4;}
function addStudentModal(){openModal('Add student','',`<form id="student-form"><div class="field"><label for="student-name">Student name</label><input id="student-name" name="name" required maxlength="100" placeholder="First and last name" autocomplete="off"></div><div class="field"><label for="student-grade">Grade</label><select id="student-grade" name="grade">${Array.from({length:13},(_,i)=>`<option value="${i}" ${i===3?'selected':''}>${i===0?'Kindergarten':'Grade '+i}</option>`).join('')}</select></div><div id="student-error"></div><div class="modal-foot">${btn('Cancel','close')}<button class="btn primary" type="submit">Add student</button></div></form>`)}
function objectiveModal(id,gid,oid=''){const g=findGoal(id,gid),o=g?.objectives.find(o=>o.id===oid);if(!g)return;openModal(o?'Edit objective':'Add objective',g.title,`<form id="objective-form"><input type="hidden" name="student" value="${id}"><input type="hidden" name="goalId" value="${gid}"><input type="hidden" name="objectiveId" value="${oid}"><div class="field"><label for="objective-skill">Specific skill</label><textarea id="objective-skill" name="skill" required maxlength="1200" placeholder="e.g. Put two story events in order">${esc(o?.skill||'')}</textarea></div><div class="field-row"><div class="field"><label for="objective-target">Accuracy target (%)</label><input id="objective-target" name="target" type="number" min="1" max="100" value="${o?.target||80}" required></div><div class="field"><label for="objective-deadline">By date</label><input id="objective-deadline" name="deadline" type="date" min="${TODAY}" max="${g.deadline}" value="${o?.deadline||g.deadline}" required></div></div><details class="disclosure"><summary>Support and measurement</summary><div class="field"><label for="objective-condition">Support conditions</label><input id="objective-condition" name="condition" value="${esc(o?.condition||'with usual accommodations')}" required maxlength="500"></div><div class="field"><label for="objective-checks">Consecutive successful checks</label><input id="objective-checks" name="checks" type="number" min="1" max="10" value="${o?.checks||3}" required></div></details><div id="objective-error"></div><div class="modal-foot"><span class="caption">Teacher approval follows this edit.</span><button class="btn primary" type="submit">${o?'Save objective':'Draft SMART objective'}</button></div></form>`)}
function measurementModal(id,gid){const g=findGoal(id,gid);if(!g)return;const m=g.measurement;openModal('Measurement plan',g.title,`<form id="measurement-form"><input type="hidden" name="student" value="${id}"><input type="hidden" name="goalId" value="${gid}"><div class="field"><label for="measure-method">What will you collect?</label><input id="measure-method" name="method" value="${esc(m.method)}" required maxlength="500"></div><div class="field-row"><div class="field"><label for="measure-frequency">How often?</label><select id="measure-frequency" name="frequency">${[1,2,3,4,5].map(n=>`<option value="${n}" ${+m.frequency===n?'selected':''}>${n} ${n===1?'time':'times'} per week</option>`).join('')}</select></div><div class="field"><label for="measure-review">Review date</label><input id="measure-review" name="review" type="date" min="${TODAY}" max="${g.deadline}" value="${m.review}" required></div></div><div id="measurement-error"></div><div class="modal-foot">${btn('Cancel','close')}<button class="btn primary" type="submit">Save measurement plan</button></div></form>`)}
function lessonGoalsFor(id,domain){return goalPlansFor(id).filter(g=>g.domain===domain&&approvedObjectives(g).length)}
function lessonObjectiveOptions(id,domain){return lessonGoalsFor(id,domain).flatMap(g=>approvedObjectives(g).map(o=>({...o,goalId:g.id,goalTitle:g.title})))}
function defaultLessonObjective(id,domain){const list=lessonObjectiveOptions(id,domain);return list[list.length-1]||null}
function preserveLessonInputs(){preserveDraftInputs(lesson,document.getElementById('lesson-form'))}
function weekStart(iso){const d=new Date(iso+'T12:00:00Z'),day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day);return d.toISOString().slice(0,10)}
function weekLabel(iso){const end=new Date(iso+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+6);return formatDate(iso)+' – '+formatDate(end.toISOString().slice(0,10))}
function notesFor(s){const custom=state.contexts.filter(c=>c.student===s.id).map(c=>({...c,dateISO:c.dateISO||TODAY}));const sample=s.isNew?[]:sampleContexts(s).map((c,i)=>({...c,student:s.id,id:'sample-note-'+s.id+'-'+i,dateISO:['2026-10-08','2026-10-07','2026-10-06'][i]||'2026-10-06'}));if(!s.isNew)sample.push({id:'sample-prior-'+s.id,student:s.id,role:'General education teacher',author:'Jordan Bell',initials:'JB',color:'blue',dateISO:'2026-09-30',text:s.domain==='reading'?'Lost place when several directions appeared together. Oral retelling was easier than completing the written sequence.':s.domain==='math'?'Needed an adult cue to choose the first step, then completed the calculation.':'Shared a clear idea aloud. Needed an adult cue to start writing.'});return [...custom,...sample].sort((a,b)=>b.dateISO.localeCompare(a.dateISO));}
function notesDigest(s){const notes=notesFor(s),latest=new Map();for(const n of notes)if(!latest.has(n.role))latest.set(n.role,n);return [...latest.values()].map(n=>{const first=n.text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()||n.text;return {role:n.role,text:first.length>160?first.slice(0,157)+'…':first,note:n}})}
function guidanceFor(s){return guidanceRecommendations(s,notesFor(s))}

function initialPlans(){return Object.fromEntries(students.map(s=>[s.id,{
 goal:goalSummaries[s.domain],objective:goalSummaries[s.domain],objectiveTarget:60,objectiveDeadline:'2026-12-18',condition:s.domain==='reading'?'Given a grade-appropriate passage and the student’s usual accommodations':s.domain==='math'?'Given a one-step problem and the student’s usual accommodations':'Given a familiar topic and the student’s usual accommodations',baseline:40,target:80,probes:3,deadline:'2027-05-21',method:s.domain==='reading'?'5-question story sequencing probe':s.domain==='math'?'5-item problem-solving probe':'5-opportunity sentence-writing sample',frequency:s.id==='samira'?'':'2',owner:'Ms. Rivera',review:s.id==='ava'?'2026-10-16':s.id==='lucas'?'2026-10-19':'2026-11-06',report:'2026-10-30'
}]))}
function initialState(){return {plans:initialPlans(),logs:[],contexts:[],drafts:[],assignments:[],comparisons:[],lesson:null}}
let state;
try{state=JSON.parse(localStorage.getItem(STORE_KEY))||initialState();if(!state.plans||!state.logs||!state.contexts||!state.comparisons)state=initialState()}catch{state=initialState()}
initializeModel();
let activeGoalIds={},activeObjectiveIds={},notesSource='all';
let searchText='',studentTab='present',studioTab='draft',studioIntent='assignment',lesson=null,support='independent',lastFocus=null,toastTimer;
const app=document.getElementById('app'),overlay=document.getElementById('overlay');
function persist(){try{localStorage.setItem(STORE_KEY,JSON.stringify(state));return true}catch{toast('Changes work for this visit; browser storage is unavailable.');return false}}
function getStudent(id){return students.find(s=>s.id===id)||students[0]}
function planFor(id){const g=activeGoal(id),o=activeObjective(id);return {goal:g?.title||'',target:o?.target||80,probes:o?.checks||3,deadline:g?.deadline||'',method:g?.measurement.method||'',frequency:g?.measurement.frequency||'',review:g?.measurement.review||''}}
function logsFor(id){return state.logs.filter(l=>l.student===id)}
function latestScore(s){return scoreForObjective(s,activeObjective(s.id))}
function avatar(s,size=''){return `<span class="avatar av-${s.color} ${size}" aria-hidden="true">${esc(s.initials)}</span>`}
function statusOf(s){if(!goalPlansFor(s.id).length)return 'setup';if(goalPlansFor(s.id).every(goalAchieved))return 'achieved';return currentInsight(s).key==='ready'?'review':currentInsight(s).key;}

function badgeFor(s){const type=statusOf(s);return `<span class="badge ${type==='track'||type==='achieved'?'green':type==='support'?'amber':type==='review'?'purple':'gray'}">${type==='achieved'?'Goals achieved':type==='track'?'On track':type==='support'?'Needs support':type==='review'?'Review new evidence':type==='setup'?'Set IEP goal':type==='draft'?'Review objectives':'Needs evidence'}</span>`}
function formatDate(value){if(!value)return 'Not set';const d=new Date(value+'T12:00:00');return Number.isNaN(d.getTime())?'Not set':d.toLocaleDateString('en-US',{month:'short',day:'numeric'})}
function datePlus(days){const d=new Date(TODAY+'T12:00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
function btn(label,action,type='',extra=''){return `<button class="btn ${type}" data-action="${action}" ${extra}>${label}</button>`}
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200)}
function route(){const parts=(location.hash.slice(1)||'class').split('/');return {page:parts[0],id:parts[1],student:parts[2],objective:parts[3]}}
function navigate(hash){closeModal();if(location.hash===`#${hash}`)render();else location.hash=hash}
function shell(content,page){const nav=page==='student'?'class':page==='assignments'?'studio':page;return `
 <aside class="sidebar"><a href="#class" class="brand" aria-label="Clearpath home">${logo}Clearpath</a><div class="workspace-name">Teacher workspace</div><nav class="nav" aria-label="Main navigation">
 <a href="#class" class="${nav==='class'?'active':''}" ${nav==='class'?'aria-current="page"':''}>${icon('class')}<span>My class</span><span class="nav-count">${students.length}</span></a>
 <a href="#plans" class="${nav==='plans'?'active':''}" ${nav==='plans'?'aria-current="page"':''}>${icon('plan')}<span>Create &amp; Track Goals</span></a>
 <a href="#studio" class="${nav==='studio'?'active':''}" ${nav==='studio'?'aria-current="page"':''}>${icon('book')}<span>Generate assignments</span></a>
 <a href="#collect" class="${nav==='collect'?'active':''}" ${nav==='collect'?'aria-current="page"':''}>${icon('collect')}<span>Collect data</span></a></nav>
 <div class="sidebar-bottom"><div class="demo-note"><button data-action="about">${icon('info')}About this prototype</button></div><div class="profile"><div class="profile-avatar">MR</div><div><strong>Ms. Rivera</strong><small>Grade 3 teacher</small></div></div></div></aside>
 <div class="shell"><header class="topbar"><div class="breadcrumb">Maple Elementary <span>/</span><strong>Room 204</strong></div><a class="mobile-brand" href="#class">${logo}Clearpath</a><div class="topbar-right"><span class="date">Friday, October 9</span><span class="sample-pill"><i></i>Demo · Sample data</span></div></header><main id="main" tabindex="-1">${content}</main></div>`}
function render(){const r=route();syncIntakeNavigation();if(r.page==='comparison'||r.page==='studio'&&['variants','comparisons'].includes(r.id)){navigate('studio');return;}if(r.page==='student'&&r.student&&r.objective){const target=findGoal(r.id,r.student);if(target?.objectives.some(o=>o.id===r.objective)){activeGoalIds[r.id]=target.id;activeObjectiveIds[r.id]=r.objective;}}if(r.page==='student'&&studentTab==='evidence'){studentTab='present';return navigateGoalWorkspace('notes',r.id)}if(r.page==='student')studentTab=r.student==='iep'?'goals':r.student==='progress'||r.objective?'progress':'present';let content;if(r.page==='student')content=studentView(getStudent(r.id));else if(r.page==='plans')content=plansView();else if(r.page==='studio')content=studioView();else if(r.page==='collect')content=dataCollectionView();else if(r.page==='assignments')content=assignmentOverview(r.id);else content=classView();app.innerHTML=shell(content,r.page);document.title=`Clearpath · ${r.page==='student'?getStudent(r.id).name:r.page==='plans'?'Create & Track Goals':r.page==='studio'?'Generate assignments':r.page==='collect'?'Collect data':r.page==='assignments'?'Assignment overview':'My class'}`}

function classView(){return `<section class="classroom-page" aria-labelledby="classroom-heading"><div class="page-head"><div><h1 id="classroom-heading">My class</h1><p class="subtitle">${students.length} ${students.length===1?'student':'students'}</p></div>${btn(icon('plus')+'Add student','add-student','primary')}</div><div class="classroom-toolbar"><label class="classroom-search">${icon('search')}<span class="sr-only">Search students</span><input id="student-search" type="search" placeholder="Search students" value="${esc(searchText)}" autocomplete="off" aria-controls="student-card-grid"></label><span id="student-results-count" class="classroom-results" role="status" aria-live="polite">${studentSearchCount()}</span></div><ul id="student-card-grid" class="student-card-grid" aria-label="Students">${studentCards()}</ul></section>`}
function filteredStudents(){const query=searchText.trim().toLocaleLowerCase();return alphabeticalStudents(students.filter(s=>s.name.toLocaleLowerCase().includes(query)))}
function studentSearchCount(){return searchText.trim()?`${filteredStudents().length} of ${students.length} students`:''}
function studentCards(){return filteredStudents().map(s=>`<li><a class="student-card" href="#student/${s.id}" data-action="open-student-profile" data-id="${s.id}" aria-label="View ${esc(s.name)}’s profile"><div class="student-card-person">${avatar(s)}<div><h2>${esc(s.name)}</h2><p>${gradeLabel(s.grade)}</p></div></div><span class="student-card-link">View student ${icon('arrow')}</span></a></li>`).join('')||`<li class="student-search-empty">${icon('search')}<h2>No students found</h2><p>Try another name.</p>${btn('Clear search','clear-student-search')}</li>`}
function updateStudentSearch(){document.getElementById('student-card-grid').innerHTML=studentCards();document.getElementById('student-results-count').textContent=studentSearchCount()}

function progressChart(s){const o=activeObjective(s.id),evidence=milestoneEvidence(s,o).slice(-8),values=evidence.map(l=>l.score);if(!values.length)return '<p class="empty-records">No progress recorded for this objective.</p>';const w=490,h=190,left=31,right=18,top=15,bottom=32;const x=i=>left+i*(w-left-right)/Math.max(1,values.length-1);const y=v=>top+(100-v)*(h-top-bottom)/100;const path=values.map((v,i)=>`${i?'L':'M'}${x(i)},${y(v)}`).join(' ');const target=planFor(s.id).target;return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(s.name)} progress: ${values.join(', ')} percent. Target: ${target} percent.">${[0,40,80].map(v=>`<line x1="${left}" y1="${y(v)}" x2="${w-right}" y2="${y(v)}" stroke="#edf1e7"/><text x="0" y="${y(v)+4}">${v}%</text>`).join('')}<line x1="${left}" y1="${y(target)}" x2="${w-right}" y2="${y(target)}" stroke="#b8c9ab" stroke-dasharray="4 4"/><text x="${w-right-53}" y="${y(target)-8}" class="target-label">Target ${target}%</text><path d="${path}" fill="none" stroke="#7a9a67" stroke-width="2.5" stroke-linejoin="round"/>${values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#fff" stroke="#7a9a67" stroke-width="2"><title>Probe ${i+1}: ${v}%</title></circle>`).join('')}<text x="${left}" y="${h-5}">${formatDate(evidence[0]?.date)}</text><text x="${w-53}" y="${h-5}">${formatDate(evidence[evidence.length-1]?.date)}</text></svg><div class="chart-legend"><span><i class="legend-line"></i>Independent answers</span><span><i class="legend-line dashed"></i>Milestone target</span></div>`}
function studentView(s){if(isIntakeStudent(s))ensureStudentIntake(s);const panels={present:presentLevelsView,goals:studentIEPView,progress:studentProgressView};return `<a href="#class" class="back">${icon('back')}My class</a><div class="page-head"><div class="student-heading">${avatar(s,'big')}<div><h1>${esc(s.name)}</h1><p class="subtitle">${gradeLabel(s.grade)}</p></div></div>${studentTab==='present'&&!isIntakeStudent(s)?btn(icon('note')+'Add observation','context','',`data-id="${s.id}"`):''}</div><div class="tabs student-profile-tabs" role="tablist" aria-label="Student details">${[['present','Present levels'],['goals','IEP goals'],['progress','Progress']].map(([v,l])=>`<button id="student-tab-${v}" role="tab" aria-selected="${studentTab===v}" aria-controls="student-profile-panel" tabindex="${studentTab===v?'0':'-1'}" class="tab ${studentTab===v?'active':''}" data-action="student-tab" data-id="${s.id}" data-value="${v}">${l}</button>`).join('')}</div><div id="student-profile-panel" class="student-profile-panel" role="tabpanel" aria-labelledby="student-tab-${studentTab}" tabindex="0">${panels[studentTab](s)}</div>`}

function suggestionFor(s){return s.domain==='reading'?{title:'Show one direction at a time',body:'The therapist observed longer engagement with one-step directions.',sources:['Therapist · Oct 8','Teacher · Oct 7'],change:'Show one direction at a time. Keep the passage, questions, and usual accommodations.'}:s.domain==='math'?{title:'Separate the problem-solving steps',body:'The teacher noted difficulty choosing relevant information, despite correct verbal calculations.',sources:['Teacher · Oct 8'],change:'Place identify, solve, and check steps in separate visual boxes. Keep the same problems.'}:{title:'Add a visual word bank',body:'The student shares ideas aloud but pauses before writing.',sources:['Teacher · Oct 8','Parent · Oct 6'],change:'Add visual cues to the word bank. Keep the same writing task and usual accommodations.'}}

function sampleContexts(s){const first=s.name.split(' ')[0];return s.domain==='reading'?[
 {role:'Occupational therapist',author:'Maya Chen',initials:'MC',color:'lilac',date:'Oct 8',text:`${first} stayed with the task longer when the page showed one step at a time. Several directions together seemed harder to get started with.`},
 {role:'General education teacher',author:'Jordan Bell',initials:'JB',color:'blue',date:'Oct 7',text:`During story discussion, ${first} could explain the events aloud. Independent sequencing was harder when the worksheet was text only.`},
 {role:'Parent',author:'Family note',initials:'FN',color:'peach',date:'Oct 6',text:`At home, ${first} retold a familiar story using the pictures before looking at the words.`}
 ]:s.domain==='math'?[
 {role:'General education teacher',author:'Jordan Bell',initials:'JB',color:'blue',date:'Oct 8',text:`${first} explained the calculation aloud but needed help deciding which information in the story to use.`},
 {role:'Parent',author:'Family note',initials:'FN',color:'peach',date:'Oct 6',text:'A worked example helped with getting started on homework.'}
 ]:[
 {role:'General education teacher',author:'Jordan Bell',initials:'JB',color:'blue',date:'Oct 8',text:`${first} shared a clear idea aloud, then paused for several minutes before beginning to write.`},
 {role:'Parent',author:'Family note',initials:'FN',color:'peach',date:'Oct 6',text:'Talking through a sentence before writing seemed to make homework easier to start.'}
 ]}
function contextList(s){return notesFor(s).map(n=>noteEntry(n)).join('')}
function stakeholderProfile(n){
 const key=(n.author+'|'+n.role).toLowerCase(),hash=Array.from(key).reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0);
 const presets=[{bg:'#e9eeeb',skin:'#d7a887',hair:'#44372f',shirt:'#73877b',style:0},{bg:'#eeeaf1',skin:'#e9bb99',hair:'#51473e',shirt:'#938ca1',style:1},{bg:'#f0ece5',skin:'#a97654',hair:'#302f2c',shirt:'#a28e74',style:2},{bg:'#e7ecef',skin:'#ebc7a5',hair:'#7e5c3d',shirt:'#778b9a',style:3},{bg:'#eeece7',skin:'#b37f5b',hair:'#393532',shirt:'#8a907a',style:1},{bg:'#eee9e7',skin:'#d3a081',hair:'#5d443b',shirt:'#ab8980',style:0}];
 const v=presets[hash%presets.length],hair=[`<path d="M13 25V18C13 7 35 6 35 19v10l-5-5V15c-4 4-8 5-13 5v7Z" fill="${v.hair}"/>`,`<path d="M12 30V19c0-15 24-15 24 0v13l-6-4V16c-7 5-10 5-13 4v10Z" fill="${v.hair}"/>`,`<path d="M13 20c-5-3-1-11 3-10 0-5 7-6 10-3 5-2 11 2 10 7 4 5 1 9-2 10l-4-9-13 1-1 7Z" fill="${v.hair}"/>`,`<path d="M13 23V16c0-10 23-12 23 2l-4 6-2-11c-5 5-9 3-14 6v7Z" fill="${v.hair}"/>`][v.style];
 return `<svg class="stakeholder-avatar" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="${v.bg}"/><path d="M5 49c0-11 7-17 19-17s19 6 19 17Z" fill="${v.shirt}"/>${hair}<path d="M20 29h8v7c-2 3-6 3-8 0Z" fill="${v.skin}"/><ellipse cx="24" cy="22" rx="9" ry="11" fill="${v.skin}"/><path d="M15 20c0-7 3-11 9-11 7 0 10 5 10 10-4-1-6-5-6-7-3 5-8 7-13 8Z" fill="${v.hair}"/><path d="M19 23h1m8 0h1" stroke="#403833" stroke-width="1.7" stroke-linecap="round"/><path d="M22 28q2 2 4 0" stroke="#835345" fill="none" stroke-width="1.1" stroke-linecap="round"/><path d="m18 35 6 5 6-5" stroke="#ffffff80" stroke-width="1.5" fill="none"/></svg>`;
}
function noteCitation(n,index){const label=`Source ${index}: ${n.author}, ${n.role}, ${formatDate(n.dateISO)}. Open note.`;return `<a class="note-citation" href="#${n.id}" data-action="show-note" data-id="${n.student||goalsStudentId}" data-note="${n.id}" title="${esc(n.role+' · '+n.author+' · '+formatDate(n.dateISO))}" aria-label="${esc(label)}">[${index}]</a>`}
function notesSummary(s){
 const digest=notesDigest(s);
 return `<p class="notes-summary">${digest.map((d,i)=>`${esc(d.text)} ${noteCitation(d.note,i+1)}`).join(' ')}</p>`;
}
function noteEntry(n){return `<article class="note-entry" id="${n.id}" tabindex="-1"><div class="note-entry-head">${stakeholderProfile(n)}<div class="note-person"><strong>${esc(n.author)}</strong><span>${esc(n.role)}</span></div><time datetime="${n.dateISO}">${formatDate(n.dateISO)}</time></div><p>${esc(n.text)}</p></article>`}


function studentOverview(s){return journeyProgress(s)}

function studentPlan(s,goalId=''){
 const allGoals=goalPlansFor(s.id),gs=goalId?allGoals.filter(g=>g.id===goalId):allGoals;
 if(!gs.length)return '<div class="empty-plan"><h2>No IEP goals yet</h2></div>';
 return `<div class="content-column iep-plan">${gs.map((g,i)=>{
  i=allGoals.indexOf(g);return `<section class="goal-block" aria-labelledby="plan-${g.id}">
   <div class="goal-heading"><div><h2 id="plan-${g.id}">Goal ${i+1}: ${esc(g.title)}</h2><p class="goal-deadline">By ${formatDate(g.deadline)}, ${g.deadline.slice(0,4)}</p></div><button class="text-btn" data-action="edit-goal" data-id="${s.id}" data-goal="${g.id}">Edit</button></div>
   <div class="objectives-nested"><div class="section-row objectives-top"><h3>Objectives</h3></div>
    <ol class="objective-list" aria-label="Objectives for Goal ${i+1}">${g.objectives.map((o,j)=>`<li class="objective-item"><div class="objective-heading"><h3>Objective ${j+1}</h3></div><p>${esc(smartText(o,s))}</p>${o.status!=='approved'?`<button class="text-btn objective-approve" data-action="approve-objective" data-id="${s.id}" data-goal="${g.id}" data-objective="${o.id}">Approve objective</button>`:''}</li>`).join('')}
    </ol>
   </div>
  </section>`;
 }).join('')}</div>`;
}

function studentEvidence(s){const notes=notesFor(s);if(!notes.length)return `<div class="empty-plan"><h2>No notes yet</h2><p>Add observations from teachers, therapists, or family.</p></div>`;const filtered=notes.filter(n=>notesSource==='all'||n.role===notesSource),weeks=[...new Set(filtered.map(n=>weekStart(n.dateISO)))];return `<div class="content-column">${guidanceSection(s)}<section class="content-section notes-overview"><div class="section-row"><h2>Summary</h2><span class="caption no-margin">${notes.length} notes · ${new Set(notes.map(n=>n.role)).size} sources</span></div>${notesSummary(s)}</section><section><div class="section-row"><h2>Notes by week</h2><label class="source-filter"><span class="sr-only">Filter notes by source</span><select id="notes-source"><option value="all">All sources</option>${[...new Set(notes.map(n=>n.role))].map(role=>`<option ${notesSource===role?'selected':''}>${esc(role)}</option>`).join('')}</select></label></div>${weeks.map((w,i)=>`<details class="week-group" ${i===0?'open':''}><summary>${weekLabel(w)} <span>${filtered.filter(n=>weekStart(n.dateISO)===w).length} notes</span></summary>${filtered.filter(n=>weekStart(n.dateISO)===w).map(noteEntry).join('')}</details>`).join('')}</section></div>`}


function plansView(){return goalWorkspaceView()}

const lessonDefaults={
 reading:{title:'The garden after the rain',source:'Maya planted a seed in a small pot. That afternoon, rain began to fall. She moved the pot inside and put it by a sunny window. A few days later, a tiny green leaf appeared.',directionsA:'Read the story.\n1. What did Maya do first?\n2. What happened after the rain began?\n3. What happened at the end?\nPut the three events in order.',directionsB:'Look at the three picture cues, then read the story.\n1. What did Maya do first?\n2. What happened after the rain began?\n3. What happened at the end?\nPut the three events in order.',cueLabels:['A seed is planted','The rain begins','A leaf appears'],cueIcons:['sprout','rain','sun'],a:'Numbered text steps',b:'Text + picture cues',change:'Picture cues for the sequence',measure:'Independent accuracy on a 5-question sequencing probe'},
 math:{title:'Seeds for the school garden',source:'Maya has 8 seeds. Her friend brings 5 more seeds. How many seeds do they have altogether? Next, they plant 6 of the seeds. How many seeds are left?',directionsA:'Read each problem.\n1. Write the numbers you need.\n2. Choose addition or subtraction.\n3. Solve and check your answer.',directionsB:'Use the three boxes to organize your thinking.\n1. Write the numbers you need.\n2. Choose addition or subtraction.\n3. Solve and check your answer.',cueLabels:['Find the numbers','Choose an operation','Solve and check'],cueIcons:['search','plus','check'],a:'Numbered text steps',b:'Steps in visual boxes',change:'Visual boxes around the same problem-solving steps',measure:'Independent accuracy on a 5-item problem-solving probe'},
 writing:{title:'A moment in the garden',source:'Think of something you noticed in a garden or park. Write one complete sentence about it. Include who or what you saw and what happened.',directionsA:'Use this word bank if helpful: flower, leaf, bird, grew, flew, green.\nSay your idea aloud. Then write one sentence.\nCheck for a capital letter and ending punctuation.',directionsB:'Use the picture word bank if helpful: flower, leaf, bird, grew, flew, green.\nSay your idea aloud. Then write one sentence.\nCheck for a capital letter and ending punctuation.',cueLabels:['Choose an idea','Say your sentence','Write and check'],cueIcons:['bulb','message','edit'],a:'Text word bank',b:'Visual word bank',change:'Visual cues alongside the same writing steps',measure:'Independent success across 5 sentence-writing opportunities'}
};
function newLesson(domain='reading',context='',studentIds=[]){lesson=createLessonDraft(domain,context,studentIds);studioIntent='assignment';studioTab='draft';}
function studioView(){
 const view=route().id;
 if(!view)return `<div class="page-head"><div><h1>Generate assignments</h1><p class="subtitle">Materials for each student’s next step.</p></div></div><section class="assignment-start"><div><h2>Create assignments &amp; assessments</h2><p>Select students, choose their goals, then review an individual draft for each student.</p></div>${btn('Create assignment '+icon('arrow'),'new-lesson','primary')}</section><div class="creation-library"><a href="#studio/saved">Saved materials ${icon('arrow')}</a></div>`;
 const back=`<a href="#studio" class="back">${icon('back')}Generate assignments</a>`;
 if(view==='saved')return back+`<div class="page-head"><h1>Saved materials</h1></div>`+savedMaterials();
 if(!lesson)newLesson();
 return back+`<div class="page-head"><div><h1>Create assignments</h1></div></div>`+assignmentSetupForm(lesson);
}
function lessonForm(){return assignmentSetupForm(lesson)}
function lessonObjectives(){return assignmentObjectives(lesson)}
function eligibleStudents(){return eligibleForDraft(lesson)}
function savedDrafts(){return savedMaterials()}

function openModal(title,subtitle,body,options={}){if(!overlay.innerHTML)lastFocus=document.activeElement;app.inert=true;overlay.innerHTML=`<div class="modal-backdrop ${options.drawer?'drawer-backdrop':''} ${options.printable?'printable':''}"><section class="modal ${options.drawer?'drawer':''} ${options.wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title" tabindex="-1">${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="icon-btn" data-action="close" aria-label="Close dialog">${icon('close')}</button></div><div class="modal-body">${body}</div></section></div>`;document.body.style.overflow='hidden';setTimeout(()=>overlay.querySelector('#modal-title')?.focus(),30)}
function closeModal(){if(!overlay.innerHTML||progressCapture?.saving)return;pendingGuidanceReview=null;if(!finishAssignmentModal())return;goalDraftEditor=null;clearProgressCapture();overlay.innerHTML='';document.body.style.overflow='';app.inert=false;lastFocus?.focus?.()}

function editPlan(id){openStudentSection(id,'goals','plan')}

function contextModal(id,gid='',oid=''){const s=getStudent(id);openModal('Add note',s.name,`<form id="context-form"><input type="hidden" name="student" value="${id}"><input type="hidden" name="goal" value="${esc(gid)}"><input type="hidden" name="objective" value="${esc(oid)}"><div class="field-row"><div class="field"><label for="context-role">Source</label><select name="role" id="context-role"><option>General education teacher</option><option>Special education teacher</option><option>Occupational therapist</option><option>Speech therapist</option><option>Parent</option><option>Paraprofessional</option></select></div><div class="field"><label for="context-author">Name</label><input name="author" id="context-author" required placeholder="e.g. Maya Chen" maxlength="100"></div></div><div class="field"><label for="context-date">Date</label><input id="context-date" name="dateISO" type="date" value="${TODAY}" required></div><div class="field"><label for="context-note">Observation</label><textarea name="text" id="context-note" required rows="5" maxlength="3000" placeholder="Include what the student was doing, what helped, and what made it harder."></textarea></div><div class="modal-foot">${btn('Cancel','close')}<button class="btn primary" type="submit">Save note</button></div></form>`)}
function about(){openModal('A calmer way to see what helps','An interactive Clearpath prototype, shaped around your six jobs to be done.',`<div class="help-grid">${[['Start with your class','Add students, select an objective, and record progress.'],['Make the plan measurable','Set a goal, review generated SMART objectives, and choose how to measure progress.'],['Create assignments','Choose students and their milestones, then review individual assignments and assessments.']].map(([t,p],i)=>`<div class="help-item"><span class="number">${i+1}</span><div><h3>${t}</h3><p>${p}</p></div></div>`).join('')}</div><div class="info-strip">${icon('info')}<span>All students, notes, and results are fictional. AI drafting and automatic guidance use demo rules. Changes are saved in this browser; there are no live school or stakeholder connections.</span></div><div class="modal-foot"><button class="text-btn" data-action="reset-confirm">Reset demo changes</button>${btn('Explore my class '+icon('arrow'),'close','primary')}</div>`)}

document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action,id=el.dataset.id,value=el.dataset.value,gid=el.dataset.goal,oid=el.dataset.objective;e.preventDefault();
 if(a==='close')return closeModal();
 if(a==='about')return about();
 if(a==='add-student')return addStudentModal();
 if(handleIntakeAction(a,el))return;
 if(handlePresentLevelAction(a,el))return;
 if(handleJourneyAction(a,el))return;
 if(handleGoalWorkspaceAction(a,el))return;
 if(handleGoalAction(a,el))return;
 if(a==='add-goal')return goalModal(id);
 if(a==='edit-goal')return goalModal(id,gid);
 if(a==='add-objective'||a==='edit-objective')return objectiveModal(id,gid,oid||'');
 if(a==='edit-measurement')return measurementModal(id,gid);
 if(a==='approve-objective'){const o=findGoal(id,gid)?.objectives.find(x=>x.id===oid);if(o){o.status='approved';o.approvedAt=TODAY;persist();render();toast('Objective added to the plan.')}return}
 if(a==='approve-all'){for(const g of goalPlansFor(id))for(const o of g.objectives){o.status='approved';o.approvedAt=TODAY}persist();render();toast('Objectives approved.');return}
 if(a==='record-progress')return openProgressModal(id||'ava',el.dataset.comparison||'');
 if(handleProgressAction(a,el))return;
 if(handleGuidanceAction(a,el))return;
 if(handleAssignmentAction(a,el))return;
 if(a==='open-student-notes')return navigateGoalWorkspace('notes',id);
 if(a==='open-student-progress')return openStudentSection(id,'progress');
 if(a==='clear-student-search'){searchText='';const input=document.getElementById('student-search');input.value='';updateStudentSearch();input.focus();return}
 if(a==='student-tab'){if(value==='evidence')return navigateGoalWorkspace('notes',id||route().id);openStudentSection(id||route().id,value);setTimeout(()=>document.getElementById('student-tab-'+studentTab)?.focus(),0);return}
 if(a==='edit-plan'||a==='open-student-plan')return editPlan(id);
 if(a==='context')return contextModal(id);
 if(a==='create-iep-goals')return goalModal(id,'',true);
 if(a==='new-lesson'){newLesson();return navigate('studio/create')}
 if(a==='student-assignment'){const g=activeGoal(id);newLesson(g?.domain||'reading','',[id]);return navigate('studio/create')}
 if(a==='suggest-lesson'){const s=getStudent(id),g=activeGoal(id),o=activeObjective(id);newLesson(g?.domain||s.domain,suggestionFor(s).change,[id]);if(o)lesson.objectiveIds[id]=o.id;return navigate('studio/create')}
 if(a==='show-note'){const sid=id||(route().page==='plans'?route().student:route().id);closeModal();notesSource='all';navigateGoalWorkspace('notes',sid);render();const note=document.getElementById(el.dataset.note);if(note){const group=note.closest?.('details');if(group)group.open=true;note.classList.add('note-highlight');note.focus?.({preventScroll:true});note.scrollIntoView?.({behavior:'smooth',block:'center'});}return}
 if(a==='studio-tab'){preserveLessonInputs();studioTab=value;return navigate('studio/'+(value==='draft'?'create':value))}
 if(a==='print')return window.print();
 if(a==='reset-confirm')return openModal('Reset the prototype?','',`<p class="small muted">This clears added students, goals, service time, notes, progress, and drafts in this browser.</p><div class="modal-foot">${btn('Cancel','close')}${btn('Reset demo','reset','primary')}</div>`);
 if(a==='reset'){clearEvidenceFiles();students.splice(SEED_STUDENT_COUNT);state=initialState();initializeModel();activeGoalIds={};activeObjectiveIds={};goalsTab='goal';goalsStudentId='';workspaceGoalIds={};workspaceObjectiveIds={};workspaceExpandedGoals={};initializeGuidance();persist();lesson=null;studioTab='draft';studentTab='present';searchText='';closeModal();navigate('class');toast('Demo reset.')}
});
document.addEventListener('input',e=>{
 if(handleIntakeInput(e.target))return;
 if(handleAssignmentInput(e))return;
 if(e.target.id==='student-search'){searchText=e.target.value;updateStudentSearch()}
 if(['log-correct','log-attempts'].includes(e.target.id)){const raw=document.getElementById('log-correct').value,correct=+raw,total=+document.getElementById('log-attempts').value;document.getElementById('score-preview').textContent=raw!==''&&total>0&&correct>=0&&correct<=total?`${Math.round(correct/total*100)}% independent accuracy`:'Enter the number of independent correct answers.'}
});
document.addEventListener('change',e=>{
 if(handleIntakeChange(e.target))return;
 if(handleGoalWorkspaceChange(e.target))return;
 if(handleProgressChange(e.target))return;
 if(handleAssignmentChange(e.target))return;
 if(e.target.id==='progress-goal'){const id=e.target.dataset.student;activeGoalIds[id]=e.target.value;delete activeObjectiveIds[id];render()}
 if(e.target.id==='progress-objective'){activeObjectiveIds[e.target.dataset.student]=e.target.value;render()}
 if(e.target.id==='notes-source'){notesSource=e.target.value;render()}
});
function formError(id,text){document.getElementById(id).innerHTML=`<div class="error" role="alert">${esc(text)}</div>`}
function validObjective(d,g){return d.skill?.trim()&&d.condition?.trim()&&+d.target>0&&+d.target<=100&&Number.isInteger(+d.checks)&&+d.checks>0&&+d.checks<=10&&d.deadline>=TODAY&&d.deadline<=g.deadline}
document.addEventListener('submit',e=>{const form=e.target;if(!['student-form','service-time-form','goal-form','objective-form','measurement-form','lesson-form','assignment-draft-form','context-form','log-form'].includes(form.id))return;e.preventDefault();const d=Object.fromEntries(new FormData(form));
 if(form.id==='service-time-form')return saveServiceTime(d);
 if(form.id==='student-form'){const name=d.name.trim(),grade=+d.grade;if(!name||!Number.isInteger(grade)||grade<0||grade>12)return formError('student-error','Enter a name and grade.');const s={id:uid('student'),name,grade,initials:name.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase(),color:'sage',domain:'reading',score:null,status:'evidence',last:'No records',points:[],isNew:true};students.push(s);state.addedStudents.push(s);state.goalPlans[s.id]=[];persist();closeModal();openStudentSection(s.id);toast('Student added.');}
 if(form.id==='goal-form')return saveGoalForm(d);
 if(form.id==='objective-form'){const g=findGoal(d.student,d.goalId);if(!g||!validObjective(d,g))return formError('objective-error','Check the skill, target, support, and date within the goal period.');const old=g.objectives.find(o=>o.id===d.objectiveId);const fields={skill:d.skill.trim(),condition:d.condition.trim(),target:+d.target,checks:+d.checks,deadline:d.deadline,status:'draft'};if(old){Object.assign(old,fields);delete old.completedAt;}else g.objectives.push({id:uid('objective'),...fields,sample:false});g.status='active';g.achievedAt=null;g.updatedAt=new Date().toISOString();persist();closeModal();render();toast('Objective saved for approval.');}
 if(form.id==='measurement-form'){const g=findGoal(d.student,d.goalId);if(!g||!d.method.trim()||+d.frequency<1||+d.frequency>5||d.review<TODAY||d.review>g.deadline)return formError('measurement-error','Check the measure, frequency, and review date.');g.measurement={method:d.method.trim(),frequency:d.frequency,review:d.review};persist();closeModal();render();toast('Measurement plan saved.');}
 if(form.id==='lesson-form'||form.id==='assignment-draft-form')return submitAssignmentSetup(d,form);
 if(form.id==='context-form'){if(!d.author.trim()||!d.text.trim()||!d.dateISO)return;state.contexts.unshift({...d,author:d.author.trim(),text:d.text.trim(),id:uid('note'),date:formatDate(d.dateISO),initials:d.author.trim().split(/\s+/).map(s=>s[0]).join('').slice(0,2).toUpperCase(),color:'sage'});refreshGuidance(getStudent(d.student));persist();closeModal();render();toast('Note added. Guidance updated.')}
 if(form.id==='log-form')return saveProgressRecord(d,form);

});
overlay.addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()});
document.addEventListener('keydown',e=>{if(!overlay.innerHTML&&e.target?.dataset?.action==='student-tab'&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=['present','goals','progress'],current=Math.max(0,tabs.indexOf(studentTab)),next=e.key==='Home'?tabs[0]:e.key==='End'?tabs[tabs.length-1]:tabs[(current+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];openStudentSection(route().id,next);setTimeout(()=>document.getElementById('student-tab-'+next)?.focus(),0);return;}if(!overlay.innerHTML)return;if(e.key==='Escape')closeModal();if(e.key==='Tab'){const items=[...overlay.querySelectorAll('button,a[href],input,select,textarea,[contenteditable="true"],[tabindex="0"]')].filter(el=>!el.disabled&&el.type!=='hidden'&&!el.hidden&&!el.closest?.('[hidden]'));const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}});
window.addEventListener('hashchange',()=>{const review=pendingGuidanceReview;pendingGuidanceReview=null;closeModal();notesSource='all';studentTab=route().page==='student'?studentTab:'present';render();window.scrollTo(0,0);if(review&&route().page==='plans'&&route().id==='notes'&&route().student===review)renderGuidanceReview(getStudent(review),guidanceUpdate(review));});

initializeGuidance();
if(goalMetadataChanged){persist();goalMetadataChanged=false;}
render();
