import {
  validRepo, trustedUrl, projectFromLive, projectFromSnapshot,
  getMilestones, summary, filterAndSort
} from "./core.mjs";

const els = {
  grid: document.querySelector("#project-grid"),
  search: document.querySelector("#search"),
  category: document.querySelector("#category"),
  sort: document.querySelector("#sort"),
  refresh: document.querySelector("#refresh"),
  notice: document.querySelector("#data-notice"),
  empty: document.querySelector("#empty-state"),
  count: document.querySelector("#project-count"),
  sync: document.querySelector("#sync-state"),
  checked: document.querySelector("#last-checked"),
  projects: document.querySelector("#metric-projects"),
  average: document.querySelector("#metric-average"),
  live: document.querySelector("#metric-live"),
  gates: document.querySelector("#metric-gates")
};

let registry = [];
let projects = [];
let busy = false;
let checkedAt = null;

function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}

function add(parent, ...children) {
  for (const child of children) if (child) parent.append(child);
  return parent;
}

function safeLink(label, href, className, accessibleLabel) {
  const a = node("a", className, label);
  if (trustedUrl(href)) {
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  } else {
    a.removeAttribute("href");
    a.title = "Link unavailable";
  }
  if (accessibleLabel) a.setAttribute("aria-label", accessibleLabel);
  return a;
}

function dateLabel(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Date not reported";
  return value;
}

function progressBar(value, label, small = false) {
  const wrap = node("div", "bar-track" + (small ? " bar-small" : ""));
  const fill = node("div", "bar-fill");
  fill.style.width = Math.max(0, Math.min(100, value)) + "%";
  wrap.setAttribute("role", "progressbar");
  wrap.setAttribute("aria-valuemin", "0");
  wrap.setAttribute("aria-valuemax", "100");
  wrap.setAttribute("aria-valuenow", String(value));
  wrap.setAttribute("aria-label", label);
  wrap.append(fill);
  return wrap;
}

function gateRow(gate) {
  const li = node("li", "gate-row gate-" + gate.status);
  const head = node("div", "gate-row-head");
  const name = node("span", "gate-label", gate.label);
  const indicator = node("span", "gate-status", gate.status === "accepted" ? "Accepted" : gate.status === "partial" ? "In progress" : "Planned");
  const weight = node("span", "gate-weight", gate.weight + " pts");
  add(head, name, indicator, weight);
  li.append(head);
  if (gate.acceptance || gate.evidence) {
    const info = node("div", "gate-detail");
    if (gate.acceptance) add(info, node("p", "", gate.acceptance));
    if (gate.evidence) add(info, node("small", "", "Evidence: " + gate.evidence));
    li.append(info);
  }
  return li;
}

function addMilestoneLines(target, title, gates, status, max) {
  const section = node("div", "milestone-column");
  const heading = node("div", "mini-kicker");
  add(heading, node("span", "mini-mark " + status), node("span", "", title));
  section.append(heading);
  const list = node("ul", "milestone-list");
  for (const gate of gates.slice(0, max)) {
    const li = node("li");
    add(li, node("span", "mini-bullet " + status), node("span", "", gate.label));
    list.append(li);
  }
  section.append(list);
  target.append(section);
}

