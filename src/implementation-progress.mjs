// Read-only dashboard mirror of Dinosaur-Horror-RPG/src/implementation-progress.mjs
// Reviewed source commit: 6e6f5778a2fe87eec9b3bd856c0b967aa451ef53 (PR #143).
// Keep synchronized with source parser/formula changes; not an independent progress authority.
/** DHR progress estimator: strict queue-based implementation evidence, not gate acceptance. */
export function executionFor(config, markdown, roadmap) {
    const e = config.execution;
    if (!e || !roadmap || typeof markdown !== 'string' ||
        !Number.isSafeInteger(e.total) || e.total < 1 || e.total > 999 ||
        typeof e.source !== 'string' || !/^[a-zA-Z0-9_./-]+$/.test(e.source) ||
        e.source.includes('..')) return null;
    const lines = markdown.split(/\r?\n/).filter(line => /^\| DHR-\d{3} \|/.test(line));
    if (lines.length !== e.total) return null;
    const perGate = roadmap.gates.map(() => ({done: 0, ready: 0, blocked: 0, total: 0}));
    const counts = {done: 0, ready: 0, blocked: 0, total: e.total};
    const seen = new Set();
    const tasks = Object.create(null);
    for (const line of lines) {
      const cells = line.split('|').slice(1, -1).map(x => x.trim());
      if (cells.length !== 6) return null;
      const id = /^DHR-(\d{3})$/.exec(cells[0]);
      if (!id || seen.has(id[1]) || Number(id[1]) < 1 || Number(id[1]) > e.total)
        return null;
      seen.add(id[1]);
      const status = cells[1] === '**Done**' ? 'done' :
        cells[1] === '**Ready**' ? 'ready' : cells[1] === 'Blocked' ? 'blocked' : null;
      if (!status || !cells[4] ||
          (status === 'done' && !/^\[#\d+\]\(https:\/\/github\.com\//.test(cells[5])))
        return null;
      const refs = cells[2].split(',').map(x => x.trim());
      const parsed = refs.map(x => Number(x));
      if (!refs.length || parsed.some((n, i) => !/^\d{1,2}$/.test(refs[i]) ||
          n < 1 || n > perGate.length) || new Set(parsed).size !== parsed.length)
        return null;
      counts[status]++;
      tasks[id[0]] = {status, gates: parsed};
      for (const n of parsed) {
        const bucket = perGate[n - 1];
        bucket[status]++; bucket.total++;
      }
    }
    if (seen.size !== e.total || counts.done + counts.ready + counts.blocked !== e.total)
      return null;
    return {counts, perGate, tasks, percent: Math.round(1000 * counts.done / e.total) / 10};
  }

/**
 * The accepted 100-point score stays binary and authoritative. The separate
 * engineering estimate credits ONLY:
 *  - source-verified integrated worker assignments in the authoritative queue;
 *  - explicitly audited, merged-main partial slices (never open PRs).
 * The same task may inform multiple gates, but contributes at most once to
 * each gate's normalized task denominator. Unaccepted gates cap at 95%.
 * This is coverage of the planned implementation slices, not time spent,
 * readiness, user-facing completeness or a substitute for live acceptance.
 */
export function implementationFor(config, execution, roadmap) {
  const ledger=config?.implementation;
  if (!ledger || ledger.method!=='verified-queue-weighted-v1' ||
      !Array.isArray(ledger.partialAssignments) || !execution ||
      !roadmap || !Array.isArray(roadmap.gates) ||
      !execution.tasks || !Array.isArray(execution.perGate) ||
      execution.perGate.length!==roadmap.gates.length ||
      roadmap.total!==100) return null;

  const partialById=Object.create(null);
  const allAuditedIds=new Set();
  for (const entry of ledger.partialAssignments) {
    if (!entry || typeof entry.taskId!=='string' ||
        !/^DHR-\d{3}$/.test(entry.taskId) ||
        allAuditedIds.has(entry.taskId) ||
        !Number.isFinite(entry.fraction) ||
        entry.fraction<=0 || entry.fraction>=1 ||
        typeof entry.mainCommit!=='string' ||
        !/^[0-9a-f]{40}$/.test(entry.mainCommit) ||
        typeof entry.reason!=='string' ||
        entry.reason.trim().length<24 || entry.reason.length>450 ||
        !execution.tasks[entry.taskId]) return null;
    allAuditedIds.add(entry.taskId);
    // Once a task is fully integrated, the queue supersedes the old partial
    // evidence. Never add its fraction a second time.
    if (execution.tasks[entry.taskId].status==='done') continue;
    partialById[entry.taskId]=entry;
  }

  const perGate=roadmap.gates.map((gate,index)=>{
    const task=execution.perGate[index];
    if (!task || !Number.isInteger(task.total) || task.total<0 ||
        !Number.isInteger(task.done) || task.done<0 ||
        task.done>task.total) return null;
    let partial=0;
    for (const [taskId,entry] of Object.entries(partialById)) {
      if (execution.tasks[taskId].gates.includes(index+1))
        partial+=entry.fraction;
    }
    const fraction=gate.status==='accepted'?1:
      task.total>0?Math.min(.95,(task.done+partial)/task.total):0;
    return {id:gate.id,fraction,
      percent:Math.round(fraction*100),partial,
      completedTasks:task.done,totalTasks:task.total,
      earnedPoints:gate.weight*fraction};
  });
  if (perGate.some(p=>p===null)) return null;
  const points=perGate.reduce((sum,p)=>sum+p.earnedPoints,0);
  if (!Number.isFinite(points) || points<roadmap.done || points>100) return null;
  const exact=Math.round(points*10)/10;
  const partialAssignments=Object.values(partialById);
  return {
    points:exact,percent:Math.round(points),acceptedPoints:roadmap.done,
    perGate,partialAssignments,
    completeAssignments:execution.counts.done,
    totalAssignments:execution.counts.total
  };
}
