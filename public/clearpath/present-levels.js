'use strict';

function openStudentSection(id, section='present', detail='') {
 const iep=['iep','goals','plan','materials'].includes(section);
 const progress=['progress','overview'].includes(section);
 const expanded=detail||(['plan','materials'].includes(section)?section:'');
 navigate('student/'+id+(iep?'/iep'+(expanded?'/'+expanded:''):progress?'/progress':''));
 if(expanded)setTimeout(()=>document.getElementById('student-'+expanded)?.scrollIntoView?.({behavior:'smooth',block:'start'}),30);
}

function hasStudentPresentLevels(s) {
 const present=intakeSession(s.id).savedDrafts.presentLevels;
 return !!present&&Object.values(present).some(value=>String(value??'').trim());
}

function studentIEPView(s) {
 if(!hasStudentPresentLevels(s))return '';
 const pending=goalPlansFor(s.id).flatMap(g=>g.objectives).filter(o=>o.status!=='approved');
 return `<div class="student-supporting-sections">
  <details id="student-plan" class="student-disclosure" ${route().objective==='plan'?'open':''}>
   <summary><span>IEP goal details<small>Objectives, baselines, and measurement plans</small></span>${icon('down')}</summary>
   <div class="student-disclosure-body"><div class="actions student-plan-actions">${btn(icon('plus')+'Add goal','add-goal','small',`data-id="${s.id}"`)}${pending.length?btn('Approve objectives','approve-all','small',`data-id="${s.id}"`):''}</div>${studentPlan(s)}</div>
  </details>
  <details id="student-materials" class="student-disclosure" ${route().objective==='materials'?'open':''}>
   <summary><span>Assignments &amp; assessments<small>Materials saved for ${esc(s.name.split(' ')[0])}</small></span>${icon('down')}</summary>
   <div class="student-disclosure-body"><div class="student-materials-action">${btn('Create assignment','student-assignment','small',`data-id="${s.id}"`)}</div>${studentMaterials(s)}</div>
  </details>
 </div>`;
}

function studentProgressView(s) {
 return hasStudentPresentLevels(s)?studentOverview(s):'';
}

function presentLevelExample(s) {
 if(s.isNew)return null;
 const name=s.name.split(' ')[0];
 const examples={
  reading:{
   summary:`${name} can explain story events aloud and retell a familiar story with picture cues. Sequencing events independently from text remains a learning need. The next step is to establish how consistently ${name} can put events in order with usual accommodations.`,
   strengths:`${name} describes events during story discussions and uses pictures to support retelling. These oral-language skills provide a starting point for reading comprehension.`,
   needs:`${name} needs support sequencing events independently when a worksheet is text only. Keeping directions to one step at a time may help ${name} get started and stay with the task.`,
   teacher:'sample-note-'+s.id+'-1',support:'sample-note-'+s.id+'-0'
  },
  math:{
   summary:`${name} can explain calculations aloud and complete a calculation after a cue to choose the first step. Identifying relevant information and choosing an operation in a word problem remain learning needs. A worked example has helped ${name} get started at home.`,
   strengths:`${name} explains calculations aloud and can complete the calculation once the first step is identified. This suggests a useful starting point for connecting verbal reasoning to written problem solving.`,
   needs:`${name} needs support deciding which information in a word problem matters and choosing the first step. A baseline assessment can distinguish difficulty selecting the operation from difficulty calculating the answer.`,
   teacher:'sample-note-'+s.id+'-0',support:'sample-prior-'+s.id
  },
  writing:{
   summary:`${name} shares clear ideas aloud but can pause before beginning to write. Talking through a sentence has helped at home. The next step is to establish how independently ${name} can turn an oral idea into a complete written sentence.`,
   strengths:`${name} communicates a clear idea orally before writing. Oral rehearsal provides a starting point for organizing that idea into a sentence.`,
   needs:`${name} needs support initiating written work and translating an oral idea into a complete sentence. Record the amount of prompting needed as well as the features of the finished sentence.`,
   teacher:'sample-note-'+s.id+'-0',support:'sample-prior-'+s.id
  }
 };
 return examples[s.domain]||examples.reading;
}