function makeCard(project, index) {
  const card = node("article", "project-card " + (project.category === "Game" ? "card-game" : "card-reference"));
  card.id = "project-" + project.id;
  const header = node("div", "card-head");
  const identity = node("div", "card-identity");
  const icon = node("div", "project-avatar", project.category === "Game" ? "◆" : "✳");
  icon.setAttribute("aria-hidden", "true");
  const names = node("div", "project-heading");
  add(names, node("span", "category-label", project.category === "Game" ? "INTERACTIVE / RPG" : "EDITORIAL / REFERENCE"), node("h3", "", project.name));
  add(identity, icon, names);
  const revision = node("div", "revision-badge");
  add(revision, node("span", "badge-overline", "BUILD REVISION"), node("strong", "", project.revision));
  add(header, identity, revision);
  card.append(header);
  card.append(node("p", "card-description", project.description));

  const completion = node("section", "completion");
  completion.setAttribute("aria-label", "Full roadmap progress");
  const completionHeading = node("div", "completion-head");
  add(completionHeading,
    add(node("div"), node("span", "stat-label", "FULL ROADMAP COMPLETION"), node("span", "stat-subtitle", project.roadmapLabel)),
    node("div", "big-percent", project.percent + "%"));
  add(completion, completionHeading, progressBar(project.percent, project.name + ": " + project.percent + "% of the full approved roadmap"));
  completion.append(node("div", "progress-foot", project.source === "live"
    ? project.acceptedCount + " of " + project.gateCount + " acceptance gates complete · accepted weight only"
    : "Fallback completion estimate · live gate details unavailable"));
  card.append(completion);

  const phase = node("section", "checkpoint");
  phase.setAttribute("aria-label", "Current delivery checkpoint");
  const phaseLabel = node("div", "checkpoint-heading");
  add(phaseLabel, node("span", "section-icon", "⌁"), node("span", "", "CURRENT DELIVERY CHECKPOINT"));
  phase.append(phaseLabel);
  phase.append(node("div", "checkpoint-name", project.phaseLabel));
  if (project.phaseTotal !== null && project.phaseCompleted !== null) {
    const phaseFoot = node("div", "phase-foot");
    const fraction = Math.min(100, Math.round(100 * project.phaseCompleted / project.phaseTotal));
    add(phaseFoot, node("span", "", project.phaseCompleted + " / " + project.phaseTotal + " phase gates"), node("strong", "", fraction + "%"));
    phase.append(phaseFoot);
    phase.append(progressBar(fraction, project.name + ": " + project.phaseCompleted + " of " + project.phaseTotal + " current checkpoint tasks", true));
  } else {
    phase.append(node("div", "phase-foot", "No phase-specific progress provided"));
  }
  if (project.phaseNote) phase.append(node("p", "phase-note", project.phaseNote));
  card.append(phase);

  const milestones = getMilestones(project.gates);
  const tracker = node("div", "mini-tracker");
  if (project.gates.length) {
    if (milestones.inProgress.length) addMilestoneLines(tracker, "IN PROGRESS", milestones.inProgress, "ongoing", 2);
    if (milestones.planned.length) addMilestoneLines(tracker, "PLANNED ROADMAP GATES", milestones.planned, "future", 1);
    if (!milestones.inProgress.length && !milestones.planned.length) {
      tracker.append(node("p", "all-complete", "All currently scoped roadmap gates have been accepted."));
    }
  } else {
    tracker.append(node("p", "all-complete", "Live milestone details temporarily unavailable. Open the source roadmap below."));
  }
  card.append(tracker);

  const actions = node("div", "card-actions");
  add(actions,
    safeLink("Open project ↗", project.site, "action-primary", "Open " + project.name + " live website"),
    safeLink("Development roadmap ↗", project.roadmapLink, "action-secondary", "Open " + project.name + " roadmap"),
    safeLink("Repository ↗", "https://github.com/" + project.repo, "action-tertiary", "Open " + project.name + " source repository"));
  card.append(actions);

  if (project.gates.length) {
    const detail = node("details", "roadmap-details");
    const summaryLine = node("summary");
    add(summaryLine, node("span", "", "Browse all " + project.gateCount + " roadmap gates"), node("span", "disclosure-arrow", "⌄"));
    detail.append(summaryLine);
    const info = node("div", "roadmap-inside");
    if (project.roadmapScope) info.append(node("p", "roadmap-scope", project.roadmapScope));
    if (project.roadmapNote) info.append(node("p", "roadmap-caveat", project.roadmapNote));
    const list = node("ol", "gate-list");
    project.gates.forEach(gate => list.append(gateRow(gate)));
    info.append(list);
    detail.append(info);
    card.append(detail);
  }

  const footer = node("div", "card-footer");
  const source = node("span", "source-status " + (project.source === "live" ? "source-live" : "source-snapshot"));
  add(source, node("span", "source-dot"), node("span", "", project.source === "live" ? "LIVE MANIFEST" : "DATED SNAPSHOT"));
  add(footer, source, node("span", "as-of", "SOURCE DATE  " + dateLabel(project.asOf)));
  card.append(footer);
  return card;
}

