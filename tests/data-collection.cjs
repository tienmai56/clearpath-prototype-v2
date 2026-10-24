/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const collectionSource=fs.readFileSync(path.join(root,'public/clearpath/data-collection.js'),'utf8');
const collectionStyles=fs.readFileSync(path.join(root,'public/clearpath/data-collection.css'),'utf8');
const appSource=fs.readFileSync(path.join(root,'public/clearpath/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app/workspace.html'),'utf8');
const context=vm.createContext({
 localStorage:{getItem(){return null},setItem(){}},
 document:{addEventListener(){}},window:{print(){},scrollTo(){}},
 students:[{id:'ava',name:'Ava Carter'},{id:'amir',name:'Amir Hassan'}],
 icon(name){return `<svg data-icon="${name}"></svg>`},
 esc(value){return String(value)},
 console
});
vm.runInContext(collectionSource,context);

assert.match(appSource,/href="#collect"/);
assert.match(appSource,/dataCollectionView\(\)/);
assert.match(html,/data-collection\.js/);
assert.match(collectionStyles,/\.collection-student-picker \.student-picker-menu\{position:absolute/);
const uploadView=vm.runInContext('dataCollectionView()',context);
assert.match(uploadView,/Accuracy - Upload data sheets/);
assert.match(uploadView,/Select a student/);
assert.match(uploadView,/Ava Carter/);
assert.match(uploadView,/data-collection-student-search/);
assert.match(uploadView,/data-collection-action="select-student"/);
assert.doesNotMatch(uploadView,/collection-step-number/);
assert.doesNotMatch(uploadView,/Choose who this data belongs to/);
assert.doesNotMatch(uploadView,/Select a student to continue/);
assert.match(uploadView,/id="collection-files"[^>]*disabled/);
assert.match(uploadView,/Click to upload/);
assert.match(uploadView,/Use your phone/);
assert.match(uploadView,/Naturalistic group data sheet/);
assert.doesNotMatch(uploadView,/Use this layout/);
assert.doesNotMatch(collectionSource,/Use this layout/);
assert.match(vm.runInContext("collectionResult('accuracy').rule",context),/Only “\+” counts as correct/);
vm.runInContext("collectionState.studentId='ava'",context);
const readyUploadView=vm.runInContext('dataCollectionView()',context);
assert.match(readyUploadView,/id="collection-student-value"[^>]*>Ava Carter</);
assert.match(readyUploadView,/data-student="ava"[^>]*aria-selected="true"/);
assert.doesNotMatch(readyUploadView,/id="collection-files"[^>]*disabled/);
vm.runInContext("collectionState.files=[{name:'Naturalistic group data sheet.jpg',size:102400,type:'image/jpeg',source:'sample',previewURL:'/clearpath/naturalistic-data-sheet.jpg'}];collectionState.stage='review';collectionState.method='accuracy'",context);
const reviewView=vm.runInContext('dataCollectionView()',context);
assert.match(reviewView,/collection-review-student/);
assert.match(reviewView,/id="collection-review-student-value"[^>]*>Ava Carter</);
assert.match(reviewView,/data-student="ava"[^>]*aria-selected="true"/);
assert.match(reviewView,/4 correct/);
assert.match(reviewView,/1 not correct/);
assert.match(reviewView,/collection-calculation-sheet/);
assert.equal((reviewView.match(/<tr>/g)||[]).length,3);
assert.match(reviewView,/<th scope="row">Correct “\+” marks<\/th><td>4<\/td>/);
assert.match(reviewView,/<th scope="row">Not correct marks<\/th><td>1<\/td>/);
assert.match(reviewView,/<th scope="row">Total trials<\/th><td>5<\/td>/);
assert.doesNotMatch(reviewView,/collection-mark-summary|collection-detected-marks|collection-formula/);
assert.match(reviewView,/4 correct ÷ 5 total trials × 100 = 80%/);
assert.match(reviewView,/min-width:0/);
assert.equal((reviewView.match(/data-collection-action="save-review"/g)||[]).length,1);
assert.doesNotMatch(reviewView,/Confirm the detected result/);
assert.doesNotMatch(reviewView,/Scoring rule:/);
console.log('Collect data upload entry, annotated sample review, and compact review header verified.');
