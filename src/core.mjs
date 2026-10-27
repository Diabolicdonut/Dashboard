// Pure, dependency-free transforms used by the browser dashboard and Node tests.
// The canonical percentages come ONLY from accepted roadmap gate weights.
export function validRepo(repo) {
  return /^Diabolicdonut\/[A-Za-z0-9._-]+$/.test(String(repo || ""));
}

export function trustedUrl(url) {
  try {
    const value = new URL(url);
    return value.protocol === "https:" && ["github.com", "diabolicdonut.github.io"].includes(value.hostname);
  } catch {
    return false;
  }
}

export function roadmapUrl(project, data) {
  const supplied = data?.roadmap?.documentUrl;
  if (trustedUrl(supplied) && supplied.startsWith("https://github.com/" + project.repo + "/")) {
    return supplied;
  }
  const doc = data?.roadmap?.document || project.snapshot?.roadmapDocument;
  if (typeof doc !== "string" || !doc || doc.split("/").some(segment => !segment || segment === "." || segment === "..")) {
    return "https://github.com/" + project.repo;
  }
  return "https://github.com/" + project.repo + "/blob/main/" + doc.split("/").map(encodeURIComponent).join("/");
}

export function computeRoadmap(roadmap) {
  if (!roadmap || !Array.isArray(roadmap.gates) || roadmap.gates.length === 0) {
    throw new Error("No accepted roadmap gate ledger");
  }
  const gates = roadmap.gates.map((gate, index) => {
    const weight = Number(gate.weight);
    if (!Number.isFinite(weight) || weight <= 0 || !["accepted", "partial", "planned"].includes(gate.status) || !gate.id || !gate.label) {
      throw new Error("Invalid roadmap gate at index " + index);
    }
    return { ...gate, weight };
  });
  const total = gates.reduce((sum, gate) => sum + gate.weight, 0);
  const accepted = gates.filter(gate => gate.status === "accepted").reduce((sum, gate) => sum + gate.weight, 0);
  const count = status => gates.filter(gate => gate.status === status).length;
  return {
    gates,
    total,
    accepted,
    percent: Math.round(100 * accepted / total),
    acceptedCount: count("accepted"),
    partialCount: count("partial"),
    plannedCount: count("planned")
  };
}

export function projectFromLive(project, json) {
  if (json?.schemaVersion !== 1 || typeof json.revision !== "string" || typeof json.asOf !== "string") {
    throw new Error("Invalid site-progress schema");
  }
  const roadmap = computeRoadmap(json.roadmap);
  const phase = json.progress || {};
  const complete = Number(phase.completed);
  const total = Number(phase.total);
  return {
    ...project,
    source: "live",
    revision: json.revision,
    asOf: json.asOf,
    percent: roadmap.percent,
    gates: roadmap.gates,
    acceptedCount: roadmap.acceptedCount,
    gateCount: roadmap.gates.length,
    roadmapLabel: json.roadmap.label || "Full development roadmap",
    roadmapScope: json.roadmap.scope || "",
    roadmapNote: json.roadmap.note || "",
    roadmapLink: roadmapUrl(project, json),
    phaseLabel: phase.label || "Current delivery phase",
    phaseCompleted: Number.isFinite(complete) && complete >= 0 ? complete : null,
    phaseTotal: Number.isFinite(total) && total > 0 ? total : null,
    phaseNote: phase.note || "",
    sourceError: ""
  };
}

export function projectFromSnapshot(project, error = "") {
  const snapshot = project.snapshot;
  if (!snapshot) throw new Error("No snapshot configured for " + project.id);
  return {
    ...project,
    source: "snapshot",
    revision: snapshot.revision,
    asOf: snapshot.asOf,
    percent: snapshot.roadmapPercent,
    gates: [],
    acceptedCount: null,
    gateCount: null,
    roadmapLabel: "Full development roadmap",
    roadmapScope: "",
    roadmapNote: "",
    roadmapLink: roadmapUrl(project, null),
    phaseLabel: snapshot.phase,
    phaseCompleted: snapshot.completed,
    phaseTotal: snapshot.total,
    phaseNote: "",
    sourceError: error
  };
}

export function getMilestones(gates) {
  return {
    inProgress: gates.filter(gate => gate.status === "partial"),
    planned: gates.filter(gate => gate.status === "planned"),
    accepted: gates.filter(gate => gate.status === "accepted")
  };
}

export function summary(rows) {
  const count = rows.length;
  return {
    projects: count,
    average: count ? Math.round(rows.reduce((sum, p) => sum + p.percent, 0) / count) : 0,
    live: rows.filter(p => p.source === "live").length,
    snapshot: rows.filter(p => p.source !== "live").length,
    accepted: rows.every(p => p.source === "live") ? rows.reduce((sum, p) => sum + p.acceptedCount, 0) : null
  };
}

export function filterAndSort(rows, query, category, sort) {
  const q = String(query || "").trim().toLowerCase();
  const filtered = rows.filter(p => {
    const matches = !q || [p.name, p.description, p.repo, p.phaseLabel, ...p.gates.map(g => g.label)]
      .some(text => String(text || "").toLowerCase().includes(q));
    return matches && (category === "all" || category === p.category);
  });
  filtered.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "revision") return a.revision.localeCompare(b.revision);
    if (sort === "oldest") return a.percent - b.percent || a.name.localeCompare(b.name);
    return b.percent - a.percent || a.name.localeCompare(b.name);
  });
  return filtered;
}
