# Project Command Center

Responsive, dependency-free GitHub Pages dashboard for build revisions, milestone status and **whole-roadmap progress** across independent projects.

**Site after merge + Pages setup:** https://diabolicdonut.github.io/Dashboard/

## Tracked projects

| Project | Repository |
| --- | --- |
| Dinosaur Horror RPG | [Dinosaur-Horror-RPG](https://github.com/Diabolicdonut/Dinosaur-Horror-RPG) |
| Known World | [BECMI-Mystara](https://github.com/Diabolicdonut/BECMI-Mystara) |
| B/X RPG | [BX-RPG](https://github.com/Diabolicdonut/BX-RPG) |
| Lovecraft RPG | [Lovecraft-RPG](https://github.com/Diabolicdonut/Lovecraft-RPG) |
| Whiskey Project | [Whiskey-Project](https://github.com/Diabolicdonut/Whiskey-Project) |
| Compulsive Research | [Compulsive-Research](https://github.com/Diabolicdonut/Compulsive-Research) |

## How it stays current

On loading the page, on manual refresh, and every 15 minutes while the tab is visible, the browser fetches the public **site-progress.json** on the **main** branch of each configured GitHub repository. The projects are authoritative. The dashboard never edits them, reads private files, or infers progress from source commits.

**Whole-roadmap completion** is 100 × (sum of weights of accepted gates) / (sum of all defined gate weights). Partial and planned gates receive no credit until accepted. The entire finite product scope is the denominator, not the sprint, checkpoint, test count or perceived engineering effort. This is not a prediction of work remaining in hours.

**Current delivery checkpoint** (a separate completed/total count) appears beneath the main bar; it is not substituted for whole-project progress.

Each card includes published revision, source date, full-roadmap percent, checkpoint and phase count, current partial gates, planned gates, expandable full gate ledger with supporting evidence and acceptance descriptions, and direct links to the live site, repository and development roadmap.

Search, category filtering and sorting are local. The portfolio average weights each project equally. It is not a combined roadmap.

When a source cannot be read or fails schema validation, the dashboard displays a clearly marked **DATED SNAPSHOT** from data/projects.json. It never calls a fallback live. Snapshot dates are visible and must be maintained with source verification.

## Publishing the site

1. Merge the dashboard feature pull request into **main** once reviewed.
2. In GitHub open Dashboard → **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source.
3. The **Publish project dashboard** workflow will deploy the static page on a push to main. If Pages was configured afterward, open **Actions**, select this workflow and click **Run workflow**.
4. After the deployment succeeds, open https://diabolicdonut.github.io/Dashboard/ .

No API key, database, npm install or hosted backend is required. GitHub Actions runs validation and tests before publishing. Pull requests get independent CI validation and do not publish automatically.

## Adding future projects

Add one entry to the projects array in [data/projects.json](data/projects.json); no UI modifications are required. Include:

- unique lowercase slug ID, display name, description and category (Game or Reference);
- public GitHub repository under Diabolicdonut and HTTPS GitHub Pages website;
- verified fallback snapshot: revision, last-verified YYYY-MM-DD date, whole-roadmap percentage, phase label, completed/total counts and relative roadmap path.

For live automatic updates, keep a root site-progress.json file in the project repository main branch with schemaVersion 1, asOf date, revision, a progress object with label/completed/total, and a roadmap object with document/label/scope/note and gates. Each gate requires id, label, positive numerical weight and status (accepted, partial or planned). Acceptance and evidence details are supported. Optional roadmap.documentUrl allows an absolute GitHub file URL. The dashboard reads the actual accepted gate weights and does not trust an arbitrary preset overall percent.

A useful example of the required schema:

~~~json
{
  "schemaVersion": 1,
  "revision": "v1.0",
  "asOf": "2026-10-27",
  "progress": { "label": "Current delivery phase", "completed": 1, "total": 3 },
  "roadmap": {
    "label": "Whole approved product vision",
    "document": "DEVELOPMENT-ROADMAP.md",
    "gates": [
      { "id": "foundation", "label": "Validated foundation", "weight": 20, "status": "accepted" },
      { "id": "remaining", "label": "Remaining bounded scope", "weight": 80, "status": "planned" }
    ]
  }
}
~~~

Always revise the authoritative project roadmap, acceptance ledger and audit together. An expanded vision legitimately changes the denominator; do not misrepresent an old narrower percentage as a comparable measurement.

## Development

Run checks with Node.js 22 or later:

~~~bash
node scripts/validate.mjs
node --test tests/*.test.mjs
node --check src/app.mjs
~~~

For local preview start a static server from the repository root (for example, **python -m http.server 8000**) and visit http://localhost:8000 . Browsers block module and fetch requests from local file:// documents.

The dashboard consists of index.html, styles.css, src/core.mjs, src/app.mjs and data/projects.json. AGENTS.md defines future update discipline. GitHub Pages is configured through .github/workflows/pages.yml.

### Important limits

Revision labels identify the revision published by each project manifest, **not a separately confirmed live deployed Git SHA**. Acceptance-gate labels marked partial describe open work; planned-gate ordering is not necessarily the next authorized implementation sequence. Public raw GitHub data can be temporarily delayed by caching or network errors, which is why source dates and snapshot indicators are visible. Only GitHub / this account's GitHub Pages URLs are allowed in the current registry; extend URL validation deliberately for future external hosts.

The dashboard must not contain private credentials, copyrighted uploaded commercial game books, private scenario assets or sensitive source materials.
