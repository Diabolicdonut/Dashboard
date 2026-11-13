import test from 'node:test';
import assert from 'node:assert/strict';
import {paleontologyImplementationFor} from '../src/paleontology-progress.mjs';
import {implementationFromLive,projectFromLive,displayedCompletion} from '../src/core.mjs';
const SHA='a'.repeat(40),URL='https://github.com/Diabolicdonut/Paleontology-Tracker/pull/1';
const fixture=()=>{
 const site={
  schemaVersion:1,project:'Paleontology-Tracker',revision:'v0.1.0',asOf:'2026-11-13',
  execution:{source:'data/development-ledger.json',total:2},
  implementation:{method:'verified-deliverables-v1',scopeVersion:'initial'},
  roadmap:{label:'Total plan',document:'docs/DEVELOPMENT-ROADMAP.md',gates:[
    {id:'foundation',label:'Foundation',weight:20,status:'planned'},
    {id:'other',label:'Other',weight:80,status:'planned'}
  ]},
  progress:{label:'Bootstrap',completed:0,total:1}
 };
 const tasks=[
  {id:'PAL-001',title:'Foundational unit',wave:'bootstrap',gateId:'foundation',dependsOn:[],weight:20,status:'planned',credit:0,mergedMainCommit:null,evidenceUrl:null,auditNote:null},
  {id:'PAL-002',title:'Remaining delivery',wave:'wave-2',gateId:'other',dependsOn:['PAL-001'],weight:80,status:'planned',credit:0,mergedMainCommit:null,evidenceUrl:null,auditNote:null}
 ];
 return {site,ledger:{schemaVersion:1,project:'Paleontology-Tracker',model:'verified-deliverables-v1',scopeVersion:'initial',tasks}};
};
test('independent estimator accepts initial valid 0% state',()=>{
 const {site,ledger}=fixture();
 assert.deepEqual(paleontologyImplementationFor(site,ledger),{percent:0,points:0,done:0,total:2,accepted:0});
 const display=implementationFromLive(site,JSON.stringify(ledger));
 assert.deepEqual(display,{percent:0,points:0,done:0,total:2,accepted:0});
 const project={id:'paleontology',name:'Paleontology Tracker',category:'Reference',repo:'Diabolicdonut/Paleontology-Tracker',site:'https://diabolicdonut.github.io/Paleontology-Tracker/',snapshot:{roadmapPercent:0}};
 const card=displayedCompletion(projectFromLive(project,site,display));
 assert.equal(card.label,'ESTIMATED TOTAL COMPLETION');
 assert.equal(card.percent,0);
 assert.ok(card.foot.includes('0/2 completed assignments'));
});
test('verified done and partial credits are weighted, not assignment-count percentage',()=>{
 const {site,ledger}=fixture();site.roadmap.gates[0].status='partial';
 Object.assign(ledger.tasks[0],{status:'done',credit:1,mergedMainCommit:SHA,evidenceUrl:URL});
 assert.equal(implementationFromLive(site,JSON.stringify(ledger)).points,19);
 assert.equal(implementationFromLive(site,JSON.stringify(ledger)).percent,19);
 site.roadmap.gates[0].status='accepted';
 assert.equal(implementationFromLive(site,JSON.stringify(ledger)).points,20);
 site.roadmap.gates[1].status='partial';
 Object.assign(ledger.tasks[1],{status:'partial',credit:.5,mergedMainCommit:SHA,evidenceUrl:URL,
 auditNote:'Reviewed merged half of the implementation only; remaining coverage awaits integration.'});
 assert.equal(implementationFromLive(site,JSON.stringify(ledger)).points,60);
});
test('fail closed: forged status, missing evidence, scope drift and cycles',()=>{
 for(const mutation of [
   ({ledger})=>Object.assign(ledger.tasks[0],{status:'done',credit:1}),
   ({ledger})=>ledger.tasks[1].weight=50,
   ({site})=>site.implementation.scopeVersion='wrong',
   ({ledger})=>ledger.tasks[0].dependsOn.push('PAL-002'),
   ({ledger})=>ledger.tasks[1].id='PAL-001'
 ]) {
   const data=fixture();mutation(data);
   assert.equal(implementationFromLive(data.site,JSON.stringify(data.ledger)),null);
 }
});
