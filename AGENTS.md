# Dashboard Agent Instructions

## Authoritative sources
This repository displays information from other projects. It must **not** become their source of truth. On each task, inspect current Dashboard main and relevant project main branches before making changes. The source project controls its own version, phase, roadmap, gate acceptance, acceptance evidence and document path via root site-progress.json.

## Invariants
- Never convert a phase-specific completion fraction into the whole-product percentage.
- Use accepted weighted roadmap gates divided by the sum of all documented weights for authoritative formal acceptance and the portfolio average; partial/planned receive zero formal acceptance points. A separately labeled, source-reproducible implementation estimate may be the ONE project-card headline where the user requests it and the source project's verified merged assignment ledger and audited partial evidence support it; never show the old accepted number as an unlabelled fallback.
- Do not calculate source acceptance or modeled implementation from commit age, count of tests, number of files, hours, or unsupported confidence judgments. Explicitly label the headline implementation figure as an estimate and never imply playable or released product readiness; don't confuse that figure with the independently accepted portfolio average.
- Do not silently downgrade or roll back a project revision or replace newer accepted data with a fallback snapshot.
- On manifest network/schema failure show a visibly dated fallback, not fabricated live data. On optional implementation-queue failure, withhold the estimate while retaining a valid live acceptance manifest.
- If an original project lacks the roadmap ledger, mark the whole-vision percentage unavailable or use an explicitly labeled prior source-verified snapshot.
- Roadmap gate ordering does not automatically define the next authorized programming milestone; label partial/planned gates accurately.
- Display public project documents only. Do not copy private source rulebooks, licensed scenarios, user secrets or copyrighted uploads to this public repository.
- Never alter a target project repository as part of ordinary Dashboard development. Pin mirrored estimators to source projects and fetch source queues only from their own trusted repository.
- Keep the site static and dependency-free unless an approved scope change calls for something else.
- New projects must be registered in data/projects.json; update fallback snapshots only after verifying a source. Future custom site hosts require a deliberate trustedUrl policy review.
- Update this file and README when changes affect data contracts, deployment or accepted rules.
- Run scripts/validate.mjs and tests/core.test.mjs on every feature milestone. Ensure GitHub Pages resolves module paths relative to /Dashboard/.
- Use review branches and pull requests; do not merge to main on behalf of the user when they intend to review.

## Scope
The dashboard is a portfolio viewer: live revision, source date, complete-roadmap percentage, independent current phase, open and future gates, linked development roadmaps, published sites and source repositories. Project-specific planning stays in each project's roadmap. The dashboard's own progress need not be a seventh entry unless requested.
