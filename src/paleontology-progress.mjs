// Read-only independent verifier for Paleontology Tracker's reviewed
// verified-deliverables-v1 ledger. Never load/execute JS from the source repo.
const SHA=/^[0-9a-f]{40}$/;
const PR=/^https:\/\/github\.com\/Diabolicdonut\/Paleontology-Tracker\/pull\/\d+$/;
const ID=/^PAL-\d{3}$/;
const statuses=new Set(['planned','blocked','in_review','partial','done']);
const gateStatuses=new Set(['planned','partial','accepted']);
export function paleontologyImplementationFor(site, ledger) {
  if(site?.schemaVersion!==1 || site.project!=='Paleontology-Tracker' ||
     site.implementation?.method!=='verified-deliverables-v1' ||
     site.execution?.source!=='data/development-ledger.json' ||
     ledger?.schemaVersion!==1 || ledger.project!==site.project ||
     ledger.model!==site.implementation.method ||
     ledger.scopeVersion!==site.implementation.scopeVersion ||
     !Array.isArray(ledger.tasks) || ledger.tasks.length!==site.execution.total ||
     !Array.isArray(site.roadmap?.gates) || !site.roadmap.gates.length) return null;
  const gates=new Map();
  for(const g of site.roadmap.gates){
    if(!g || typeof g.id!=='string' || !g.id || gates.has(g.id) ||
       !Number.isSafeInteger(g.weight) || g.weight<=0 || !gateStatuses.has(g.status))return null;
    gates.set(g.id,{...g,taskWeight:0,creditWeight:0,done:0,total:0});
  }
  if([...gates.values()].reduce((n,g)=>n+g.weight,0)!==100)return null;
  const tasks=new Map();
  let done=0;
  for(const t of ledger.tasks){
    if(!t || typeof t.id!=='string' || !ID.test(t.id) || tasks.has(t.id) ||
       !gates.has(t.gateId) || !Number.isSafeInteger(t.weight) || t.weight<=0 ||
       !statuses.has(t.status) || !Array.isArray(t.dependsOn) ||
       !t.dependsOn.every(id=>typeof id==='string' && ID.test(id) && id!==t.id) ||
       new Set(t.dependsOn).size!==t.dependsOn.length ||
       !Number.isFinite(t.credit) || t.credit<0 || t.credit>1)return null;
    const evidence=typeof t.mergedMainCommit==='string' && SHA.test(t.mergedMainCommit) &&
      typeof t.evidenceUrl==='string' && PR.test(t.evidenceUrl);
    if(t.status==='done'){
      if(t.credit!==1 || !evidence)return null;
      done++;
    }else if(t.status==='partial'){
      if(t.credit<=0 || t.credit>=1 || !evidence || typeof t.auditNote!=='string' ||
         t.auditNote.trim().length<24)return null;
    }else if(t.credit!==0 || t.mergedMainCommit!==null ||
             t.evidenceUrl!==null || t.auditNote!==null)return null;
    tasks.set(t.id,t);
    const g=gates.get(t.gateId);
    g.taskWeight+=t.weight;g.creditWeight+=t.weight*t.credit;g.total++;
    if(t.status==='done')g.done++;
  }
  for(const t of tasks.values())if(t.dependsOn.some(id=>!tasks.has(id)))return null;
  const active=new Set(),seen=new Set();
  function visit(id){
    if(active.has(id))throw new Error('Cyclic dependency');
    if(seen.has(id))return;
    active.add(id);for(const dep of tasks.get(id).dependsOn)visit(dep);
    active.delete(id);seen.add(id);
  }
  try {for(const id of tasks.keys())visit(id);}catch{return null;}
  let points=0,accepted=0;
  for(const g of gates.values()){
    if(g.taskWeight!==g.weight || (g.status==='planned' && g.creditWeight>0) ||
       (g.status==='accepted' && g.done!==g.total))return null;
    if(g.status==='accepted')accepted+=g.weight;
    points+=g.status==='accepted'?g.weight:Math.min(g.weight*.95,g.creditWeight);
  }
  if(points+1e-8<accepted || points<0 || points>100)return null;
  return {percent:Math.round(points),points:Math.round(points*10)/10,
          done,total:tasks.size,accepted};
}