function presentEvidenceLink(s, source, label) {
 return `<a class="present-evidence-link" href="#student/${s.id}" data-action="present-evidence" data-id="${s.id}" data-source="${esc(source)}" aria-haspopup="dialog">${icon('note')}${esc(label)}</a>`;
}

function presentNoteLink(s, id) {
 const n=notesFor(s).find(n=>n.id===id);
 return n?presentEvidenceLink(s,n.id,`${n.role==='Parent'?'Parent input':n.role.toLowerCase().includes('therapist')?'Therapist observation':'Teacher observation'} · ${formatDate(n.dateISO)}`):'';
}

function presentBaseline(s,g) {
 if(String(g.baseline??'').trim())return {text:String(g.baseline),goal:g};
 const o=g.objectives.find(o=>o.sample),first=o?milestoneEvidence(s,o).find(r=>r.sample):null;
 return first?{goal:g,objective:o,record:first}:null;
}

function presentBaselineView(s) {
 const goals=chronologicalGoals(s.id),baselines=goals.map(g=>presentBaseline(s,g)).filter(Boolean);
 if(!baselines.length)return `<p class="present-empty">No measurable baseline recorded yet. Capture the skill, starting performance, conditions, and date.</p>${goals.length?btn('Add baseline','edit-goal','small',`data-id="${s.id}" data-goal="${goals[0].id}"`):btn('Add a goal','add-goal','small',`data-id="${s.id}"`)}`;
 return baselines.map(b=>`<article class="present-baseline"><h3>${esc(b.goal.title)}</h3>${b.text?`<p class="present-preserve">${esc(b.text)}</p><button class="text-btn" data-action="edit-goal" data-id="${s.id}" data-goal="${b.goal.id}">Review baseline</button>`:`<div class="present-baseline-result"><strong>${b.record.score}%</strong><span>Independent accuracy<small>Example starting point</small></span></div><dl class="present-baseline-facts"><div><dt>Skill</dt><dd>${esc(b.objective.skill)}</dd></div><div><dt>Conditions</dt><dd>Usual accommodations; no extra help</dd></div><div><dt>Recorded</dt><dd><time datetime="${b.record.date}">${formatDate(b.record.date)}, ${b.record.date.slice(0,4)}</time></dd></div></dl>${presentEvidenceLink(s,'baseline:'+b.goal.id,'Starting progress check · '+formatDate(b.record.date))}`}</article>`).join('');
}

