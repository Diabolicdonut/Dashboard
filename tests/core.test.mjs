import test from "node:test";
import assert from "node:assert/strict";
import {
  computeRoadmap, projectFromLive, projectFromSnapshot, getMilestones,
  filterAndSort, roadmapUrl, validRepo, summary, trustedUrl,
  implementationFromLive, displayedCompletion
} from "../src/core.mjs";

const project = {
  id: "demo", name: "Demo", category: "Game", repo: "Diabolicdonut/Demo",
  description: "Example", site: "https://diabolicdonut.github.io/Demo/",
  snapshot: { revision: "v0.1", asOf: "2026-10-27", roadmapPercent: 20, phase: "Foundation", completed: 1, total: 4, roadmapDocument: "docs/ROADMAP.md" }
};
const live = {
  schemaVersion: 1, revision: "v1.2", asOf: "2026-10-27",
  progress: { label: "Current phase", completed: 2, total: 4, note: "Phase-only metric" },
  roadmap: {
    label: "Full roadmap", document: "docs/ROADMAP.md",
    scope: "Full vision", note: "Partial gates do not earn headline weight",
    gates: [
      {id: "a", label: "Foundation", weight: 20, status: "accepted"},
      {id: "b", label: "Feature", weight: 30, status: "partial"},
      {id: "c", label: "Release", weight: 50, status: "planned"}
    ]
  }
};

test("headline percentage uses only accepted full-roadmap weights", () => {
  const result = computeRoadmap(live.roadmap);
  assert.equal(result.accepted, 20);
  assert.equal(result.total, 100);
  assert.equal(result.percent, 20);
  assert.equal(result.acceptedCount, 1);
});

test("phase progress does not inflate full-roadmap completion", () => {
  const result = projectFromLive(project, live);
  assert.equal(result.percent, 20);
  assert.equal(result.phaseCompleted, 2);
  assert.equal(result.phaseTotal, 4);
  assert.equal(result.phaseLabel, "Current phase");
  assert.equal(result.source, "live");
  assert.match(result.roadmapLink, /docs\/ROADMAP.md$/);
});

test("invalid gates or malformed schema reject rather than invent completion", () => {
  assert.throws(() => computeRoadmap({ gates: [{ id: "bad", label: "Bad", weight: -5, status: "accepted" }] }));
  assert.throws(() => computeRoadmap({ gates: [] }));
  assert.throws(() => projectFromLive(project, { ...live, schemaVersion: 9 }));
  assert.throws(() => computeRoadmap({ gates: [{ id: "bad", label: "Bad", weight: 2, status: "in-review" }] }));
});

test("snapshot fallback is clearly distinguished and never claims live gate details", () => {
  const result = projectFromSnapshot(project, "Network offline");
  assert.equal(result.source, "snapshot");
  assert.equal(result.revision, "v0.1");
  assert.equal(result.percent, 20);
  assert.equal(result.gates.length, 0);
  assert.match(result.roadmapLink, /docs\/ROADMAP.md$/);
});

test("milestones separate accepted, in-progress and planned gates", () => {
  const { accepted, inProgress, planned } = getMilestones(live.roadmap.gates);
  assert.equal(accepted[0].id, "a");
  assert.equal(inProgress[0].id, "b");
  assert.equal(planned[0].id, "c");
});

test("summary calculates an equal-weight project average", () => {
  const first = projectFromLive(project, live);
  const second = { ...first, id: "next", percent: 80 };
  assert.deepEqual(summary([first, second]), { projects: 2, average: 50, live: 2, snapshot: 0, accepted: 2 });
  const fallback = projectFromSnapshot(project);
  assert.equal(summary([first, fallback]).accepted, null);
});

test("project selection searches live milestone labels and sorts", () => {
  const first = projectFromLive(project, live);
  const second = { ...first, id: "other", category: "Reference", name: "Other", percent: 90 };
  assert.equal(filterAndSort([first, second], "feature", "Game", "name").length, 1);
  assert.equal(filterAndSort([first, second], "", "all", "progress")[0].name, "Other");
  assert.equal(filterAndSort([first, second], "", "all", "oldest")[0].name, "Demo");
});

test("links are constrained to trusted HTTPS hosts and paths", () => {
  assert.equal(validRepo("Diabolicdonut/BX-RPG"), true);
  assert.equal(validRepo("wrongowner/X"), false);
  assert.equal(trustedUrl("javascript:alert(1)"), false);
  assert.equal(trustedUrl("https://github.com/Diabolicdonut"), true);
  assert.equal(trustedUrl("https://attacker.example/"), false);
  assert.equal(roadmapUrl(project, {roadmap:{document:"../../unsafe"}}), "https://github.com/Diabolicdonut/Demo");
  assert.equal(roadmapUrl(project, {roadmap:{documentUrl:"https://attacker.example/roadmap",document:"ok.md"}}), "https://github.com/Diabolicdonut/Demo/blob/main/ok.md");
});


