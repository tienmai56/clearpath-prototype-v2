const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public/clearpath/app.js'),'utf8');
const classroom=fs.readFileSync(path.join(root,'public/clearpath/classroom.css'),'utf8');
const avatarPath=path.join(root,'public/clearpath/student-animal-avatars.png');
const {environment}=require('./harness.cjs');

assert.match(app,/const classAnimalAvatars=\['bunny','fox','panda','bear','cat','dog','owl','lion','koala','tiger','raccoon','penguin'\]/);
assert.match(app,/\$\{classAnimalAvatar\(s\)\}/);
for(const heading of ['Name','Grade','Present level','IEP goals','Progress'])assert.match(app,new RegExp(`<th scope="col">${heading}</th>`));
assert.ok(app.includes('href="#student/${s.id}"'));
assert.ok(app.includes('href="#student/${s.id}/iep"'));
assert.ok(app.includes('href="#student/${s.id}/progress"'));
assert.match(app,/class="classroom-table-link"/);
assert.doesNotMatch(app,/student-card-grid/);
assert.match(classroom,/student-animal-avatars\.png/);
assert.match(classroom,/\.classroom-roster/);
assert.ok(fs.statSync(avatarPath).size>0,'animal avatar sprite should be present');

const roster=environment().html();
assert.equal((roster.match(/class="classroom-table-link"/g)||[]).length,36,'each student should have three section links');
for(const path of ['#student/ava"','#student/ava/iep"','#student/ava/progress"'])assert.ok(roster.includes(`href="${path}`));

console.log('Classroom animal avatar checks passed.');
