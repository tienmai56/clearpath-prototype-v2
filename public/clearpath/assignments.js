'use strict';

let assignmentFlow=null;
let richSelection=null;
let assignmentSaveTimer=null;
let lessonGenerationTimer=null;
let lessonDeckSlideIndex=0;
let pendingLessonDeckId=null;
const LESSON_PLAN_LIMIT=20*1024*1024;
const LESSONS_PER_PAGE=5;
const adaptationSubjects={ela:'English language arts',math:'Math',science:'Science',social:'Social studies',other:'Other'};
const adaptationNeedOptions={
 communication:{communicationVisual:'Visual directions',communicationSentence:'Sentence starters',communicationChoice:'Choice-based responses',communicationAAC:'AAC or alternative response'},
 academic:{academicModel:'Modeled example',academicChunk:'Chunk the task',academicVocabulary:'Preteach vocabulary',academicGuided:'Guided practice'},
 accommodations:{accommodationReadAloud:'Read directions aloud',accommodationTime:'Extended time',accommodationBreaks:'Movement breaks',accommodationClutter:'Reduce visual clutter',accommodationCheck:'Frequent understanding checks'}
};
let lessonOverviewPagination={batchId:'',page:1};
function alphabeticalStudents(list=students){return list.slice().sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base',numeric:true}))}
function alphabeticalIds(ids){return ids.slice().sort((a,b)=>getStudent(a).name.localeCompare(getStudent(b).name,'en',{sensitivity:'base',numeric:true}))}
function gradeLabel(n){return +n===0?'Kindergarten':'Grade '+n}
function materialLabel(kind){return kind==='assessment'?'Assessment':kind==='lesson'?'Lesson plan':'Assignment'}
function createLessonDraft(domain='reading',context='',studentIds=[]){
 const d=lessonDefaults[domain],grade=studentIds.length?getStudent(studentIds[0]).grade:3;
 const draft={id:uid('draft'),domain,grade,title:d.title,source:d.source,change:/one step|one direction/i.test(context)?'Show one instruction at a time':d.change,context,a:d.a,b:d.b,directionsA:d.directionsA,directionsB:d.directionsB,custom:false,studentIds:alphabeticalIds(studentIds.filter(id=>lessonGoalsFor(id,domain).length)),objectiveIds:{},kind:'assignment',withVariations:false,questions:3,topic:'',instructions:'',duration:'45',language:'English',refinements:{standards:false,objectives:true,vocabulary:false,video:false,audio:false,activitySheet:false},theme:'low-stimulation',adaptation:{grade:String(grade),subject:domain==='math'?'math':'ela',language:'English',proficiency:'',readingLevel:'',masteryLevel:'',modality:'',otherNeeds:'',academicRecommendation:null}};
 for(const id of draft.studentIds)draft.objectiveIds[id]=defaultLessonObjective(id,domain)?.id;
 return draft;
}
function eligibleForDraft(draft){return alphabeticalStudents(students.filter(s=>s.grade===Number(draft.grade)&&lessonGoalsFor(s.id,draft.domain).length))}
function draftObjectiveLabel(id,o){const gs=goalPlansFor(id),g=gs.find(g=>g.id===o.goalId);return `Goal ${gs.indexOf(g)+1} / Objective ${(g?.objectives.findIndex(x=>x.id===o.id)??0)+1} · ${o.skill}`}
function openDraftingModal(id){
 const s=getStudent(id),g=activeGoal(id),o=activeObjective(id);
 if(!g||!o)return toast('Establish an objective in the IEP plan first.');
 const context=guidanceFor(s).map(x=>x.title+'. '+x.detail).join('\n');
 const model=createLessonDraft(g.domain,context,[id]);model.objectiveIds[id]=o.id;model.kind='assessment';model.questions=5;
 assignmentFlow={stage:'setup',model,recordId:null};renderDraftingModal();
}
function renderDraftingModal(){const f=assignmentFlow;if(!f)return;openModal('Draft with AI',alphabeticalIds(f.model.studentIds).map(id=>getStudent(id).name).join(', '),assignmentSetupForm(f.model,true));}
function draftContext(form){return {form,popup:form?.dataset?.assignmentSetup==='popup',automatic:form?.dataset?.automaticTargets==='true',model:form?.dataset?.assignmentSetup==='popup'?assignmentFlow?.model:lesson}}
function preserveDraftInputs(model,form){
 if(!model||!form)return;
 for(const key of ['title','source','kind','change','topic','instructions','duration','language']){const input=form.querySelector?.(`[name="${key}"]`);if(input)model[key]=input.value;}
 if(model.workflow==='adapt'){
  ensureLessonWizardDefaults(model);const grade=form.querySelector?.('[name="adaptGrade"]'),subject=form.querySelector?.('[name="adaptSubject"]');
  if(grade)model.adaptation.grade=grade.value;if(subject)model.adaptation.subject=subject.value;
 }
}
function redrawDraft(ctx){if(ctx.popup)renderDraftingModal();else render()}
function handleAssignmentChange(input){
 const form=input.closest?.('form[data-assignment-setup]');if(!form)return false;
 const ctx=draftContext(form);if(!ctx.model)return false;
 preserveDraftInputs(ctx.model,form);return handleAssignmentSelection(input,ctx);
}
function submitAssignmentSetup(values,form){
 const ctx=draftContext(form),draft=ctx.model,error=ctx.popup?'draft-error':'lesson-error';if(!draft)return;
 if(!draft.studentIds.length)return formError(error,'Select at least one student.');
 normalizeDraftSelection(draft);
 if(!draftGoalsComplete(draft))return formError(error,'Select a goal for each student.');
 if(!draftObjectivesComplete(draft))return formError(error,'Choose an objective that is ready to use for each student.');
 const kind=values.kind||draft.kind;
 if(!['assignment','assessment'].includes(kind))return formError(error,'Choose an assignment or assessment.');
 syncDraftSelection(draft);
 delete draft.workflow;delete draft.upload;delete draft.generationPending;delete draft.generationError;
 Object.assign(draft,{title:values.title?.trim()||draft.title,source:values.source?.trim()||draft.source,kind,questions:kind==='assessment'?5:3,withVariations:false,change:values.change||draft.change});
 const original=lessonDefaults[draft.domain];draft.custom=draft.source!==original.source;
 if(!ctx.popup){state.lesson=structuredClone(draft);persist();}
 const records=createStudentAssignments(draft,{revisionOf:ctx.popup?assignmentFlow.recordId:null});
 if(!records)return formError(error,'Could not save the drafts. Free some browser storage and try again.');
 navigate('assignments/'+records[0].batchId);
}
function ensureLessonWizardDefaults(draft){
 draft.topic ??='';draft.instructions ??='';draft.duration ||= '45';draft.language ||= 'English';draft.theme ||= 'low-stimulation';
 draft.refinements={standards:false,objectives:true,vocabulary:false,video:false,audio:false,activitySheet:false,...draft.refinements};
 draft.adaptation={grade:String(draft.grade??3),subject:draft.domain==='math'?'math':'ela',language:draft.language||'English',proficiency:'',readingLevel:'',masteryLevel:'',modality:'',otherNeeds:'',academicRecommendation:null,...draft.adaptation};
 if(!adaptationSubjects[draft.adaptation.subject])draft.adaptation.subject=draft.domain==='math'?'math':'ela';
 for(const group of Object.values(adaptationNeedOptions))for(const key of Object.keys(group))draft.adaptation[key]=!!draft.adaptation[key];
 return draft;
}
function lessonWizardSteps(active,draft=lesson){
 const steps=draft?.workflow==='adapt'?[['topic','Lesson'],['refine','Student needs'],['theme','Review']]:[['topic','Topic'],['refine','Refine'],['theme','Theme']],current=steps.findIndex(([key])=>key===active);
 return `<nav class="lesson-wizard-steps" aria-label="Lesson creation steps">${steps.map(([key,label],i)=>`${i?'<span class="lesson-step-line" aria-hidden="true"></span>':''}${i<current?`<a href="#studio/${key}" class="lesson-step complete"><span>${i+1}</span><strong>${label}</strong></a>`:`<span class="lesson-step ${i===current?'active':''}" ${i===current?'aria-current="step"':''}><span>${i+1}</span><strong>${label}</strong></span>`}`).join('')}</nav>`;
}
function lessonPlanUploadField(draft){
 const upload=draft.upload,required=draft.workflow==='adapt';
 return `<section class="lesson-source"><div class="lesson-source-heading"><div><h2>${required?'Add your class lesson':'Add a lesson or resource'}</h2><p>${required?'Upload the lesson you want to personalize.':'Optional · Give Clearpath more context for the lesson.'}</p></div></div><div class="lesson-plan-drop ${upload?'has-file':''}">${upload?`${icon('plan')}<div><strong>${esc(upload.name)}</strong><small>${lessonFileSize(upload.size)}</small></div><button type="button" class="text-btn" data-action="remove-lesson-plan">Remove</button>`:`${icon('upload')}<h3>Drop a file here or choose from your device</h3><p>PDF, Word, PowerPoint, TXT, or RTF · Up to 20 MB</p><button type="button" class="btn" data-action="choose-lesson-plan">Choose file</button>`}</div><input id="lesson-plan-file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden><div id="lesson-upload-error" aria-live="polite"></div></section>`;
}
function adaptationOptions(options,selected){return options.map(([value,label])=>`<option value="${esc(value)}" ${selected===value?'selected':''}>${esc(label)}</option>`).join('')}
function adaptationOptionLabel(options,selected){return options.find(([value])=>value===selected)?.[1]||'Not specified'}
function adaptationGradeOptions(selected){return Array.from({length:13},(_,grade)=>[String(grade),gradeLabel(grade)]).map(([value,label])=>`<option value="${value}" ${String(selected)===value?'selected':''}>${label}</option>`).join('')}
function academicEvidenceForStudent(s){
 const saved=intakeSession(s.id)?.savedDrafts?.presentLevels||{},example=typeof presentLevelExample==='function'?presentLevelExample(s):null;
 const presentText=[saved.summary,saved.strengths,saved.needs,saved.baseline,example?.summary,example?.needs].map(value=>String(value||'').trim()).filter(value=>value&&!/^\s*\[/.test(value)).join(' ');
 const logged=(state.logs||[]).filter(record=>record.student===s.id&&Number.isFinite(Number(record.score))).map(record=>Number(record.score));
 const prior=logged.length?logged:(s.points||[]).filter(value=>Number.isFinite(Number(value))).map(Number),latest=prior.length?prior[prior.length-1]:Number(s.score);
 let score=Number.isFinite(latest)?Math.max(0,Math.min(100,latest)):65;
 const baselineMatch=String(saved.baseline||'').match(/\b(100|\d{1,2})\s*%/);if(baselineMatch)score=Math.round((score+Number(baselineMatch[1]))/2);
 if(/far below|intensive support|significant difficulty/i.test(presentText))score=Math.min(score,44);
 return {student:s,presentText,score,evaluationCount:prior.length};
}
function academicSupportRecommendation(draft){
 const evidence=draft.studentIds.map(id=>academicEvidenceForStudent(getStudent(id))),lowest=evidence.length?evidence.reduce((a,b)=>a.score<=b.score?a:b):null,score=lowest?.score??65;
 const readingLevel=score<45?'emergent':score<65?'developing':score<80?'transitional':'independent';
 const masteryLevel=score<50?'far-below':score<70?'approaching':score<86?'at-grade':'above';
 const evaluations=evidence.reduce((sum,item)=>sum+item.evaluationCount,0),names=evidence.map(item=>item.student.name.split(' ')[0]);
 const subject=names.length===1?`${names[0]}’s`:names.length===2?`${names[0]} and ${names[1]}’s`:`the ${names.length} selected students’`;
 const signature=evidence.map(item=>`${item.student.id}:${item.score}:${item.evaluationCount}:${item.presentText}`).join('|');
 return {readingLevel,masteryLevel,evaluations,signature,sourceText:`Based on ${subject} present levels${evaluations?` and ${evaluations} past ${evaluations===1?'evaluation':'evaluations'}`:''}.`};
}
function applyAcademicSupportRecommendation(draft){
 const recommendation=academicSupportRecommendation(draft),a=draft.adaptation;
 if(a.academicRecommendation?.signature!==recommendation.signature){a.readingLevel=recommendation.readingLevel;a.masteryLevel=recommendation.masteryLevel;a.academicRecommendation=recommendation;}
 return a.academicRecommendation;
}
function adaptLessonTopicView(draft){
 ensureLessonWizardDefaults(draft);ensureAutomaticLessonTargets(draft);
 const selected=draft.studentIds.length,missing=draft.studentIds.filter(id=>!objectiveForDraft(draft,id));
 return `<div class="lesson-wizard adapt-workflow">${lessonWizardSteps('topic',draft)}<header class="lesson-wizard-heading"><p class="eyebrow">Adapt a class lesson</p><h1>Add the lesson and choose students</h1></header><form id="lesson-topic-form" class="lesson-wizard-form" data-assignment-setup="page" data-automatic-targets="true"><input type="hidden" name="workflow" value="adapt"><section class="lesson-wizard-card adapt-lesson-card">${lessonPlanUploadField(draft)}<div class="lesson-field lesson-students-field">${assignmentStudents(draft,'lesson')}${missing.length?`<div class="selection-warning" role="status">${esc(missing.map(id=>getStudent(id).name).join(', '))} ${missing.length===1?'needs':'need'} an approved IEP objective before a lesson can be created.</div>`:''}<p class="adapt-data-note">Uses saved present levels, IEP goals, and latest progress.</p></div><div class="lesson-field"><label for="lesson-instructions">Additional notes about student interests <span>Optional</span></label><textarea id="lesson-instructions" name="instructions" rows="3" maxlength="1600" placeholder="e.g. Alex likes to work with maps and color.">${esc(draft.instructions)}</textarea></div></section><div id="lesson-topic-error" aria-live="polite"></div><div class="lesson-wizard-actions"><a class="btn" href="#studio">Cancel</a><button class="btn primary" type="submit" ${!selected||missing.length?'disabled':''}>Continue ${icon('arrow')}</button></div></form></div>`;
}
function lessonSlideSubject(draft){
 const topic=String(draft.topic||'The water cycle').toLowerCase();
 if(/water|weather|plant|animal|earth|space|cycle|energy|science/.test(topic))return 'Science';
 return draft.domain==='math'?'Mathematics':draft.domain==='writing'?'Writing workshop':'Language arts';
}
function lessonSlideSteps(draft){
 const topic=String(draft.topic||'The water cycle').toLowerCase();
 if(/water|weather|rain|cycle/.test(topic))return [
  ['01','Evaporation','The sun warms water and lifts it into the air.'],
  ['02','Condensation','Water vapor cools and gathers into clouds.'],
  ['03','Precipitation','Water returns to Earth as rain or snow.']
 ];
 if(/plant|seed|flower|garden/.test(topic))return [
  ['01','Seed','A seed holds everything a new plant needs to begin.'],
  ['02','Sprout','Roots reach down while a small shoot reaches up.'],
  ['03','Grow','Leaves gather sunlight so the plant can grow.']
 ];
 if(draft.domain==='math')return [
  ['01','Understand','Circle what the problem is asking.'],
  ['02','Solve','Choose an operation and show your thinking.'],
  ['03','Check','Use a second strategy to verify the answer.']
 ];
 if(draft.domain==='writing')return [
  ['01','Think','Say your complete idea out loud.'],
  ['02','Draft','Write the idea with one clear detail.'],
  ['03','Revise','Read it back and make it stronger.']
 ];
 return [
  ['01','Notice','Find the important people, places, and events.'],
  ['02','Sequence','Put the key moments in a clear order.'],
  ['03','Retell','Use your own words to explain what happened.']
 ];
}
function lessonSlideHeadline(draft){
 const topic=String(draft.topic||'').trim();
 if(!topic)return ['Water is always','on the move.'];
 const words=topic.replace(/[.!?]+$/,'').split(/\s+/).filter(Boolean),split=Math.max(1,Math.ceil(words.length*.55));
 return [words.slice(0,split).join(' '),words.slice(split).join(' ')||'made clear.'];
}
function lessonSlidePreview(draft,{id='lesson-live-preview',compact=false}={}){
 const [lineOne,lineTwo]=lessonSlideHeadline(draft),steps=lessonSlideSteps(draft),subject=lessonSlideSubject(draft),student=draft.studentIds?.length?getStudent(draft.studentIds[0]):null;
 const topic=String(draft.topic||'The water cycle').trim(),theme=lessonThemeLabels[draft.theme]?draft.theme:'low-stimulation';
 return `<div class="lesson-slide-frame ${compact?'is-compact':''}" id="${esc(id)}"><article class="lesson-slide lesson-slide-process lesson-slide-theme-${theme}" aria-label="Preview slide for ${esc(topic)}"><span class="lesson-slide-orb orb-one" aria-hidden="true"></span><span class="lesson-slide-orb orb-two" aria-hidden="true"></span><header class="lesson-slide-header"><span>${esc(subject)} · ${esc(draftGradeLabel(draft))}</span><span>04</span></header><div class="lesson-slide-main"><div class="lesson-slide-copy"><p class="lesson-slide-eyebrow">Build the big idea</p><h2><span>${esc(lineOne)}</span><strong>${esc(lineTwo)}</strong></h2><p>Follow the idea in three clear moves. Then use the pattern to explain it in your own words.</p></div><div class="lesson-slide-process-list">${steps.map(([number,title,description],index)=>`<div class="lesson-slide-step"><span class="lesson-slide-step-number">${number}</span><div><strong>${esc(title)}</strong><p>${esc(description)}</p></div>${index<steps.length-1?'<span class="lesson-slide-connector" aria-hidden="true">→</span>':''}</div>`).join('')}</div></div><footer class="lesson-slide-footer"><span><i aria-hidden="true"></i>${student?`Personalized for ${esc(student.name.split(' ')[0])}`:'Clearpath lesson studio'}</span><span>${esc(topic)}</span></footer></article></div>`;
}
function lessonTopicView(draft){
 if(draft.workflow==='adapt')return adaptLessonTopicView(draft);
 ensureLessonWizardDefaults(draft);ensureAutomaticLessonTargets(draft);
 const selected=draft.studentIds.length,missing=draft.studentIds.filter(id=>!objectiveForDraft(draft,id));
 const objective=selected?objectiveForDraft(draft,draft.studentIds[0]):null;
 return `<div class="lesson-studio"><header class="lesson-studio-header"><div><a href="#studio" class="lesson-studio-back">${icon('back')} Lesson studio</a><div class="lesson-studio-title"><h1>Create a lesson deck</h1><span>Draft</span></div></div><button class="btn primary lesson-studio-continue" form="lesson-topic-form" type="submit" ${!selected||missing.length?'disabled':''}>Continue ${icon('arrow')}</button></header><div class="lesson-studio-steps">${lessonWizardSteps('topic')}</div><div class="lesson-studio-layout"><aside class="lesson-studio-builder"><div class="lesson-studio-builder-head"><span>Step 1 of 3</span><h2>Shape the lesson</h2><p>Set the topic and audience. The sample slide updates as you type.</p></div><form id="lesson-topic-form" class="lesson-wizard-form" data-assignment-setup="page" data-automatic-targets="true"><input type="hidden" name="workflow" value="${draft.workflow==='adapt'?'adapt':'scratch'}"><div class="lesson-field"><label for="lesson-topic">Lesson topic</label><input id="lesson-topic" name="topic" value="${esc(draft.topic)}" maxlength="160" required placeholder="e.g. The water cycle"></div><div class="lesson-field lesson-students-field">${assignmentStudents(draft,'lesson')}<div class="lesson-studio-data-note"><span>${icon('check')}Present levels</span><span>${icon('check')}IEP goals</span><span>${icon('check')}Latest progress</span></div>${missing.length?`<div class="selection-warning" role="status">${esc(missing.map(id=>getStudent(id).name).join(', '))} ${missing.length===1?'needs':'need'} an approved IEP objective first.</div>`:''}</div>${objective?`<div class="lesson-studio-objective"><span>${icon('target')}</span><div><small>Personalization target</small><strong>${esc(objective.skill)}</strong></div></div>`:''}<div class="lesson-quick-settings lesson-studio-settings"><div class="lesson-setting-static"><span>Grade</span><strong>${esc(draftGradeLabel(draft))}</strong></div><label><span>Length</span><select name="duration"><option value="30" ${draft.duration==='30'?'selected':''}>30 min</option><option value="45" ${draft.duration==='45'?'selected':''}>45 min</option><option value="60" ${draft.duration==='60'?'selected':''}>60 min</option></select></label><label><span>Language</span><select name="language"><option ${draft.language==='English'?'selected':''}>English</option><option ${draft.language==='Spanish'?'selected':''}>Spanish</option></select></label></div><details class="lesson-studio-more"><summary>More direction ${icon('down')}</summary><div class="lesson-field"><label for="lesson-instructions">Specific instructions <span>Optional</span></label><textarea id="lesson-instructions" name="instructions" rows="3" maxlength="1600" placeholder="e.g. Use simple vocabulary and add a movement break">${esc(draft.instructions)}</textarea></div>${lessonPlanUploadField(draft)}</details><div id="lesson-topic-error" aria-live="polite"></div><div class="lesson-studio-mobile-actions"><a class="btn" href="#studio">Cancel</a><button class="btn primary" type="submit" ${!selected||missing.length?'disabled':''}>Continue ${icon('arrow')}</button></div></form></aside><section class="lesson-studio-preview" aria-labelledby="lesson-preview-title"><div class="lesson-studio-preview-toolbar"><div><span class="lesson-preview-live"><i></i>Live preview</span><strong id="lesson-preview-title">Concept slide</strong></div><div class="lesson-preview-count"><span>4</span><small>/ 12</small></div></div><div class="lesson-studio-canvas">${lessonSlidePreview(draft)}</div><div class="lesson-studio-preview-foot"><div><span class="lesson-preview-avatar">${studentAvatarStack(draft.studentIds)}</span><p><strong>${selected?`${selected} personalized ${selected===1?'deck':'decks'}`:'Sample deck'}</strong><small>Student data stays in this browser</small></p></div><span class="lesson-preview-aspect">16:9</span></div></section></div></div>`;
}
function studentAvatarStack(ids=[]){
 const list=ids.slice(0,3);if(!list.length)return '<span class="lesson-preview-placeholder">CP</span>';
 return list.map(id=>avatar(getStudent(id),'tiny')).join('')+(ids.length>3?`<span class="lesson-preview-more">+${ids.length-3}</span>`:'');
}
function refreshLessonStudioPreview(){
 const form=document.getElementById('lesson-topic-form');if(!lesson||!form)return;
 preserveDraftInputs(lesson,form);const current=document.getElementById('lesson-live-preview');if(current)current.outerHTML=lessonSlidePreview(lesson);
}
function lessonRefineOption(key,title,description,iconName){
 const checked=!!lesson.refinements[key];
 return `<label class="lesson-refine-option ${checked?'selected':''}"><input type="checkbox" name="${key}" ${checked?'checked':''}><span class="lesson-option-icon">${icon(iconName)}</span><span><strong>${esc(title)}</strong><small>${esc(description)}</small></span><span class="lesson-option-check" aria-hidden="true">${checked?icon('check'):''}</span></label>`;
}
function adaptationCheckboxes(group){
 const a=lesson.adaptation;
 return `<div class="adapt-choice-list">${Object.entries(adaptationNeedOptions[group]).map(([key,label])=>`<label><input type="checkbox" name="${key}" ${a[key]?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div>`;
}
function adaptStudentNeedsView(draft){
 ensureLessonWizardDefaults(draft);const a=draft.adaptation,recommendation=applyAcademicSupportRecommendation(draft);
 const languages=[['English','English'],['Spanish','Spanish'],['Bilingual English and Spanish','Bilingual English and Spanish'],['Other','Other']];
 const proficiency=[['','Not specified'],['emerging','Emerging'],['developing','Developing'],['expanding','Expanding'],['bridging','Bridging']];
 const reading=[['','Not specified'],['emergent','Emergent'],['developing','Developing'],['transitional','Transitional'],['independent','Independent']];
 const mastery=[['','Not specified'],['far-below','Far below grade level'],['approaching','Approaching grade level'],['at-grade','At grade level'],['above','Above grade level']];
 const modalities=[['','Not specified'],['visual','Visual'],['auditory','Auditory'],['kinesthetic','Kinesthetic'],['reading-writing','Reading and writing']];
 const editingAcademic=!!recommendation.editing;
 const academicValues=editingAcademic?`<div class="adapt-field-grid academic-support-editor"><label><span>Reading level</span><select name="readingLevel">${adaptationOptions(reading,a.readingLevel)}</select></label><label><span>Content mastery</span><select name="masteryLevel">${adaptationOptions(mastery,a.masteryLevel)}</select></label></div>`:`<dl class="adapt-recommended-values"><div><dt>Reading level</dt><dd>${esc(adaptationOptionLabel(reading,a.readingLevel))}</dd></div><div><dt>Content mastery</dt><dd>${esc(adaptationOptionLabel(mastery,a.masteryLevel))}</dd></div></dl>`;
 return `<div class="lesson-wizard adapt-workflow">${lessonWizardSteps('refine',draft)}<header class="lesson-wizard-heading"><p class="eyebrow">Step 2 of 3</p><h1>Choose student supports</h1><p>Add only what matters for this lesson. Saved IEP and progress information is already included.</p></header><form id="lesson-refine-form" class="lesson-wizard-form"><div class="adapt-needs-list"><details class="adapt-needs-section" open><summary><span>Language &amp; communication</span>${icon('down')}</summary><div class="adapt-needs-body"><div class="adapt-field-grid"><label><span>Instruction language</span><select name="adaptLanguage">${adaptationOptions(languages,a.language)}</select></label><label><span>Language proficiency</span><select name="proficiency">${adaptationOptions(proficiency,a.proficiency)}</select></label></div><fieldset><legend>Communication supports</legend>${adaptationCheckboxes('communication')}</fieldset></div></details><details class="adapt-needs-section" open><summary><span>Academic support</span>${icon('down')}</summary><div class="adapt-needs-body"><div class="adapt-ai-recommendation">${icon('spark')}<p><strong>AI recommendation</strong><span>${esc(recommendation.sourceText)}</span></p><button type="button" class="text-btn" data-action="${editingAcademic?'done-academic-support':'edit-academic-support'}">${editingAcademic?'Done':'Edit'}</button></div>${academicValues}<fieldset><legend>Scaffolds</legend>${adaptationCheckboxes('academic')}</fieldset></div></details><details class="adapt-needs-section" open><summary><span>Learning accommodations</span>${icon('down')}</summary><div class="adapt-needs-body"><div class="adapt-field-grid one-column"><label><span>Preferred learning modality</span><select name="modality">${adaptationOptions(modalities,a.modality)}</select></label></div><fieldset><legend>Accommodations</legend>${adaptationCheckboxes('accommodations')}</fieldset></div></details></div><div class="adapt-other-needs"><label for="adapt-other-needs">Anything else? <span>Optional</span></label><input id="adapt-other-needs" name="otherNeeds" value="${esc(a.otherNeeds)}" maxlength="300" placeholder="Add a support specific to this lesson"></div><div id="lesson-refine-error" aria-live="polite"></div><div class="lesson-wizard-actions"><a class="btn" href="#studio/topic">Back</a><button class="btn primary" type="submit">Review ${icon('arrow')}</button></div></form></div>`;
}
function lessonRefineView(draft){
 if(draft.workflow==='adapt')return adaptStudentNeedsView(draft);
 ensureLessonWizardDefaults(draft);
 return `<div class="lesson-wizard">${lessonWizardSteps('refine')}<header class="lesson-wizard-heading"><p class="eyebrow">Step 2 of 3</p><h1>Refine your lesson</h1><p>Everything here is optional. Choose only what would help your students.</p></header><form id="lesson-refine-form" class="lesson-wizard-form"><section class="lesson-refine-group" aria-labelledby="refine-lesson-title"><h2 id="refine-lesson-title">Lesson</h2>${lessonRefineOption('standards','Align to standards','Connect the lesson to relevant grade-level standards.','book')}${lessonRefineOption('objectives','Learning goals and objectives','Include clear, student-friendly outcomes.','target')}${lessonRefineOption('vocabulary','Key vocabulary list','Highlight the words students need for this lesson.','note')}</section><section class="lesson-refine-group" aria-labelledby="refine-resources-title"><h2 id="refine-resources-title">Resources</h2>${lessonRefineOption('video','Video suggestion','Include a relevant classroom-safe video suggestion.','video')}${lessonRefineOption('audio','Audio activity','Add a short listening activity.','message')}${lessonRefineOption('activitySheet','Activity sheet','Include a print-ready practice activity.','print')}</section><div class="lesson-wizard-actions"><a class="btn" href="#studio/topic">Back</a><button class="btn primary" type="submit">Continue ${icon('arrow')}</button></div></form></div>`;
}
const lessonThemeLabels={'low-stimulation':'Low stimulation',dyslexia:'Dyslexia','low-vision':'Low vision',adhd:'ADHD'};
function lessonThemeCard(key,title,description){
 const checked=lesson.theme===key;
 return `<label class="lesson-theme-card theme-${key} ${checked?'selected':''}" data-lesson-theme="${key}"><input type="radio" name="theme" value="${key}" ${checked?'checked':''}><span class="theme-selected">${checked?icon('check'):''}</span><span class="theme-name">${esc(title)}</span><span class="theme-sample-title">Explore the water cycle</span><span class="theme-sample-body">Water moves between the land, sky, and living things.</span><span class="theme-sample-accent">Key idea</span><small>${esc(description)}</small></label>`;
}
function selectedAdaptationNeeds(a){
 const labels=[];
 for(const group of Object.values(adaptationNeedOptions))for(const [key,label] of Object.entries(group))if(a[key])labels.push(label);
 if(a.modality)labels.push({visual:'Visual learning','auditory':'Auditory learning',kinesthetic:'Kinesthetic learning','reading-writing':'Reading and writing'}[a.modality]);
 if(a.proficiency)labels.push({emerging:'Emerging language proficiency',developing:'Developing language proficiency',expanding:'Expanding language proficiency',bridging:'Bridging language proficiency'}[a.proficiency]);
 if(a.readingLevel)labels.push({emergent:'Emergent reading level',developing:'Developing reading level',transitional:'Transitional reading level',independent:'Independent reading level'}[a.readingLevel]);
 if(a.masteryLevel)labels.push({'far-below':'Far below grade-level mastery',approaching:'Approaching grade-level mastery','at-grade':'At grade-level mastery',above:'Above grade-level mastery'}[a.masteryLevel]);
 if(a.otherNeeds)labels.push(a.otherNeeds);
 return labels.filter(Boolean);
}
function adaptReviewView(draft){
 ensureLessonWizardDefaults(draft);const a=draft.adaptation,needs=selectedAdaptationNeeds(a),students=draft.studentIds.map(id=>getStudent(id).name).join(', ');
 return `<div class="lesson-wizard adapt-workflow">${lessonWizardSteps('theme',draft)}<header class="lesson-wizard-heading"><p class="eyebrow">Step 3 of 3</p><h1>Review the adaptation</h1></header><form id="lesson-theme-form" class="lesson-wizard-form"><input type="hidden" name="theme" value="low-stimulation"><div class="adapt-review"><section><h2>Class lesson</h2><dl><div><dt>File</dt><dd>${esc(draft.upload?.name||'No file')}</dd></div><div><dt>Topic</dt><dd>${esc(draft.topic)}</dd></div><div><dt>Context</dt><dd>${esc(gradeLabel(Number(a.grade)))} · ${esc(adaptationSubjects[a.subject]||'Other')} · ${esc(draft.duration)} minutes</dd></div></dl></section><section><h2>Students</h2><p>${esc(students)}</p><small>Uses each student’s present levels, IEP goals, and latest progress.</small></section><section><h2>Student needs</h2>${needs.length?`<ul>${needs.map(label=>`<li>${esc(label)}</li>`).join('')}</ul>`:'<p>No additional supports selected. Clearpath will use the supports already saved for each student.</p>'}</section>${draft.instructions?`<section><h2>Keep from the original</h2><p>${esc(draft.instructions)}</p></section>`:''}</div><div id="lesson-theme-error" aria-live="polite"></div><div class="lesson-wizard-actions"><a class="btn" href="#studio/refine">Back</a><button class="btn primary" type="submit">Generate adaptations ${icon('spark')}</button></div></form></div>`;
}
function lessonThemeView(draft){
 if(draft.workflow==='adapt')return adaptReviewView(draft);
 ensureLessonWizardDefaults(draft);
 return `<div class="lesson-wizard">${lessonWizardSteps('theme')}<header class="lesson-wizard-heading"><p class="eyebrow">Step 3 of 3</p><h1>Choose a learning-friendly theme</h1><p>Select a visual direction for this draft. These cards are previews only.</p></header><form id="lesson-theme-form" class="lesson-wizard-form"><fieldset class="lesson-theme-grid"><legend class="sr-only">Lesson theme</legend>${lessonThemeCard('low-stimulation','Low stimulation','Muted color, quiet spacing, and fewer visual distractions.')}${lessonThemeCard('dyslexia','Dyslexia','Readable type, generous spacing, and clear text structure.')}${lessonThemeCard('low-vision','Low vision','Large type and strong contrast for easier scanning.')}${lessonThemeCard('adhd','ADHD','Short sections, clear cues, and visible next steps.')}</fieldset><p class="theme-note">Theme previews are illustrative. Your lesson content will remain editable before you use it.</p><div id="lesson-theme-error" aria-live="polite"></div><div class="lesson-wizard-actions"><a class="btn" href="#studio/refine">Back</a><button class="btn primary" type="submit">Generate lessons ${icon('spark')}</button></div></form></div>`;
}
function submitLessonTopic(values){
 if(!lesson)return;ensureLessonWizardDefaults(lesson);ensureAutomaticLessonTargets(lesson);
 const topic=lesson.workflow==='adapt'?lessonPlanTopic(lesson):String(values.topic??lesson.topic).trim(),instructions=String(values.instructions??lesson.instructions).trim();
 if(!lesson.studentIds.length)return formError('lesson-topic-error','Select at least one student.');
 if(!draftObjectivesComplete(lesson))return formError('lesson-topic-error','Each student needs an approved IEP objective before a lesson can be created.');
 if(lesson.workflow!=='adapt'&&!topic)return formError('lesson-topic-error','Add a lesson topic to continue.');
 if(lesson.workflow==='adapt'&&!lesson.upload)return formError('lesson-topic-error','Add the class lesson you want to personalize.');
 if(lesson.workflow==='adapt'){
  const grade=Number(lesson.grade),subject=lesson.domain==='math'?'math':lesson.domain==='writing'||lesson.domain==='reading'?'ela':lesson.adaptation.subject;
  Object.assign(lesson.adaptation,{grade:String(Number.isInteger(grade)?grade:3),subject:adaptationSubjects[subject]?subject:'other'});
 }
 Object.assign(lesson,{topic,instructions,duration:['30','45','60'].includes(values.duration)?values.duration:lesson.duration,language:['English','Spanish'].includes(values.language)?values.language:lesson.language,title:topic,kind:'lesson',studentPickerOpen:false});
 state.lesson=structuredClone(lesson);persist();navigate('studio/refine');
}
function updateAdaptationFromValues(draft,values){
 const a=draft.adaptation,allowed={language:['English','Spanish','Bilingual English and Spanish','Other'],proficiency:['','emerging','developing','expanding','bridging'],readingLevel:['','emergent','developing','transitional','independent'],masteryLevel:['','far-below','approaching','at-grade','above'],modality:['','visual','auditory','kinesthetic','reading-writing']};
 if(values.adaptLanguage!==undefined&&allowed.language.includes(values.adaptLanguage))a.language=values.adaptLanguage;
 for(const key of ['proficiency','readingLevel','masteryLevel','modality'])if(values[key]!==undefined)a[key]=allowed[key].includes(values[key])?values[key]:'';
 if(a.academicRecommendation)a.academicRecommendation.edited=a.readingLevel!==a.academicRecommendation.readingLevel||a.masteryLevel!==a.academicRecommendation.masteryLevel;
 for(const group of Object.values(adaptationNeedOptions))for(const key of Object.keys(group))a[key]=values[key]!==undefined&&values[key]!==false;
 if(values.otherNeeds!==undefined)a.otherNeeds=String(values.otherNeeds||'').trim().slice(0,300);
}
function setAcademicSupportEditing(editing,form){
 if(!lesson||lesson.workflow!=='adapt')return;
 ensureLessonWizardDefaults(lesson);const recommendation=applyAcademicSupportRecommendation(lesson);
 if(form)updateAdaptationFromValues(lesson,Object.fromEntries(new FormData(form)));
 recommendation.editing=editing;state.lesson=structuredClone(lesson);persist();render();
}
function submitLessonRefine(values){
 if(!lesson)return;ensureLessonWizardDefaults(lesson);
 if(lesson.workflow==='adapt'){
  updateAdaptationFromValues(lesson,values);if(lesson.adaptation.academicRecommendation)lesson.adaptation.academicRecommendation.editing=false;
  state.lesson=structuredClone(lesson);persist();navigate('studio/theme');return;
 }
 for(const key of Object.keys(lesson.refinements))lesson.refinements[key]=values[key]!==undefined&&values[key]!==false;
 state.lesson=structuredClone(lesson);persist();navigate('studio/theme');
}
function submitLessonTheme(values){
 if(!lesson)return;ensureLessonWizardDefaults(lesson);
 if(lesson.workflow==='adapt'){lesson.theme='low-stimulation';state.lesson=structuredClone(lesson);persist();beginLessonGeneration();return;}
 if(!lessonThemeLabels[values.theme])return formError('lesson-theme-error','Choose a theme to continue.');
 lesson.theme=values.theme;state.lesson=structuredClone(lesson);persist();beginLessonGeneration();
}
function lessonPlanFileType(file){
 const extension=String(file?.name||'').split('.').pop().toLowerCase();
 return ['pdf','doc','docx','ppt','pptx','txt','rtf'].includes(extension)?extension:'';
}
function lessonFileSize(size){return size<1024*1024?Math.max(1,Math.round(size/1024))+' KB':(size/(1024*1024)).toFixed(1)+' MB'}
function lessonPlanTopic(draft){return String(draft.upload?.name||'').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim()||'Adapted class lesson'}
function setLessonPlanFile(file){
 if(!lesson||!file)return;
 const type=lessonPlanFileType(file);
 if(!type)return formError('lesson-upload-error','Choose a PDF, Word, PowerPoint, text, or RTF lesson plan.');
 if(file.size<=0||file.size>LESSON_PLAN_LIMIT)return formError('lesson-upload-error','Choose a lesson plan under 20 MB that is not empty.');
 lesson.upload={name:file.name,size:file.size,type:file.type||type};if(lesson.workflow==='adapt')lesson.topic=lessonPlanTopic(lesson);state.lesson=structuredClone(lesson);persist();render();
}
function beginLessonGeneration(){
 if(!lesson)return;
 ensureAutomaticLessonTargets(lesson);lesson.kind='lesson';lesson.generationPending=true;lesson.generationError='';state.lesson=structuredClone(lesson);persist();return finishLessonGeneration();
}
function queueLessonGeneration(){if(lessonGenerationTimer||!lesson?.generationPending)return;lessonGenerationTimer=setTimeout(finishLessonGeneration,1400)}
function finishLessonGeneration(){
 clearTimeout(lessonGenerationTimer);lessonGenerationTimer=null;
 if(!lesson?.generationPending)return null;
 ensureAutomaticLessonTargets(lesson);
 const records=createStudentAssignments(lesson);
 if(!records){lesson.generationPending=false;lesson.generationError='The lesson plans could not be saved. Free some browser storage and try again.';state.lesson=structuredClone(lesson);persist();if(route().page==='studio'&&route().id==='processing')render();else formError('lesson-theme-error',lesson.generationError);return null;}
 lesson.generationPending=false;state.lesson=structuredClone(lesson);persist();pendingLessonDeckId=records[0].id;navigate('assignments/'+records[0].batchId);return records;
}
function openPendingLessonDeck(){const id=pendingLessonDeckId;if(!id)return false;pendingLessonDeckId=null;openLessonDeck(id,0);return true;}
function lessonProcessingView(draft){
 queueLessonGeneration();
 const count=draft.studentIds.length,adapted=draft.workflow==='adapt';
 return `<section class="lesson-processing" aria-live="polite" aria-busy="${draft.generationPending?'true':'false'}"><div class="processing-mark"><span></span><span></span><span></span></div><p class="eyebrow">Creating ${count} personalized ${count===1?'lesson':'lessons'}</p><h1>${adapted?'Adapting your class lesson':'Building lessons from student needs'}</h1><p class="processing-lead">Clearpath is taking into account each student’s present levels, IEP goals, and latest data collection.</p><ol class="processing-steps"><li>${icon('check')}Reviewing present levels</li><li>${icon('check')}Aligning IEP goals and objectives</li><li>${icon('check')}Applying the latest progress data</li>${adapted?`<li>${icon('check')}Adapting ${esc(draft.upload?.name||'your uploaded lesson')}</li>`:''}</ol>${draft.generationError?`<div class="error" role="alert">${esc(draft.generationError)}</div>`:'<p class="caption">This usually takes less than a minute.</p>'}</section>`;
}
// A generation is one batch, with an independently editable document per student.
function createStudentAssignments(draft,{revisionOf=null,applyGuidance=false}={}){
 const batchId=uid('batch'),now=new Date().toISOString(),base=state.assignments.find(a=>a.id===revisionOf);
 const records=alphabeticalIds(draft.studentIds).map(id=>{
  const model=materialForStudent(draft,id);if(model.workflow)model.kind='lesson';if(model.kind==='lesson')model.title=personalizedLessonTitle(model,id);
  const record={id:uid('assignment'),batchId,kind:model.kind,title:model.title,model,studentIds:[id],objectiveIds:structuredClone(model.objectiveIds),html:model.kind==='lesson'?buildPersonalizedLessonHTML(model):buildAssignmentHTML(model),status:'draft',createdAt:now,updatedAt:now,modifiedAt:null,revisionOf:base?.studentIds.includes(id)?base.id:null};
  if(applyGuidance&&base?.studentIds.length===1&&base.studentIds[0]===id){
   const previous=sanitizeRichHTML(base.html),appendix=base.guidanceAppendix;
   const body=appendix&&previous.endsWith(appendix)?previous.slice(0,-appendix.length):previous;
   record.guidanceAppendix=sanitizeRichHTML(`<h3>Teaching notes</h3><ul>${guidanceUpdate(id).recommendations.map(t=>`<li>${esc(t.step)}</li>`).join('')}</ul>`);
   record.html=body+record.guidanceAppendix;
  }
  return record;
 });
 if(!records.length)return null;
 const before=state.assignments;state.assignments=[...records,...before];
 if(!persist()){state.assignments=before;return null;}
 for(const record of records)completeGuidanceDraft(record.model,record);
 return records;
}
function assignmentBatches(){
 const batches=new Map();for(const record of state.assignments){const key=record.batchId||record.id;if(!batches.has(key))batches.set(key,{id:key,records:[]});batches.get(key).records.push(record);}return [...batches.values()];
}
function lessonOverviewPager(batchId,page,pageCount,total){
 if(pageCount<=1)return '';
 const start=(page-1)*LESSONS_PER_PAGE+1,end=Math.min(page*LESSONS_PER_PAGE,total);
 const pages=Array.from({length:pageCount},(_,index)=>{const value=index+1;return `<button type="button" class="lesson-page-button" data-action="lesson-overview-page" data-id="${esc(batchId)}" data-page="${value}" ${value===page?'aria-current="page"':''} aria-label="Lesson page ${value}">${value}</button>`}).join('');
 return `<nav class="lesson-pagination" aria-label="Lesson pages"><span>Showing ${start}–${end} of ${total} lessons</span><div class="lesson-pagination-buttons"><button type="button" class="lesson-page-button lesson-page-direction" data-action="lesson-overview-page" data-id="${esc(batchId)}" data-page="${page-1}" aria-label="Previous lesson page" ${page===1?'disabled':''}>${icon('back')}</button>${pages}<button type="button" class="lesson-page-button lesson-page-direction" data-action="lesson-overview-page" data-id="${esc(batchId)}" data-page="${page+1}" aria-label="Next lesson page" ${page===pageCount?'disabled':''}>${icon('arrow')}</button></div></nav>`;
}
function assignmentOverview(id){
 const batch=assignmentBatches().find(b=>b.id===id);
 if(!batch)return `<div class="empty"><h2>Assignment not found</h2><a href="#studio" data-action="back-materials" class="btn">Back to saved materials</a></div>`;
 const rows=batch.records.flatMap(record=>record.studentIds.map(id=>({record,student:getStudent(id)}))).sort((a,b)=>a.student.name.localeCompare(b.student.name,'en',{sensitivity:'base'}));
 const lessonPlans=batch.records.every(record=>record.kind==='lesson'),heading=lessonPlans?'Personalized lesson plans':'Assignment overview';
 if(lessonOverviewPagination.batchId!==id)lessonOverviewPagination={batchId:id,page:1};
 const pageCount=lessonPlans?Math.max(1,Math.ceil(rows.length/LESSONS_PER_PAGE)):1;
 const page=Math.min(Math.max(1,lessonOverviewPagination.page),pageCount);
 lessonOverviewPagination.page=page;
 const visibleRows=lessonPlans?rows.slice((page-1)*LESSONS_PER_PAGE,page*LESSONS_PER_PAGE):rows;
 const pager=lessonPlans?lessonOverviewPager(id,page,pageCount,rows.length):'';
 const summary=lessonPlans?`${rows.length} personalized ${rows.length===1?'lesson':'lessons'} ready to review`:`${rows.length} ${rows.length===1?'student':'students'} · ${batch.records.length} ${batch.records.length===1?'draft':'drafts'} created`;
 return `<a href="#studio/saved" class="back">${icon('back')}Materials</a><div class="page-head"><div><h1>${heading}</h1><p class="subtitle">${summary}</p></div></div><div class="table-card assignment-overview-card"><div class="table-wrap"><table class="roster assignment-overview"><caption class="sr-only">Students and their generated ${lessonPlans?'lesson plans':'assignments'}</caption><thead><tr><th scope="col">Student</th><th scope="col">${lessonPlans?'Personalized lesson':'Assignment'}</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${visibleRows.map(({record:r,student:s})=>`<tr><td><a class="student-name" href="#student/${s.id}">${avatar(s)}<span class="name-text">${esc(s.name)}<small>${gradeLabel(s.grade)}</small></span></a></td><td><span class="material-title">${esc(r.title)}</span>${r.revisionOf?'<small class="material-detail">Revised draft</small>':lessonPlans?`<small class="material-detail">Built from ${r.model.workflow==='adapt'?'your class lesson':'student learning data'}</small>`:''}</td><td><span class="material-status">${r.status==='ready'?'Saved':'Ready to review'}</span></td><td class="material-action"><div class="material-actions">${btn(lessonPlans?'Open lesson':'Open draft','open-assignment','small',`data-id="${r.id}" aria-label="Open ${lessonPlans?'lesson':'draft'} for ${esc(s.name)}"`)}${lessonPlans?btn(icon('print')+'Print / save PDF','print-lesson','small',`data-id="${r.id}" aria-label="Print or save ${esc(s.name)}’s lesson as PDF"`):''}</div></td></tr>`).join('')}</tbody></table></div>${pager}</div><div class="overview-footer"><a class="btn" href="#studio">Create more lessons</a></div>`;
}
function materialDate(value,empty='—'){
 if(!value||!Number.isFinite(Date.parse(value)))return `<span class="muted">${empty}</span>`;
 const date=new Date(value);return `<time datetime="${esc(date.toISOString())}" title="${esc(date.toLocaleString('en-US'))}">${date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}<small>${date.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</small></time>`;
}
function materialModifiedAt(record){return Object.prototype.hasOwnProperty.call(record,'modifiedAt')?record.modifiedAt:record.updatedAt}
function assignmentHistory(s){
 const records=state.assignments.filter(a=>a.studentIds.includes(s.id)).sort((a,b)=>(b.createdAt||b.updatedAt||'').localeCompare(a.createdAt||a.updatedAt||''));
 return `<section class="assignment-history" aria-labelledby="assignment-history-heading"><div class="section-row"><h2 id="assignment-history-heading">Assignment history</h2></div>${records.length?`<div class="table-wrap"><table class="assignment-audit"><caption class="sr-only">Assignments, creation dates and last modifications for ${esc(s.name)}</caption><thead><tr><th scope="col">Assignment</th><th scope="col">Created</th><th scope="col">Last modified</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${records.map(r=>`<tr><td><span class="material-title">${esc(r.title)}</span><small class="material-detail">${r.revisionOf?'Revised '+r.kind:materialLabel(r.kind)}</small></td><td>${materialDate(r.createdAt,'Not recorded')}</td><td>${materialDate(materialModifiedAt(r))}</td><td class="material-action">${btn('Open','open-assignment','small',`data-id="${r.id}" aria-label="Open ${esc(r.title)}"`)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="section-description">No assignments created yet.</p>'}</section>`;
}
function studentMaterials(s){
 const records=state.assignments.filter(r=>r.studentIds.includes(s.id)).sort((a,b)=>(b.createdAt||b.updatedAt||'').localeCompare(a.createdAt||a.updatedAt||''));
 return `<div class="student-materials"><section class="content-section"><div class="section-row"><h2>Assignments & assessments</h2><span class="caption no-margin">${records.length} materials</span></div>${records.length?`<div class="table-wrap"><table class="assignment-audit"><caption class="sr-only">Materials for ${esc(s.name)}</caption><thead><tr><th>Material</th><th>Created</th><th>Last modified</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${records.map(r=>{const goal=goalForDraft(r.model,s.id);return `<tr><td><span class="material-title">${esc(r.title)}</span><small class="material-detail">${r.revisionOf?'Revised '+r.kind:materialLabel(r.kind)}${goal?' · '+esc(goal.title):''}</small></td><td>${materialDate(r.createdAt,'Not recorded')}</td><td>${materialDate(materialModifiedAt(r))}</td><td>${r.status==='ready'?'Saved':'Draft'}</td><td class="material-action">${btn('Open draft','open-assignment','small',`data-id="${r.id}"`)}</td></tr>`;}).join('')}</tbody></table></div>`:'<p class="section-description">Assignments and assessments created for this student will appear here.</p>'}</section></div>`;
}
function personalizedLessonTitle(d,id){
 if(d.workflow==='adapt'){
  const base=String(d.upload?.name||'Class lesson').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim();
  return `${base||'Class lesson'} · Personalized for ${getStudent(id).name.split(' ')[0]}`;
 }
 return `${d.topic||domainNames[d.domain]||'Personalized lesson'} · ${getStudent(id).name.split(' ')[0]}`;
}
function lessonPresentLevel(s,g){
 const saved=intakeSession(s.id).savedDrafts.presentLevels||{},example=typeof presentLevelExample==='function'?presentLevelExample(s):null;
 const name=s.name.split(' ')[0],fallback={reading:`${name} is working on sequencing events and explaining story details independently.`,math:`${name} is working on choosing operations and solving one-step problems independently.`,writing:`${name} is working on turning complete oral ideas into written sentences independently.`}[g?.domain||s.domain];
 return [saved.summary,example?.summary,saved.baseline,g?.baseline,fallback].find(value=>String(value||'').trim()&&!/^\s*\[/.test(String(value)))||'Review current performance before teaching.';
}
function buildVisualAdaptationHTML(d,{s,g,o,source,baseline,data,measurement,supports,classContext}){
 const patterns={
  ela:{sequence:[['👀','Look'],['🔢','Put in order'],['🗣️','Tell'],['✏️','Show']],ideas:['First','Next','Last'],task:['Look at the class example.','Number the important parts in order.','Retell the idea using the visual words.']},
  math:{sequence:[['🔎','Find'],['➕','Choose'],['🧮','Solve'],['✅','Check']],ideas:['What I know','What I need','My plan'],task:['Circle the numbers and the question.','Choose an operation or model.','Solve, then check each step.']},
  science:{sequence:[['👀','Observe'],['🧩','Sort'],['🗣️','Explain'],['✏️','Show']],ideas:['What I notice','What changes','Why it matters'],task:['Look closely at the class example.','Sort the evidence into groups.','Use the visual words to explain the pattern.']},
  social:{sequence:[['🗺️','Locate'],['🔎','Notice'],['🔗','Connect'],['🗣️','Explain']],ideas:['People','Place','Change'],task:['Find the place or event.','Mark one important detail.','Connect the detail to the lesson idea.']},
  other:{sequence:[['👀','Preview'],['🧩','Break apart'],['🗣️','Practice'],['✏️','Show']],ideas:['Start','Work','Finish'],task:['Preview the example.','Complete one part at a time.','Show what you learned independently.']}
 };
 const pattern=patterns[d.adaptation?.subject]||patterns.other,first=s.name.split(' ')[0],focus=o?.skill||g?.title||d.topic,needs=supports.slice(0,4);
 return sanitizeRichHTML(`<div class="visual-material"><div class="visual-header"><p>${esc(s.name)} · ${esc(classContext)}</p><h2>${esc(d.topic)} · Visual learning guide</h2><p><strong>Goal:</strong> ${esc(focus)}</p></div><div class="visual-activity"><h3>1. Follow the visual plan</h3><div class="visual-sequence">${pattern.sequence.map(([symbol,label],i)=>`<div class="visual-cue"><strong>${symbol}</strong><p>${i+1}. ${esc(label)}</p></div>`).join('')}</div></div><div class="visual-activity"><h3>2. Organize the key ideas</h3><div class="visual-card-grid">${pattern.ideas.map(label=>`<div class="visual-card"><strong>${esc(label)}</strong><p>Draw, point, or add a short note.</p></div>`).join('')}</div></div><div class="visual-activity"><h3>3. Try the class task</h3><ol>${pattern.task.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><div class="visual-response"><p>My work</p><p>____________________________________________________________</p><p>____________________________________________________________</p></div></div><div class="visual-activity"><h3>4. Show what you know</h3><p>${esc(first)}, complete one example without a prompt. You may point, draw, speak, or write.</p><div class="visual-response"><p>Independent response</p><p>____________________________________________________________</p><p>____________________________________________________________</p></div></div><div class="visual-teacher-note"><h3>Teacher check</h3><p><strong>Starting point:</strong> ${esc(baseline)}</p><p><strong>Latest data:</strong> ${esc(data)}</p><p><strong>Use:</strong> ${esc(needs.join(' · ')||'Saved student accommodations')}</p><p><strong>Record with:</strong> ${esc(measurement)}</p><p><strong>Source:</strong> ${esc(source)}</p></div></div>`);
}
function buildPersonalizedLessonHTML(d){
 const id=d.studentIds[0],s=getStudent(id),g=goalForDraft(d,id),o=objectiveForDraft(d,id),evidence=milestoneEvidence(s,o),latest=evidence[evidence.length-1],guidance=guidanceFor(s);
 const selected=d.workflow==='adapt'?selectedAdaptationNeeds(d.adaptation||{}):[],saved=guidance.map(item=>item.step||`${item.title}. ${item.detail}`),supports=[...new Set([...selected,...saved])];
 if(!supports.length)supports.push('Use the student’s usual accommodations.','Present one clear direction, then check understanding before continuing.');
 const baseline=lessonPresentLevel(s,g),source=d.workflow==='adapt'?`Adapted from the uploaded class lesson: ${d.upload?.name||'class lesson plan'}.`:'Created from the student information currently saved in Clearpath.';
 const classContext=d.workflow==='adapt'?`${gradeLabel(Number(d.adaptation?.grade??d.grade))} · ${adaptationSubjects[d.adaptation?.subject]||domainNames[d.domain]} · ${d.adaptation?.language||d.language}`:'';
 const data=latest?`The latest progress check was ${latest.score}% independent accuracy on ${formatDate(latest.date)}.`:'No recent progress check is available; begin with a brief understanding check.';
 const measurement=g?.measurement?.method||defaultMeasures[d.domain]||'brief teacher-recorded check';
 const steps=d.workflow==='adapt'?[`Open with the same learning target and core activity as the class lesson.`,`Preview ${o?.skill||g?.title||'the target skill'} in a short, concrete example.`,`Teach the class activity using the personalized supports below.`,`End with a brief independent check aligned to the student’s IEP objective.`]:[`Name the learning target in student-friendly language and connect it to prior learning.`,`Model one example of ${o?.skill||g?.title||'the target skill'}.`,`Guide practice with the personalized supports below.`,`Fade prompts and collect a short independent response.`];
 if(d.workflow==='adapt'&&d.adaptation?.modality==='visual')return buildVisualAdaptationHTML(d,{s,g,o,source,baseline,data,measurement,supports,classContext});
 return sanitizeRichHTML(`<h2>${esc(d.title)}</h2><p><strong>Student:</strong> ${esc(s.name)} &nbsp; <strong>Grade:</strong> ${esc(gradeLabel(s.grade))}</p>${classContext?`<p><strong>Class lesson:</strong> ${esc(classContext)}</p>`:''}<p><strong>Source:</strong> ${esc(source)}</p><h3>Instructional focus</h3><p><strong>IEP goal:</strong> ${esc(g?.content||g?.title||'Review the student’s current IEP goal.')}</p><p><strong>Current objective:</strong> ${esc(o?.skill||'Review the next approved objective.')}</p><h3>What Clearpath considered</h3><p><strong>Present levels:</strong> ${esc(baseline)}</p><p><strong>Latest data:</strong> ${esc(data)}</p><h3>Lesson sequence</h3><ol>${steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><h3>Personalized instruction</h3><ul>${supports.map(step=>`<li>${esc(step)}</li>`).join('')}</ul><h3>Quick progress check</h3><p>Use ${esc(measurement)} to record what ${esc(s.name.split(' ')[0])} can do independently. Keep prompted responses separate and note which supports were used.</p><h3>Teacher reflection</h3><p>What helped? ________________________________________________</p><p>What should change next time? _________________________________</p>`);
}
function upgradeVisualAdaptationDrafts(){
 let upgraded=0;
 for(const record of state.assignments||[]){
  const isUntouched=record.modifiedAt===null;
  const isVisualAdaptation=record.kind==='lesson'&&record.model?.workflow==='adapt'&&record.model?.adaptation?.modality==='visual';
  if(!isUntouched||!isVisualAdaptation||String(record.html||'').includes('class="visual-material"'))continue;
  record.html=buildPersonalizedLessonHTML(record.model);record.visualTemplateVersion=1;upgraded++;
 }
 return upgraded;
}
function buildAssignmentHTML(d){
 if(d.studentIds?.length>1)return sanitizeRichHTML(`<h2>${esc(d.title)}</h2>`+alphabeticalIds(d.studentIds).map(id=>{const model=materialForStudent(d,id),o=objectiveForDraft(d,id);return `<h3>${esc(getStudent(id).name)} · ${esc(domainNames[model.domain])}</h3>${o?`<p>Objective: ${esc(o.skill)}</p>`:''}`+buildStudentAssignmentHTML(model).replace(/^<h2>[\s\S]*?<\/h2>/,'');}).join(''));
 const model=d.studentIds?.length===1?materialForStudent(d,d.studentIds[0]):d;
 return buildStudentAssignmentHTML(model);
}
function buildStudentAssignmentHTML(d){
 const count=+d.questions||3,custom=d.source!==lessonDefaults[d.domain].source;
 const prompts=custom?{
  reading:['What happens first?','What happens next?','What happens at the end?','Put the main events in order.','Retell the sequence in your own words.'],
  math:['Identify the information you need.','Choose the operation for the first problem.','Solve the problem and show your work.','Check your answer with another method.','Explain the steps you used.'],
  writing:['Say one complete idea about the topic.','Write your idea as a sentence.','Add a detail that makes your idea clear.','Check the capital letter and ending punctuation.','Read your sentence and revise it if needed.']
 }[d.domain]:{
  reading:['What did Maya do first?','What happened after the rain began?','What appeared a few days later?','Where did Maya put the pot?','Put the planting, rain, and new leaf in order.'],
  math:['How many seeds did Maya have at first?','How many seeds did the friend bring?','How many seeds did they have altogether?','How many seeds remained after planting 6?','Show how you checked your answer.'],
  writing:['Say a complete idea about something you saw in a garden.','Write your idea as a sentence.','Include who or what you saw and what happened.','Check the capital letter and ending punctuation.','Read your sentence and add a detail.']
 }[d.domain];
 const context=(d.context||'').toLowerCase(),oneStep=/one step|one direction|one instruction/.test(context),oral=/oral|aloud|rehearsal/.test(context),visual=/picture|visual/.test(context)&&!/clutter/.test(context),modeled=/model.*(first|step)/.test(context);
 const source=esc(d.source).split(/\n+/).map(s=>`<p>${s}</p>`).join('');
 const cues=visual&&!custom?`<p><strong>Picture guide:</strong> ${d.domain==='reading'?'🌱 Seed → 🌧 Rain → 🌿 New leaf':d.domain==='math'?'🌱 8 seeds + 🌱 5 seeds':'🌷 Flower · 🍃 Leaf · 🐦 Bird'}</p>`:'';
 const directions=`${d.kind==='assessment'?'Answer each question.':'Read the task and complete each step.'}${oneStep?' Work through one step at a time.':''}${oral?' Say your answer aloud before writing.':''}${modeled?' Work through the first step with your teacher, then try the next problem.':''}`;
 const items=prompts.slice(0,count).map((q,i)=>oneStep?`<h3>Step ${i+1}</h3><p>${esc(q)}</p><p>________________________________________________</p>`:`<li><p>${esc(q)}</p><p>________________________________________________</p></li>`).join('');
 return sanitizeRichHTML(`<h2>${esc(d.title)}</h2><p>Name: ____________________ &nbsp; Date: ______________</p>${cues}${source}<h3>Directions</h3><p>${directions}</p>${oneStep?items:`<ol>${items}</ol>`}`);
}
// Keep only simple document formatting. Never retain attributes, scripts, embeds or links.
function sanitizeRichHTML(value){
 const allowed=new Set(['p','div','br','h1','h2','h3','strong','b','em','i','u','ol','ul','li','blockquote']);
 const allowedClasses=new Set(['visual-material','visual-header','visual-activity','visual-sequence','visual-cue','visual-card-grid','visual-card','visual-response','visual-teacher-note']);
 const raw=String(value||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|iframe|object|svg|math|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 return (raw.match(/<[^>]*>|[^<]+|</g)||[]).map(token=>{
  if(!token.startsWith('<'))return token.replace(/>/g,'&gt;');
  const match=token.match(/^<\s*(\/?)\s*([a-z][a-z0-9]*)\b[^>]*>$/i);if(!match)return '&lt;';const tag=match[2].toLowerCase();if(!allowed.has(tag))return '';
  if(match[1])return `</${tag}>`;const classMatch=token.match(/\bclass\s*=\s*["']([^"']*)["']/i),classes=(classMatch?.[1]||'').split(/\s+/).filter(name=>allowedClasses.has(name));
  return `<${tag}${classes.length?` class="${classes.join(' ')}"`:''}>`;
 }).join('');
}
function richButton(command,label,title){return `<button type="button" class="rich-tool" data-action="rich-format" data-command="${command}" aria-label="${title}" title="${title}">${label}</button>`}
function lessonDeckSlides(record){
 const d=record.model,s=getStudent(record.studentIds[0]),o=objectiveForDraft(d,s.id),topic=String(d.topic||d.title||'Personalized lesson').trim(),first=s.name.split(' ')[0],steps=lessonSlideSteps(d);
 const topicSkill=/water|weather|plant|seed|animal|earth|space|cycle|energy|science/i.test(topic)&&d.domain==='reading'?`Put the key stages of ${topic.toLowerCase()} in order and retell them clearly.`:o?.skill;
 return [
  {type:'cover',label:'Cover',eyebrow:'Personalized lesson',title:topic,body:`A ${d.duration||45}-minute learning experience designed for ${first}.`},
  {type:'objective',label:'Learning goal',eyebrow:'Today I will…',title:topicSkill||`Build a clear understanding of ${topic}.`,body:'I will use the model, explain my thinking, and try one step independently.'},
  {type:'opener',label:'Warm-up',eyebrow:'Start with what you know',title:`What do you already notice about ${topic}?`,body:'Think quietly, choose one idea, then share it with a partner.'},
  {type:'process',label:'Big idea',eyebrow:'Build the big idea',title:topic,body:'Follow the idea in three clear moves.',steps},
  {type:'practice',label:'Guided practice',eyebrow:'Try it together',title:'Watch it. Build it. Explain it.',body:'Move from a clear model to one independent response.'},
  {type:'exit',label:'Exit ticket',eyebrow:'Show what you know',title:`Explain ${topic} in three moves.`,body:`Use the key words from today and tell how the ideas connect.`}
 ];
}
function lessonDeckSlideMarkup(record,index,id){
 const d=record.model,s=getStudent(record.studentIds[0]),slides=lessonDeckSlides(record),slide=slides[index]||slides[0],theme=lessonThemeLabels[d.theme]?d.theme:'low-stimulation',number=String(index+1).padStart(2,'0'),subject=lessonSlideSubject(d),first=s.name.split(' ')[0];
 if(slide.type==='process')return lessonSlidePreview(d,{id});
 const commonHead=`<span>${esc(subject)} · ${esc(draftGradeLabel(d))}</span><span>${number}</span>`,commonFoot=`<footer class="lesson-slide-footer"><span><i aria-hidden="true"></i>Personalized for ${esc(first)}</span><span>${esc(slide.label)}</span></footer>`;
 let body='';
 if(slide.type==='cover')body=`<div class="lesson-deck-cover-body"><p>${esc(slide.eyebrow)}</p><h2>${esc(slide.title)}</h2><div><span>${esc(d.duration||45)} minutes</span><span>${esc(d.language||'English')}</span><span>${esc(subject)}</span></div><p>${esc(slide.body)}</p></div>`;
 else if(slide.type==='objective')body=`<div class="lesson-deck-objective-body"><div><p>${esc(slide.eyebrow)}</p><h2>${esc(slide.title)}</h2></div><aside><span>Success looks like</span><p>${esc(slide.body)}</p><div><i></i><i></i><i></i></div></aside></div>`;
 else if(slide.type==='opener')body=`<div class="lesson-deck-opener-body"><p>${esc(slide.eyebrow)}</p><h2>${esc(slide.title)}</h2><div class="lesson-deck-prompt-row"><span>① Think</span><span>② Choose</span><span>③ Share</span></div><p>${esc(slide.body)}</p></div>`;
 else if(slide.type==='practice')body=`<div class="lesson-deck-practice-body"><div><p>${esc(slide.eyebrow)}</p><h2>${esc(slide.title)}</h2><p>${esc(slide.body)}</p></div><div class="lesson-deck-practice-cards"><article><span>I do</span><strong>See the model</strong><p>Notice the choices and the key vocabulary.</p></article><article><span>We do</span><strong>Build one together</strong><p>Name each step and explain why it belongs.</p></article><article><span>You do</span><strong>Try one your way</strong><p>Use the guide, then check your own work.</p></article></div></div>`;
 else body=`<div class="lesson-deck-exit-body"><div><p>${esc(slide.eyebrow)}</p><h2>${esc(slide.title)}</h2><p>${esc(slide.body)}</p></div><aside><span>Before you go</span><ol><li>Name the first move.</li><li>Connect it to the next move.</li><li>Finish with the big idea.</li></ol><small>One clear response · 3 minutes</small></aside></div>`;
 return `<div class="lesson-slide-frame lesson-deck-slide-frame" id="${esc(id)}"><article class="lesson-slide lesson-deck-slide lesson-deck-slide-${slide.type} lesson-slide-theme-${theme}" aria-label="${esc(slide.label)} slide"><span class="lesson-slide-orb orb-one" aria-hidden="true"></span><span class="lesson-slide-orb orb-two" aria-hidden="true"></span><header class="lesson-slide-header">${commonHead}</header>${body}${commonFoot}</article></div>`;
}
function openLessonDeck(id,index=lessonDeckSlideIndex){
 const record=state.assignments.find(a=>a.id===id);if(!record)return;
 const slides=lessonDeckSlides(record),names=alphabeticalIds(record.studentIds).map(studentId=>getStudent(studentId).name).join(', ');lessonDeckSlideIndex=Math.max(0,Math.min(Number(index)||0,slides.length-1));assignmentFlow={stage:'deck',recordId:id,model:structuredClone(record.model),returnStudent:null};
 const theme=lessonThemeLabels[record.model.theme]?record.model.theme:'low-stimulation';
 openModal('Lesson slide editor',`${names} · ${slides.length} slides`,`<div class="lesson-deck-shell"><aside class="lesson-deck-sidebar" aria-label="Lesson slides"><div class="lesson-deck-sidebar-head"><strong>Slides</strong><span>${slides.length}</span></div><div class="lesson-deck-thumbnails">${slides.map((slide,slideIndex)=>`<button type="button" class="lesson-deck-thumbnail ${slideIndex===lessonDeckSlideIndex?'active':''}" data-action="lesson-deck-slide" data-id="${record.id}" data-index="${slideIndex}" aria-label="Open slide ${slideIndex+1}: ${esc(slide.label)}" ${slideIndex===lessonDeckSlideIndex?'aria-current="true"':''}><span>${slideIndex+1}</span>${lessonDeckSlideMarkup(record,slideIndex,`lesson-thumb-${slideIndex}`)}<strong>${esc(slide.label)}</strong></button>`).join('')}</div></aside><section class="lesson-deck-workspace"><div class="lesson-deck-toolbar"><div><span class="lesson-deck-status"><i></i>Ready to edit</span><strong>${esc(slides[lessonDeckSlideIndex].label)}</strong></div><div class="lesson-deck-themes" aria-label="Slide theme">${Object.entries(lessonThemeLabels).map(([key,label])=>`<button type="button" data-action="lesson-deck-theme" data-id="${record.id}" data-theme="${key}" class="lesson-deck-theme-swatch theme-swatch-${key} ${theme===key?'active':''}" aria-label="Use ${esc(label)} theme" title="${esc(label)}"></button>`).join('')}</div></div><div class="lesson-deck-stage">${lessonDeckSlideMarkup(record,lessonDeckSlideIndex,'lesson-deck-active-slide')}</div><div class="lesson-deck-navigation"><button type="button" class="btn small" data-action="lesson-deck-slide" data-id="${record.id}" data-index="${lessonDeckSlideIndex-1}" ${lessonDeckSlideIndex===0?'disabled':''}>${icon('back')}Previous</button><span>Slide ${lessonDeckSlideIndex+1} of ${slides.length}</span><button type="button" class="btn small" data-action="lesson-deck-slide" data-id="${record.id}" data-index="${lessonDeckSlideIndex+1}" ${lessonDeckSlideIndex===slides.length-1?'disabled':''}>Next${icon('arrow')}</button></div><div class="modal-foot lesson-deck-footer"><span>Review each slide before using it with students.</span><div class="actions">${btn(icon('print')+'Print / PDF','print-lesson-deck')}${btn(icon('save')+'Save and exit','save-lesson-deck','primary')}</div></div></section></div>`,{wide:true,printable:true});
}
function openAssignmentEditor(id){
 const record=state.assignments.find(a=>a.id===id);if(!record)return;
 assignmentFlow={stage:'editor',recordId:id,model:structuredClone(record.model),returnStudent:route().page==='student'?route().id:route().page==='plans'?route().student:null};richSelection=null;
 const names=alphabeticalIds(record.studentIds).map(id=>getStudent(id).name).join(', '),targets=record.studentIds.map(id=>{const o=objectiveForDraft(record.model,id);return o?getStudent(id).name+': '+o.skill:'';}).filter(Boolean);
 openModal(`${materialLabel(record.kind)} draft`,names,`<div class="assignment-editor-shell"><div class="editor-context"><span>${draftGradeLabel(record.model)} · ${draftAreaLabel(record.model)}</span><details><summary>Target objective${targets.length>1?'s':''}</summary><p>${targets.map(esc).join('; ')}</p></details></div><div class="rich-toolbar" role="toolbar" aria-label="Text formatting">${richButton('bold','<b>B</b>','Bold')}${richButton('italic','<i>I</i>','Italic')}${richButton('underline','<u>U</u>','Underline')}<span class="toolbar-divider"></span>${richButton('heading','H','Heading')}${richButton('paragraph','¶','Paragraph')}<span class="toolbar-divider"></span>${richButton('insertUnorderedList','• List','Bulleted list')}${richButton('insertOrderedList','1. List','Numbered list')}<span class="toolbar-divider"></span>${richButton('undo','↶','Undo')}${richButton('redo','↷','Redo')}</div><div class="assignment-paper"><div id="assignment-editor" class="rich-editor" contenteditable="true" role="textbox" aria-label="Edit ${record.kind==='lesson'?'lesson plan':'assignment'} content" aria-multiline="true" spellcheck="true">${sanitizeRichHTML(record.html)}</div></div><div id="assignment-editor-error" aria-live="polite"></div><div class="editor-meta"><span id="assignment-save-state" role="status">Draft saved in this browser</span><span>Demo draft · Review before use</span></div><div class="modal-foot editor-footer">${record.kind==='lesson'?'<span class="caption no-margin">Print dialog includes a Save as PDF option.</span>':'<button class="text-btn" data-action="edit-assignment-setup">Change selections</button>'}<div class="actions">${btn(icon('print')+(record.kind==='lesson'?'Print / save PDF':'Print'),'print-assignment')}${btn('Save '+(record.kind==='lesson'?'lesson plan':record.kind),'save-assignment','primary')}</div></div></div>`,{wide:true,printable:true});
}
function flushAssignmentEditor(finalize=false){
 if(assignmentFlow?.stage!=='editor')return true;
 clearTimeout(assignmentSaveTimer);
 const editor=document.getElementById('assignment-editor'),record=state.assignments.find(a=>a.id===assignmentFlow.recordId);if(!editor||!record)return true;
 if(editor.innerHTML.length>60000){formError('assignment-editor-error','Keep the assignment under 60,000 characters.');return false;}
 const html=sanitizeRichHTML(editor.innerHTML);if(finalize&&!html.replace(/<[^>]+>/g,'').trim()){formError('assignment-editor-error','Add some content before saving.');return false;}
 const previous=structuredClone(record),heading=editor.querySelector?.('h1,h2'),title=heading?.textContent.trim().slice(0,100)||record.title;
 const changed=html!==sanitizeRichHTML(record.html)||title!==record.title;
 record.html=html;record.title=title;record.model.title=title;
 if(changed)record.updatedAt=record.modifiedAt=new Date().toISOString();
 if(finalize){record.status='ready';record.savedAt ||= new Date().toISOString();}
 const saved=persist();if(!saved)state.assignments[state.assignments.findIndex(a=>a.id===record.id)]=previous;
 const status=document.getElementById('assignment-save-state');if(status)status.textContent=saved?'Draft saved in this browser':'Not saved · browser storage unavailable';return saved;
}
function finishAssignmentModal(){
 if(!assignmentFlow)return true;
 if(assignmentFlow.stage==='editor'&&!flushAssignmentEditor())return false;
 assignmentFlow=null;richSelection=null;clearTimeout(assignmentSaveTimer);return true;
}
function queueAssignmentSave(){const status=document.getElementById('assignment-save-state');if(status)status.textContent='Saving…';clearTimeout(assignmentSaveTimer);assignmentSaveTimer=setTimeout(()=>flushAssignmentEditor(),500);}
function rememberRichSelection(){const editor=document.getElementById('assignment-editor'),selection=window.getSelection?.();if(editor&&selection?.rangeCount&&editor.contains(selection.anchorNode))richSelection=selection.getRangeAt(0).cloneRange();}
function formatAssignment(command){
 const editor=document.getElementById('assignment-editor');if(!editor)return;editor.focus();
 const selection=window.getSelection?.();if(richSelection&&selection){selection.removeAllRanges();selection.addRange(richSelection);}
 if(command==='heading'||command==='paragraph')document.execCommand('formatBlock',false,command==='heading'?'h2':'p');else document.execCommand(command,false,null);
 rememberRichSelection();queueAssignmentSave();
}
function handleAssignmentAction(action,el){
 if(handleSelectionAction(action,el))return true;
 if(action==='edit-academic-support'){setAcademicSupportEditing(true,el.closest?.('form'));return true;}
 if(action==='done-academic-support'){setAcademicSupportEditing(false,el.closest?.('form'));return true;}
 if(action==='choose-lesson-plan'){document.getElementById('lesson-plan-file')?.click();return true;}
 if(action==='remove-lesson-plan'){if(lesson){preserveDraftInputs(lesson,el.closest?.('form'));delete lesson.upload;state.lesson=structuredClone(lesson);persist();render();}return true;}
 if(action==='guided-materials'){openDraftingModal(el.dataset.id);return true;}
 if(action==='open-assignment'){const record=state.assignments.find(a=>a.id===el.dataset.id);if(record?.kind==='lesson')openLessonDeck(record.id,0);else openAssignmentEditor(el.dataset.id);return true;}
 if(action==='print-lesson'){openLessonDeck(el.dataset.id,0);setTimeout(()=>window.print(),50);return true;}
 if(action==='lesson-deck-slide'){openLessonDeck(el.dataset.id,Number(el.dataset.index));return true;}
 if(action==='lesson-deck-theme'){const record=state.assignments.find(a=>a.id===el.dataset.id);if(record&&lessonThemeLabels[el.dataset.theme]){record.model.theme=el.dataset.theme;record.updatedAt=new Date().toISOString();persist();openLessonDeck(record.id,lessonDeckSlideIndex);}return true;}
 if(action==='print-lesson-deck'){window.print();return true;}
 if(action==='save-lesson-deck'){const record=state.assignments.find(a=>a.id===assignmentFlow?.recordId);if(record){record.status='ready';record.savedAt ||= new Date().toISOString();record.updatedAt=new Date().toISOString();persist();closeModal();render();toast('Lesson deck saved.');}return true;}
 if(action==='open-assignment-overview'){lessonOverviewPagination={batchId:el.dataset.id,page:1};navigate('assignments/'+el.dataset.id);return true;}
 if(action==='lesson-overview-page'){const page=Number(el.dataset.page);if(Number.isInteger(page)&&page>0){lessonOverviewPagination={batchId:el.dataset.id,page};render();}return true;}
 if(action==='back-materials'){studioTab='saved';navigate('studio/saved');return true;}
 if(action==='rich-format'){formatAssignment(el.dataset.command);return true;}
 if(action==='save-assignment'){if(flushAssignmentEditor(true)){const record=state.assignments.find(a=>a.id===assignmentFlow.recordId);const student=assignmentFlow.returnStudent;if(student){openStudentSection(student,'iep','materials');}else navigate('assignments/'+(record.batchId||record.id));toast('Material saved.');}return true;}
 if(action==='print-assignment'){if(flushAssignmentEditor())window.print();return true;}
 if(action==='edit-assignment-setup'){
  if(!flushAssignmentEditor())return true;
  const record=state.assignments.find(x=>x.id===assignmentFlow.recordId);assignmentFlow={stage:'setup',recordId:record.id,model:structuredClone(record.model)};assignmentFlow.model.withVariations=false;renderDraftingModal();return true;
 }
 return false;
}
function handleAssignmentInput(event){if(event.target.dataset?.assignmentSearch!==undefined){filterAssignmentStudents(event.target);return true;}if(event.target.closest?.('#lesson-topic-form')&&['topic','instructions'].includes(event.target.name)){refreshLessonStudioPreview();return true;}if(event.target.id==='assignment-editor'||event.target.closest?.('#assignment-editor')){queueAssignmentSave();return true;}return false;}
function handleLessonPlanChange(input){if(input.id!=='lesson-plan-file')return false;preserveDraftInputs(lesson,input.closest?.('form'));setLessonPlanFile(Array.from(input.files||[])[0]);return true;}
function handleLessonWizardChange(input){
 if(!lesson)return false;
 if(input.closest?.('#lesson-topic-form')&&['duration','language'].includes(input.name)){preserveDraftInputs(lesson,input.closest('form'));state.lesson=structuredClone(lesson);persist();refreshLessonStudioPreview();return true;}
 if(input.closest?.('#lesson-refine-form')&&Object.hasOwn(ensureLessonWizardDefaults(lesson).refinements,input.name)){lesson.refinements[input.name]=!!input.checked;state.lesson=structuredClone(lesson);persist();return true;}
 if(input.closest?.('#lesson-theme-form')&&input.name==='theme'&&lessonThemeLabels[input.value]){lesson.theme=input.value;state.lesson=structuredClone(lesson);persist();return true;}
 return false;
}
function savedMaterials(){
 const items=assignmentBatches().map(b=>({type:'single',id:b.id,title:new Set(b.records.map(r=>r.title)).size===1?b.records[0].title:b.records[0].kind==='lesson'?'Personalized lesson plans':'Individual '+(b.records[0].kind==='assessment'?'assessments':'assignments'),studentIds:[...new Set(b.records.flatMap(r=>r.studentIds))],model:b.records[0].model,kind:b.records[0].kind,createdAt:b.records[0].createdAt||b.records[0].updatedAt})).sort((a,b)=>(b.createdAt||b.updatedAt||'').localeCompare(a.createdAt||a.updatedAt||''));
 if(!items.length)return `<div class="empty"><h3>No materials yet</h3><p class="small">Personalized lessons, assignments, and assessments appear here.</p></div>`;
 return `<div class="saved-materials">${items.map(d=>`<article class="saved-draft"><div><h4>${esc(d.title)}</h4><p>${materialLabel(d.kind)} · ${esc(alphabeticalIds(d.studentIds||[]).map(id=>getStudent(id).name).join(', ')||'Select students')}</p></div>${btn('Open '+icon('arrow'),'open-assignment-overview','small',`data-id="${d.id}"`)}</article>`).join('')}</div>`;
}
document.addEventListener('selectionchange',rememberRichSelection);
document.addEventListener('mousedown',e=>{if(e.target.closest?.('.rich-toolbar button'))e.preventDefault();});
document.addEventListener('paste',e=>{if(!e.target.closest?.('#assignment-editor'))return;e.preventDefault();document.execCommand('insertText',false,e.clipboardData?.getData('text/plain')||'');queueAssignmentSave();});
document.addEventListener('drop',e=>{if(e.target.closest?.('#assignment-editor')){e.preventDefault();toast('Paste text into the editor to add content.');}});