function baselineAssessments(s) {
 if(s.isNew&&!goalPlansFor(s.id).length)return [];
 const domain=focusGoal(s)?.domain||s.domain,grade=gradeLabel(s.grade);
 const items={
  reading:[
   {id:'literary',title:`${grade} Comprehension Assessment — Literary`,description:'Story sequence, key details, and character understanding.',purpose:'Clarify which parts of story comprehension the student can complete independently.',task:'After recess, Nia noticed that the class plant was drooping. She checked the dry soil and added water. The next morning, the leaves stood tall again.',prompts:['Put these events in order: Nia watered the plant; Nia noticed drooping leaves; the leaves stood tall.','Why did Nia add water? Which detail tells you?','What do Nia’s actions tell you about her?'],scoring:'Record independent correct answers out of 3. Keep prompted responses separate and note the usual accommodations used.'},
   {id:'informational',title:`${grade} Comprehension Assessment — Informational`,description:'Main idea and supporting details in a short text.',purpose:'Check understanding of the main idea separately from recalling individual details.',task:'Trees help animals in several ways. Birds build nests in their branches. Squirrels find food in their nuts and seeds. On hot days, many animals rest in the shade below a tree.',prompts:['What is this text mostly about?','Name two details that support the main idea.','How might a tree help an animal on a hot day?'],scoring:'Record independent correct answers out of 3. Note when the student needs a reread, picture cue, or adult prompt.'}
  ],
  math:[
   {id:'operations',title:`${grade} Word Problems — Choose the Operation`,description:'Separate understanding the story from calculating an answer.',purpose:'Establish whether the student can select addition or subtraction before solving.',task:'Ask the student to choose an operation for each problem and explain the choice. Do not require a calculation for this check.',prompts:['Maya has 8 seeds. A friend brings 5 more. How many seeds do they have altogether?','There are 14 crayons. Six are put away. How many are left?','A class has 9 red books and 7 blue books. How many books are there in all?'],scoring:'Record independent correct operation choices out of 3. Record explanations and adult cues separately.'},
   {id:'calculation',title:`${grade} Word Problems — Addition & Subtraction`,description:'Solve one-step problems and record the support needed.',purpose:'Compare choosing the operation with carrying out the calculation.',task:'Present one problem at a time using the student’s usual accommodations. Ask the student to show or explain the solution.',prompts:['There are 12 pencils. Four more pencils are added. How many are there now?','A basket holds 15 apples. Seven are used. How many are left?','Eight students are painting and 6 are drawing. How many students is that altogether?'],scoring:'Record independent correct answers out of 3. Note operation choice, calculation accuracy, and any extra prompting separately.'}
  ],
  writing:[
   {id:'sentence',title:`${grade} Written Expression — Sentence Writing`,description:'Complete ideas, sentence structure, and conventions.',purpose:'Establish which sentence features the student uses independently.',task:'Ask the student to write one sentence about something they noticed at school, without providing a sentence frame.',prompts:['Does the sentence express a complete idea?','Does it start with a capital letter?','Does it include appropriate ending punctuation?'],scoring:'Score each feature as present or not yet present. Record the writing sample, time to start, and any prompts separately.'},
   {id:'rehearsal',title:`${grade} Written Expression — Idea to Sentence`,description:'Compare oral expression with a written response.',purpose:'Identify what changes when the student moves from an oral idea to writing.',task:'Ask the student to describe a favorite activity aloud, then write the same idea as one sentence.',prompts:['Record the student’s oral sentence.','Compare the written sentence with the oral idea.','Note how the student starts writing and any support requested.'],scoring:'Record whether the written response preserves the complete idea. Note independent initiation and each prompt used.'}
  ]
 };
 return (items[domain]||items.reading).map(a=>({...a,domain}));
}

function presentAssessmentSuggestions(s) {
 const assessments=baselineAssessments(s);
 return `<section class="present-section present-assessments" aria-labelledby="present-assessments-title"><div class="present-section-heading"><h2 id="present-assessments-title">Suggested Baseline Assessments</h2><p>Confirm the starting point</p></div><div class="present-section-content">${assessments.length?`<p class="present-assessment-intro">Preview an example assessment for ${esc(s.name.split(' ')[0])}.</p><ul class="baseline-assessment-list">${assessments.map(a=>`<li><a href="#student/${s.id}" data-action="baseline-assessment" data-id="${s.id}" data-assessment="${a.id}" aria-haspopup="dialog"><span class="baseline-assessment-icon">${icon('plan')}</span><span><strong>${esc(a.title)}</strong><small>${esc(a.description)}</small></span><span class="baseline-assessment-preview">Preview ${icon('arrow')}</span></a></li>`).join('')}</ul>`:'<p class="present-empty">Add a learning goal to see relevant assessment examples.</p>'}</div></section>`;
}

