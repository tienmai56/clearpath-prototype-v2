const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public/clearpath/app.js'),'utf8');
const classroom=fs.readFileSync(path.join(root,'public/clearpath/classroom.css'),'utf8');
const avatarPath=path.join(root,'public/clearpath/student-animal-avatars.png');

assert.match(app,/const classAnimalAvatars=\['bunny','fox','panda','bear','cat','dog','owl','lion','koala','tiger','raccoon','penguin'\]/);
assert.match(app,/\$\{classAnimalAvatar\(s\)\}/);
assert.match(app,/View progress/);
assert.doesNotMatch(app,/student-card-link">View student/);
assert.match(classroom,/student-animal-avatars\.png/);
assert.ok(fs.statSync(avatarPath).size>0,'animal avatar sprite should be present');

console.log('Classroom animal avatar checks passed.');