const implementationFixture = () => ({
  schemaVersion:1, revision:"v1.0", asOf:"2026-11-13",
  execution:{source:"docs/parallel-development/DEVELOPMENT-QUEUE.md",total:3},
  implementation:{
    method:"verified-queue-weighted-v1",
    partialAssignments:[{
      taskId:"DHR-001",fraction:0.5,mainCommit:"a".repeat(40),
      reason:"Reviewed partial, verified on merged main; unimplemented runtime work remains."
    }]
  },
  roadmap:{
    gates:[
      {id:"accepted",label:"Accepted core",status:"accepted",weight:38},
      {id:"partial",label:"Incomplete implementation",status:"partial",weight:42},
      {id:"planned",label:"Planned presentation",status:"planned",weight:20}
    ]
  }
});
const implementationQueue = [
  "| DHR-001 | **Ready** | 2 | #100 | Bounded partial work | [#100](https://github.com/Diabolicdonut/Demo/issues/100) |",
  "| DHR-002 | **Done** | 2 | #101 | Integrated deterministic work | [#101](https://github.com/Diabolicdonut/Demo/issues/101) |",
  "| DHR-003 | Blocked | 3 | #102 | Pending future work | [#102](https://github.com/Diabolicdonut/Demo/issues/102) |"
].join("\n");

test("engineering implementation is the only visible dinosaur headline while formal acceptance stays internally unchanged",()=>{
  const site=implementationFixture();
  const built=implementationFromLive(site,implementationQueue);
  assert.deepEqual(built,{percent:70,points:69.5,done:1,total:3,accepted:38});
  const result=projectFromLive(project,site,built);
  assert.equal(result.percent,38);
  assert.equal(result.implementation.percent,70);
  assert.equal(result.implementation.done,1);
  assert.equal(result.hasImplementation,true);
  assert.deepEqual(displayedCompletion(result),{
    source:"engineering-estimate",
    label:"ESTIMATED TOTAL COMPLETION",
    subtitle:"Engineering implementation across the approved roadmap",
    percent:70,
    points:69.5,
    foot:"1/3 completed assignments · evidence-based estimate, not playable readiness"
  });
  assert.equal(summary([result]).average,38,"Portfolio-wide roadmap average remains acceptance-based");
});

test("engineering estimate fails closed on incomplete, duplicate or unverified assignments",()=>{
  const site=implementationFixture();
  assert.equal(implementationFromLive(site,null),null);
  assert.equal(implementationFromLive(site,implementationQueue.replace(
    "| DHR-003 | Blocked |", "| DHR-002 | Blocked |")),null);
  assert.equal(implementationFromLive(site,implementationQueue.replace(
    "**Done**", "**Review**")),null);
  const bad=implementationFixture();
  bad.implementation.partialAssignments[0].mainCommit="open-pr";
  assert.equal(implementationFromLive(bad,implementationQueue),null);
  const malformed=implementationFixture();
  malformed.execution.total=79;
  assert.equal(implementationFromLive(malformed,implementationQueue),null);
  const safe=projectFromLive(project,site,null);
  assert.equal(safe.percent,38);
  assert.equal(safe.hasImplementation,true);
  assert.equal(safe.implementation,null);
  const noEstimate=displayedCompletion(safe);
  assert.equal(noEstimate.percent,null,
    "A missing implementation queue must not show 38% as the Dinosaur headline");
  assert.equal(noEstimate.source,"engineering-estimate");
  assert.match(noEstimate.foot,/unavailable/);
  const old=projectFromLive(project,live);
  assert.equal(old.hasImplementation,false);
  assert.equal(old.implementation,null);
  assert.equal(displayedCompletion(old).percent,20);
  assert.equal(displayedCompletion(old).label,"FULL ROADMAP COMPLETION");
  assert.equal(projectFromSnapshot(project).hasImplementation,false);
});

test("no duplicate partial evidence, no acceptance promotion, and incomplete caps",()=>{
  const site=implementationFixture();
  site.implementation.partialAssignments.push({...site.implementation.partialAssignments[0]});
  assert.equal(implementationFromLive(site,implementationQueue),null);
  const allDone=implementationFixture();
  const rows=implementationQueue.replace("| DHR-001 | **Ready** |", "| DHR-001 | **Done** |");
  const computed=implementationFromLive(allDone,rows);
  assert(computed);
  assert.equal(computed.accepted,38);
  assert.equal(computed.done,2);
  assert.equal(computed.percent,78); // accepted 38 + capped 95% of 42 = 77.9
  assert.equal(computed.points,77.9);
});

test("Dashboard card uses one overall modeled number when implementation is available",async()=>{
  const {readFileSync}=await import("node:fs");
  const widget=readFileSync(new URL("../src/app.mjs",import.meta.url),"utf8");
  const card=widget.slice(widget.indexOf("function makeCard("),
    widget.indexOf("function render()"));
  assert.match(card,/const display = displayedCompletion\(project\)/);
  assert.match(card,/display\.source === "engineering-estimate" \? "~" : ""/);
  assert.match(card,/display\.foot/);
  assert.doesNotMatch(card,/project\.percent \+ "%"/,
    "Accepted score must not be rendered directly by the Dinosaur card");
  assert.doesNotMatch(card,/project\.implementation\.done \+/,
    "Do not duplicate the engineering number in a second panel");
  assert.match(widget,/raw\.githubusercontent\.com/);
  assert.match(widget,/implementationFromLive\(json, await queueResponse\.text\(\)\)/);
});

test("snapshot and legacy projects retain their original headline presentation",()=>{
  const fromSource=displayedCompletion(projectFromLive(project,live));
  const fallback=displayedCompletion(projectFromSnapshot(project));
  assert.equal(fromSource.percent,20);
  assert.equal(fromSource.label,"FULL ROADMAP COMPLETION");
  assert.equal(fallback.percent,20);
  assert.match(fallback.foot,/Dated snapshot/);
});
