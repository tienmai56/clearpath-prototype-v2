/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const collectionSource=fs.readFileSync(path.join(root,'public/clearpath/data-collection.js'),'utf8');
const appSource=fs.readFileSync(path.join(root,'public/clearpath/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'app/workspace.html'),'utf8');
const context=vm.createContext({
 localStorage:{getItem(){return null},setItem(){}},
 document:{addEventListener(){}},window:{print(){},scrollTo(){}},
 icon(name){return `<svg data-icon="${name}"></svg>`},
 esc(value){return String(value)},
 console
});
vm.runInContext(collectionSource,context);

assert.match(appSource,/href="#collect"/);
assert.match(appSource,/dataCollectionView\(\)/);
assert.match(html,/data-collection\.js/);
const uploadView=vm.runInContext('dataCollectionView()',context);
assert.match(uploadView,/Accuracy - Upload data sheets/);
assert.match(uploadView,/Click to upload/);
assert.match(uploadView,/Use your phone/);
assert.match(uploadView,/Naturalistic group data sheet/);
assert.doesNotMatch(uploadView,/Use this layout/);
assert.doesNotMatch(collectionSource,/Use this layout/);
assert.match(vm.runInContext("collectionResult('accuracy').rule",context),/Only “\+” counts as correct/);
vm.runInContext("collectionState.files=[{name:'Naturalistic group data sheet.jpg',size:102400,type:'image/jpeg',source:'sample',previewURL:'/clearpath/naturalistic-data-sheet.jpg'}];collectionState.stage='review';collectionState.method='accuracy'",context);
const reviewView=vm.runInContext('dataCollectionView()',context);
assert.match(reviewView,/4 correct/);
assert.match(reviewView,/1 not correct/);
assert.match(reviewView,/min-width:0/);
assert.doesNotMatch(reviewView,/Confirm the detected result/);
assert.doesNotMatch(reviewView,/Scoring rule:/);
console.log('Collect data upload entry, annotated sample review, and compact review header verified.');
