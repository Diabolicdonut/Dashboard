# Dashboard Agent Instructions

## Authoritative sources
This repository displays information from other projects. It must **not** become their source of truth. On each task, inspect current Dashboard main and relevant project main branches before making changes. The source project controls its own version, phase, roadmap, gate acceptance, acceptance evidence and document path via root site-progress.json.

## Invariants
- Never convert a phase-specific completion fraction into the whole-product percentage.
- Use accepted weighted roadmap gates divided by the sum of all documented weights; partial/planned receive zero points.
- Do not set project progress based on commit age, count of tests, number of files, effort estimates or subjective confidence.
- Do not silently downgrade or roll back a project revision or replace newer accepted data with a fallback snapshot.
- On network/schema failure show a visibly dated fallback, not fabricated live data.
- If an original project lacks the roadmap ledger, mark the whole-vision percentage unavailable or use an explicitly labeled prior source-verified snapshot.
- Roadmap gate ordering does not automatically define the next authorized programming milestone; label partial/planned gates accurately.
- Display public project documents only. Do not copy private source rulebooks, licensed scenarios, user secrets or copyrighted uploads to this public repository.
- Never alter a target project repository as part of ordinary Dashboard development.
- Keep the site static and dependency-free unless an approved scope change calls for something else.
- New projects must be registered in data/projects.json; update fallback snapshots only after verifying a source. Future custom site hosts require a deliberate trustedUrl policy review.
- Update this file and README when changes affect data contracts, deployment or accepted rules.
- Run scripts/validate.mjs and tests/core.test.mjs on every feature milestone. Ensure GitHub Pages resolves module paths relative to /Dashboard/.
- Use review branches and pull requests; do not merge to main on behalf of the user when they intend to review.

## Scope
The dashboard is a portfolio viewer: live revision, source date, complete-roadmap percentage, independent current phase, open and future gates, linked development roadmaps, published sites and source repositories. Project-specific planning stays in each project's roadmap. The dashboard's own progress need not be a seventh entry unless requested.