function render() {
  if (!projects.length) return;
  const stats = summary(projects);
  els.projects.textContent = String(stats.projects);
  els.average.textContent = stats.average + "%";
  els.live.textContent = stats.live + "/" + stats.projects;
  els.gates.textContent = stats.accepted === null ? "—" : String(stats.accepted);

  const filtered = filterAndSort(projects, els.search.value, els.category.value, els.sort.value);
  els.count.textContent = "(" + filtered.length + ")";
  const fragment = document.createDocumentFragment();
  filtered.forEach((project, i) => fragment.append(makeCard(project, i)));
  els.grid.replaceChildren(fragment);
  els.grid.setAttribute("aria-busy", busy ? "true" : "false");
  els.empty.hidden = filtered.length !== 0;

  els.notice.hidden = stats.snapshot === 0;
  if (stats.snapshot > 0) {
    els.notice.textContent = stats.snapshot + " project" + (stats.snapshot === 1 ? " is" : "s are") +
      " using dated fallback snapshots because the live manifest is unavailable. Each card shows its source date; retry with Refresh.";
  }
  els.sync.textContent = busy ? "Checking " + stats.projects + " source manifests…" :
    (stats.snapshot ? stats.live + " of " + stats.projects + " live · " + stats.snapshot + " snapshot fallback" : "All " + stats.projects + " manifests are live");
  els.checked.textContent = checkedAt ? "Checked " + checkedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Checking sources";
}

async function fetchManifest(project) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 11000);
  try {
    const url = "https://raw.githubusercontent.com/" + project.repo + "/main/site-progress.json";
    const response = await fetch(url, { mode: "cors", cache: "no-store", signal: ctrl.signal });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const json = await response.json();
    return projectFromLive(project, json);
  } finally {
    clearTimeout(timer);
  }
}

async function refresh() {
  if (busy || !registry.length) return;
  busy = true;
  els.refresh.disabled = true;
  els.refresh.classList.add("refreshing");
  render();
  await Promise.all(registry.map(async (project, i) => {
    let result;
    try {
      result = await fetchManifest(project);
    } catch (error) {
      result = projectFromSnapshot(project, String(error?.message || error));
    }
    projects[i] = result;
    render();
  }));
  busy = false;
  checkedAt = new Date();
  els.refresh.disabled = false;
  els.refresh.classList.remove("refreshing");
  render();
}

async function init() {
  try {
    const response = await fetch("./data/projects.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Cannot load project registry (HTTP " + response.status + ")");
    const data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.projects) || !data.projects.length) throw new Error("Invalid project registry");
    if (new Set(data.projects.map(p => p.id)).size !== data.projects.length) throw new Error("Duplicate project identifiers");
    registry = data.projects.filter(p => validRepo(p.repo) && trustedUrl(p.site) && p.snapshot);
    if (registry.length !== data.projects.length) throw new Error("Invalid project URL or missing fallback snapshot");
    projects = registry.map(p => projectFromSnapshot(p, "Initial fallback"));
    render();
    await refresh();
  } catch (error) {
    els.grid.replaceChildren(node("p", "load-error", "Dashboard configuration could not load: " + String(error.message || error)));
    els.grid.setAttribute("aria-busy", "false");
    els.sync.textContent = "Dashboard configuration error";
    els.notice.hidden = false;
    els.notice.textContent = "Check data/projects.json and reload the page.";
  }
}

for (const control of [els.search, els.category, els.sort]) {
  control.addEventListener(control === els.search ? "input" : "change", render);
}
els.refresh.addEventListener("click", refresh);
document.addEventListener("keydown", event => {
  if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
  event.preventDefault();
  els.search.focus();
});
setInterval(() => {
  if (!document.hidden && !busy) refresh();
}, 15 * 60 * 1000);
init();