function presentLevelsView(s) {
 if(isIntakeStudent(s))return intakeProfileView(s);
 const profile=presentLevelExample(s),notes=notesFor(s),parent=notes.find(n=>n.role==='Parent');
 const customNotes=notes.filter(n=>!n.id.startsWith('sample-'));
 const summary=profile?.summary||(customNotes.length?`${s.name.split(' ')[0]} has ${customNotes.length} saved ${customNotes.length===1?'observation':'observations'}. Review the input below and establish an academic baseline to build the present-level statement.`:'Start with classroom observations, family input, and a baseline assessment to describe this student’s current learning.');
 return `<div class="present-levels">
  <section class="present-summary" aria-labelledby="present-summary-title"><div class="present-section-top"><h2 id="present-summary-title">Summary</h2><span class="present-meta">${profile?'Example present levels · '+esc(domainNames[s.domain]):'Building the starting picture'}</span></div><p>${esc(summary)}</p></section>
  <section class="present-section" aria-labelledby="present-academic-title"><div class="present-section-heading"><h2 id="present-academic-title">Strengths &amp; Needs</h2><p>Academic</p></div><div class="present-section-content">
   <div class="present-academic-item"><h3>Strengths</h3><p>${esc(profile?.strengths||'Academic strengths have not been recorded yet.')}</p>${profile?presentNoteLink(s,profile.teacher):''}</div>
   <div class="present-academic-item"><h3>Needs</h3><p>${esc(profile?.needs||'Academic needs have not been recorded yet.')}</p>${profile?presentNoteLink(s,profile.support):''}</div>
   ${customNotes.some(n=>n.role!=='Parent')?`<details class="present-observations"><summary>Classroom observations</summary>${customNotes.filter(n=>n.role!=='Parent').map(n=>`<p>${esc(n.text)}</p>${presentNoteLink(s,n.id)}`).join('')}</details>`:''}
  </div></section>
  <section class="present-section" aria-labelledby="present-parent-title"><div class="present-section-heading"><h2 id="present-parent-title">Parent input</h2><p>Learning beyond school</p></div><div class="present-section-content">${parent?`<blockquote class="present-parent-quote"><p>${esc(parent.text)}</p></blockquote>${presentNoteLink(s,parent.id)}`:'<p class="present-empty">No parent input recorded yet.</p>'}<button class="text-btn present-add-note" data-action="present-parent-note" data-id="${s.id}">+ Add parent input</button></div></section>
  <section class="present-section" aria-labelledby="present-baseline-title"><div class="present-section-heading"><h2 id="present-baseline-title">Measurable baseline</h2><p>The starting point</p></div><div class="present-section-content">${presentBaselineView(s)}</div></section>
  ${presentAssessmentSuggestions(s)}
 </div>`;
}

function openPresentEvidence(s, source) {
 const note=notesFor(s).find(n=>n.id===source);
 const g=source.startsWith('baseline:')?findGoal(s.id,source.slice(9)):null,b=g?presentBaseline(s,g):null;
 if(!note&&!b?.record)return;
 const sample=note?note.id.startsWith('sample-'):true;
 const title=note?(note.role==='Parent'?'Parent input':'Classroom observation'):'Starting progress check';
 const date=note?.dateISO||b.record.date;
 const details=note?`<blockquote class="present-evidence-excerpt"><p>${esc(note.text)}</p></blockquote><p class="present-meta">${esc(note.author)} · ${esc(note.role)}</p>`:`<h3>${esc(b.objective.skill)}</h3><p class="present-source-result">${b.record.score}% independent accuracy</p><p>Usual accommodations; no extra help.</p>`;
 openModal(title,s.name,`<div class="present-evidence-preview"><p class="present-meta">${sample?'Example source':'Saved note'} · ${formatDate(date)}, ${date.slice(0,4)}</p>${details}<div class="present-destination"><strong>Evidence link destination: TBD</strong><p>This preview shows how the source will appear. The final evidence location has not been connected yet.</p></div><div class="modal-foot">${btn('Close','close')}</div></div>`);
}

function handlePresentLevelAction(action,el) {
 const s=students.find(s=>s.id===el.dataset.id);
 if(action==='open-student-profile'&&s){openStudentSection(s.id);return true;}
 if(action==='present-evidence'&&s){openPresentEvidence(s,el.dataset.source||'');return true;}
 if(action==='present-parent-note'&&s){contextModal(s.id);document.getElementById('context-role').value='Parent';return true;}
 if(action==='baseline-assessment'&&s){
  const a=baselineAssessments(s).find(a=>a.id===el.dataset.assessment);if(!a)return true;
  openModal(a.title,s.name,`<div class="baseline-assessment-modal"><span class="present-meta">Example assessment · Preview</span><p>${esc(a.purpose)}</p><section><h3>Task</h3><p>${esc(a.task)}</p></section><section><h3>${a.domain==='writing'?'What to observe':'Sample prompts'}</h3><ol>${a.prompts.map(p=>`<li>${esc(p)}</li>`).join('')}</ol></section><section><h3>What to record</h3><p>${esc(a.scoring)}</p></section><div class="modal-foot">${btn('Close preview','close')}</div></div>`,{wide:true});return true;
 }
 return false;
}
