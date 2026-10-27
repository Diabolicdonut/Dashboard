import test from "node:test";
import assert from "node:assert/strict";
import {
  computeRoadmap, projectFromLive, projectFromSnapshot, getMilestones,
  filterAndSort, roadmapUrl, validRepo, summary, trustedUrl
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
