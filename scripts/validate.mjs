import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
import { validRepo, trustedUrl } from "../src/core.mjs";

const config = JSON.parse(readFileSync(new URL("../data/projects.json", import.meta.url), "utf8"));
assert.equal(config.schemaVersion, 1, "Unsupported registry schema");
assert.ok(Array.isArray(config.projects) && config.projects.length > 0, "At least one project required");

const seen = new Set();
for (const item of config.projects) {
  assert.match(item.id, /^[a-z0-9-]+$/, "Project ID must be URL-safe");
  assert.ok(!seen.has(item.id), "Duplicate project: " + item.id);
  seen.add(item.id);
  assert.ok(item.name && item.description, "Missing project name or description");
  assert.ok(validRepo(item.repo), "Invalid GitHub owner/name: " + item.repo);
  assert.ok(trustedUrl(item.site), "Unsupported project website: " + item.site);
  assert.ok(["Game", "Reference"].includes(item.category), "Unknown category: " + item.category);
  const s = item.snapshot;
  assert.ok(s && typeof s.revision === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.asOf), "Invalid snapshot for " + item.id);
  assert.ok(Number.isFinite(s.roadmapPercent) && s.roadmapPercent >= 0 && s.roadmapPercent <= 100);
  assert.ok(Number.isInteger(s.completed) && Number.isInteger(s.total) && s.total > 0 && s.completed >= 0 && s.completed <= s.total);
  assert.ok(typeof s.roadmapDocument === "string" && !s.roadmapDocument.includes("..") && !s.roadmapDocument.startsWith("/"));
}

for (const path of ["index.html", "styles.css", "src/app.mjs", "src/core.mjs", "favicon.svg", ".nojekyll"]) {
  assert.ok(existsSync(new URL("../" + path, import.meta.url)), "Missing site file: " + path);
}

console.log("Registry validated: " + config.projects.length + " projects, unique IDs, sources and snapshots.");
