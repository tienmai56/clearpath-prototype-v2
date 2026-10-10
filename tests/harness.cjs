const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=require('path').join(__dirname,'../public/clearpath/');
function environment(storage=new Map(),files=new Map()){
 const nodes=new Map(),handlers={},winHandlers={};let storageFails=false;
 function node(id){if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',textContent:'',value:'',style:{},classList:{add(){},remove(){},contains(){return false}},addEventListener(t,f){this[t]=f},querySelector(){return null},querySelectorAll(){return []},focus(){},click(){this.clicked=true}});return nodes.get(id)}
 const document={getElementById:node,body:{style:{}},activeElement:{focus(){}},addEventListener(t,f){handlers[t]=f}};
 let hash='#class';const location={get hash(){return hash},set hash(v){hash=v.startsWith('#')?v:'#'+v;winHandlers.hashchange?.()}};
 class FormData{constructor(form){this.values=Object.entries(form.payload)}[Symbol.iterator](){return this.values[Symbol.iterator]()}}
 const db={close(){},transaction(){const tx={objectStore(){return {put:f=>files.set(f.id,f),delete:id=>files.delete(id),clear:()=>files.clear(),get(id){const r={};setImmediate(()=>{r.result=files.get(id);r.onsuccess?.()});return r}}}};setImmediate(()=>tx.oncomplete?.());return tx;}};
 const indexedDB={open(){const r={};setImmediate(()=>{r.result=db;r.onsuccess?.()});return r;}};
 const ctx={console,fetch:async()=>{throw Error('Network unavailable in harness')},document,location,indexedDB,window:{addEventListener(t,f){winHandlers[t]=f},scrollTo(){},print(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(storageFails)throw Error('quota');storage.set(k,v)}},setTimeout(){return 1},clearTimeout(){},structuredClone,FormData,Date,Math,JSON,Number,String,Object,Array,Set,Map,URL:{createObjectURL:()=> 'blob:test-image',revokeObjectURL(){}},File,Blob};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'mobile-transfer.js','utf8'),ctx);vm.runInContext(fs.readFileSync(root+'progress.js','utf8'),ctx);vm.runInContext(fs.readFileSync(root+'selection.js','utf8'),ctx);vm.runInContext(fs.readFileSync(root+'assignments.js','utf8'),ctx);vm.runInContext(fs.readFileSync(root+'guidance.js','utf8'),ctx);vm.runInContext(fs.readFileSync(root+'trials.js','utf8'),ctx);vm.runInContext(fs.readFileSync(root+'goals.js','utf8'),ctx);vm.runInContext(fs.readFileSync(root+'app.js','utf8'),ctx);
 return {handlers,ctx,files,storage,failStorage:v=>storageFails=v,run:s=>vm.runInContext(s,ctx),html:()=>node('app').innerHTML,modal:()=>node('overlay').innerHTML,node,view:r=>location.hash='#'+r,click:(action,extra={})=>handlers.click({target:{closest(){return {dataset:{action,...extra}}}},preventDefault(){}}),change:props=>handlers.change({target:{dataset:{},...props}}),submit:(id,payload)=>handlers.submit({target:{id,payload,dataset:{assignmentSetup:id==='assignment-draft-form'?'popup':'page'},querySelector(){return null}},preventDefault(){}})};
}

module.exports={environment};
