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
assert.equal(vm.runInContext("collectionAccuracy(['+','+','VB','','−'])",context),40);
assert.equal(vm.runInContext("cycleCollectionCode('+',responseCodes)",context),'−');
assert.equal(vm.runInContext("durationTotals().minutes",context),10);
assert.match(vm.runInContext("collectionLibrary()",context),/Collect data/);
assert.match(vm.runInContext("multipleGoalsView()",context),/Only “\+” counts as correct/);
console.log('Collect data navigation, scoring, and duration totals verified.');
