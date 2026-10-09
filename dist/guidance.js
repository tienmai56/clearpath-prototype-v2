'use strict';

// Demo recommendation rules. A note refreshes a versioned proposal, never a saved material.
function guidanceRecommendations(s,notes){
 const matching=pattern=>notes.filter(n=>pattern.test(n.text));
 const items=[];
 const directions=matching(/one[ -]step|one (direction|instruction)|several directions/i);
 if(directions.length)items.push({id:'directions',title:'Show one direction at a time',detail:'Keep the task and difficulty unchanged.',step:'Reveal one direction, let the student respond, then show the next.',sources:directions.slice(0,2)});
 const visuals=matching(/picture|visual/i);
 if(visuals.length){
  const reduce=/distract|overwhelm|too many|clutter/i.test(visuals[0].text);
  items.push({id:'visuals',title:reduce?'Reduce visual clutter':'Add a picture preview',detail:reduce?'Keep one relevant cue beside the current task.':'Preview the key ideas with pictures before starting.',step:reduce?'Show only the picture needed for the current step.':'Preview the story or task with a few relevant pictures.',sources:visuals.filter(n=>(/distract|overwhelm|too many|clutter/i.test(n.text))===reduce).slice(0,2)});
 }
 const oral=matching(/aloud|oral|talking through|say.*before writing/i),example=matching(/worked example|first step|choos.*information|which information/i);
 if(s.domain==='math'&&example.length)items.push({id:'model',title:'Model the first problem-solving step',detail:'Let the student complete the next problem.',step:'Model how to identify the information needed, then let the student try.',sources:example.slice(0,2)});
 else if(oral.length)items.push({id:'oral',title:'Add an oral rehearsal prompt',detail:s.domain==='reading'?'Ask for an oral retell before the written response.':'Have the student say the sentence before writing.',step:s.domain==='reading'?'Have the student retell the events aloud before writing.':'Let the student say one complete idea aloud before writing.',sources:oral.slice(0,2)});
 return items.slice(0,2);
}
function guidanceSnapshot(notes){return Object.fromEntries(notes.map(n=>[n.id,JSON.stringify([n.role,n.author,n.dateISO,n.text])]))}
function recommendationKey(items){return JSON.stringify(items.map(x=>[x.id,x.title,x.detail]).sort((a,b)=>a[0].localeCompare(b[0])))}
function guidanceUpdate(id){return state.guidanceUpdates?.[id]||null}
function hasNewGuidance(id){const u=guidanceUpdate(id);return !!u&&u.revision>u.reviewedRevision&&u.newNoteIds.length>0}
function newGuidanceNotes(s){const u=guidanceUpdate(s.id);return hasNewGuidance(s.id)?notesFor(s).filter(n=>u.newNoteIds.includes(n.id)):[]}
function guidanceChanged(u){return recommendationKey(u.recommendations)!==recommendationKey(u.baselineRecommendations)}
function guidanceTime(value){return new Date(value).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
function guidanceGoal(id){
 const saved=state.assignments.filter(a=>a.status==='ready'&&a.studentIds.includes(id)&&lessonObjectiveOptions(id,a.model.domain).some(o=>o.id===a.objectiveIds[id])).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
 const objective=saved?lessonObjectiveOptions(id,saved.model.domain).find(o=>o.id===saved.objectiveIds[id]):activeObjective(id);
 return {saved,objective,goal:saved?findGoal(id,objective.goalId):activeGoal(id)};
}
function makeGuidanceProposal(s,recommendations){
 const {saved,objective,goal}=guidanceGoal(s.id),domain=goal?.domain||s.domain;
 const context=recommendations.map(x=>x.title+'. '+x.detail).join('\n');
 const model=saved?structuredClone(saved.model):createLessonDraft(domain,context,[s.id]);
 Object.assign(model,{id:uid('draft'),studentIds:objective?[s.id]:[],objectiveIds:objective?{[s.id]:objective.id}:{},context,withVariations:false,kind:saved?.kind||'assignment'});
 if(saved)model.title=saved.title;
 const preparation=recommendations.find(x=>x.id==='visuals'||x.id==='model');
 const delivery=recommendations.find(x=>x.id==='directions'||x.id==='oral');
 const steps=[preparation?.step||'Introduce the task and check that the student understands the first step.',delivery?.step||'Let the student attempt the task with their usual accommodations.','Use the established objective to record the student’s response.'];
 return {model,goalId:goal?.id||null,objective:objective?.skill||'',steps,baseId:saved?.id||null,baseTitle:saved?.title||null};
}
function refreshGuidance(s,{initialize=false}={}){
 state.guidanceUpdates ||= {};
 const notes=notesFor(s),snapshot=guidanceSnapshot(notes),previous=guidanceUpdate(s.id);
 if(previous&&JSON.stringify(snapshot)===JSON.stringify(previous.snapshot))return false;
 if(!previous&&!notes.length)return false;
 const recommendations=guidanceFor(s),changedNotes=notes.filter(n=>!previous||previous.snapshot[n.id]!==snapshot[n.id]);
 // Two fictional updates make the review flow discoverable without flagging all historical notes.
 const seedIds=initialize&&!previous&&!s.isNew?({ava:['sample-note-ava-0','sample-prior-ava'],milo:['sample-note-milo-2']}[s.id]||[]):[];
 const firstUnread=seedIds.length?seedIds:initialize&&!previous?[]:changedNotes.map(n=>n.id);
 const baseline=previous?(hasNewGuidance(s.id)?previous.baselineRecommendations:previous.recommendations):seedIds.length?guidanceRecommendations(s,notes.filter(n=>!seedIds.includes(n.id))):recommendations;
 const pending=previous&&hasNewGuidance(s.id)?previous.newNoteIds:[];
 const newNoteIds=[...new Set([...pending,...firstUnread])].filter(id=>snapshot[id]);
 const revision=(previous?.revision||0)+1;
 state.guidanceUpdates[s.id]={revision,reviewedRevision:newNoteIds.length?(previous?.reviewedRevision||0):revision,reviewedAt:previous?.reviewedAt||null,generatedAt:seedIds.length?TODAY+'T08:30:00Z':new Date().toISOString(),snapshot,newNoteIds,baselineRecommendations:structuredClone(baseline),recommendations,proposal:makeGuidanceProposal(s,recommendations),draftId:previous?.draftId||null};
 return true;
}
function initializeGuidance(){let changed=false;for(const s of students)changed=refreshGuidance(s,{initialize:true})||changed;if(changed)persist()}
function markGuidanceReviewed(id,revision,draftId=null){
 const u=guidanceUpdate(id);if(!u||u.revision!==Number(revision))return false;
 u.reviewedRevision=u.revision;u.reviewedAt=new Date().toISOString();if(draftId)u.draftId=draftId;
 persist();return true;
}
function guidanceInputLabel(s){const notes=newGuidanceNotes(s);return `${notes.length} new ${notes.length===1?'input':'inputs'}`}
function guidanceSourceLine(s){
 const notes=newGuidanceNotes(s);if(!notes.length)return '';
 return `<div class="guidance-source">${stakeholderProfile(notes[0])}<span><strong>${esc(notes[0].author)}</strong><span>${esc(notes[0].role)}${notes.length>1?' · +'+(notes.length-1)+' more':''}</span></span></div>`;
}
function guidanceSection(s){
 const u=guidanceUpdate(s.id);if(!u)return '';
 const unread=hasNewGuidance(s.id),changed=guidanceChanged(u),hasPlan=!!u.recommendations.length,ready=!!activeObjective(s.id);
 return `<section class="content-section guidance-update" aria-labelledby="guidance-heading">
  <div class="section-row"><div><div class="guidance-kicker">${unread?`<i class="unread-dot"></i>${guidanceInputLabel(s)}`:u.reviewedAt?'Reviewed '+guidanceTime(u.reviewedAt):'Current guidance'}</div><h2 id="guidance-heading">${unread?(changed&&hasPlan?'Lesson update ready':'New input received'):'Guided instruction'}</h2></div><span class="guidance-timestamp">Updated ${guidanceTime(u.generatedAt)}</span></div>
  <p class="guidance-auto">Updates automatically whenever a note is added.</p>
  ${unread?guidanceSourceLine(s):''}
  ${unread&&!changed?'<p class="guidance-unchanged">No lesson change suggested from this input.</p>':unread&&!hasPlan?'<p class="guidance-unchanged">No specific lesson change suggested. Review the new input.</p>':''}
  ${hasPlan?`<ul class="guidance-preview">${u.recommendations.map(t=>`<li>${esc(t.title)}</li>`).join('')}</ul>`:''}
  <div class="actions">${unread?btn(changed&&hasPlan?'Review lesson update':'Review new input','review-guidance','primary',`data-id="${s.id}"`):ready&&hasPlan?btn('Create guided materials','guided-materials','primary',`data-id="${s.id}"`):''}${!unread&&hasPlan?btn('View latest guidance','review-guidance','',`data-id="${s.id}"`):''}</div>
 </section>`;
}
function guidanceChangeLabel(u,item){const old=u.baselineRecommendations.find(x=>x.id===item.id);return !old?'New':old.title!==item.title||old.detail!==item.detail?'Updated':'Continue'}
function openGuidanceReview(id){
 const s=getStudent(id),u=guidanceUpdate(id);if(!u)return;
 u.proposal=makeGuidanceProposal(s,u.recommendations);
 studentTab='evidence';if(route().page!=='student'||route().id!==id)navigate('student/'+id);else render();
 // A hashchange must not close the dialog that opened it.
 pendingGuidanceReview=id;
 if(route().id===id)renderGuidanceReview(s,u);
}
let pendingGuidanceReview=null;
function renderGuidanceReview(s,u){
 const unread=hasNewGuidance(s.id),newNotes=newGuidanceNotes(s),proposal=u.proposal;
 const sourceNotes=unread?newNotes:notesFor(s).filter(n=>u.recommendations.some(t=>t.sources.some(source=>source.id===n.id)));
 const canDraft=!!proposal.model.studentIds.length&&lessonObjectiveOptions(s.id,proposal.model.domain).some(o=>o.id===proposal.model.objectiveIds[s.id]);
 openModal('Recommended lesson update',s.name,`<div class="guidance-review">
  <div class="guidance-review-meta"><span>${unread?guidanceInputLabel(s):'Latest guidance'}</span><span>Generated ${guidanceTime(u.generatedAt)}</span></div>
  <section class="guidance-review-section"><h3>${unread?'What came in':'Supporting inputs'}</h3>${sourceNotes.map((n,i)=>`<div class="guidance-input"><div class="guidance-input-head">${stakeholderProfile(n)}<div><strong>${esc(n.author)}</strong><span>${esc(n.role)} · ${formatDate(n.dateISO)}</span></div>${noteCitation(n,Math.max(0,notesFor(s).findIndex(x=>x.id===n.id))+1)}</div><p>${esc(n.text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()||n.text)}</p></div>`).join('')}</section>
  <section class="guidance-review-section"><h3>${guidanceChanged(u)?'Recommended changes':'Current recommendations'}</h3>${!guidanceChanged(u)?'<p class="guidance-unchanged">No lesson change suggested from the new input.</p>':''}${u.recommendations.map(t=>`<div class="guidance-change"><span class="guidance-change-label">${guidanceChangeLabel(u,t)}</span><div><h4>${esc(t.title)}</h4><p>${esc(t.detail)} ${t.sources.map(n=>noteCitation(n,Math.max(0,notesFor(s).findIndex(x=>x.id===n.id))+1)).join(' ')}</p></div></div>`).join('')||'<p class="section-description">Review the source note before deciding whether to adapt instruction.</p>'}</section>
  ${u.recommendations.length?`<section class="guidance-review-section"><div class="section-row"><h3>Suggested lesson plan</h3><span class="caption no-margin">${proposal.baseTitle?'From saved material':'Example lesson'}</span></div><h4 class="guidance-lesson-title">${esc(proposal.model.title)}</h4>${proposal.objective?`<p class="guidance-objective">Objective: ${esc(proposal.objective)}</p>`:''}<ol class="guidance-plan">${proposal.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p class="caption">${proposal.baseTitle?'Uses the lesson content from “'+esc(proposal.baseTitle)+'”. ':' '}Keep the objective and usual accommodations.</p></section>`:''}
  <div class="modal-foot guidance-review-foot">${unread?btn('Mark reviewed','mark-guidance-reviewed','',`data-id="${s.id}" data-revision="${u.revision}"`):btn('Close','close')}${canDraft&&u.recommendations.length?btn('Create revised draft','draft-guidance','primary',`data-id="${s.id}" data-revision="${u.revision}"`):''}</div>
 </div>`,{wide:true});
}
function openGuidanceDraft(id,revision){
 const u=guidanceUpdate(id);if(!u||u.revision!==Number(revision)){toast('A newer update is ready. Review it first.');return openGuidanceReview(id);}
 if(!u.proposal.model.studentIds.length)return toast('Establish an objective in the IEP plan first.');
 pendingGuidanceReview=null;
 const model=structuredClone(u.proposal.model);model.guidanceReview={student:id,revision:u.revision};
 assignmentFlow={stage:'setup',model,recordId:null};renderDraftingModal();
}
function completeGuidanceDraft(model,record){
 const review=model.guidanceReview;if(!review||!model.studentIds.includes(review.student))return;
 const u=guidanceUpdate(review.student);
 if(!u||u.revision!==review.revision||model.domain!==u.proposal.model.domain||model.objectiveIds[review.student]!==u.proposal.model.objectiveIds[review.student]||model.context!==u.proposal.model.context)return;
 markGuidanceReviewed(review.student,review.revision,record.id);
}
function handleGuidanceAction(action,el){
 const {id,revision}=el.dataset;
 if(action==='review-guidance'){openGuidanceReview(id);return true;}
 if(action==='mark-guidance-reviewed'){if(markGuidanceReviewed(id,revision)){closeModal();render();toast('Guidance marked reviewed.');}else{toast('A newer update is ready.');openGuidanceReview(id);}return true;}
 if(action==='draft-guidance'){openGuidanceDraft(id,revision);return true;}
 return false;
}
