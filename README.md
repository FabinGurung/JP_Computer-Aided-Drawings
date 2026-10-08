# Project Drawings — Governed Multi-Project AEC Hub

This branch is the multi-project successor to the Narayani-only Vite/TypeScript development candidate.

## Portal pattern

The repository now follows the same high-level pattern as the MSc Structural Engineering study portal:

```text
root project registry
└── projects/
    ├── narayani-parajuli/
    └── ramachandra-devkota/
```

Each project owns its own subpage and can grow independent modules without turning the repository root into one project’s website.

## Preserved Narayani lineage

This branch is a direct child of:

- `narayani-vite-ts-vercel-v0.4`
- commit `9771d9d1061eab6ef3a9590a1fe0aa2a7359ae60`
- tree `80a43b2078c89825ae36641be057d2f9a9483e99`

The proven Narayani V02, V03 and M40–M80 viewer files under `public/stages/` remain in place. The shared hub adds a project-level route in front of them instead of deleting, flattening or recreating those modules.

## Current project routes

- `/projects/narayani-parajuli/` — Narayani Parajuli Residence / PRJ-000007
- `/projects/ramachandra-devkota/` — 14 One Storey House — Ramachandra Devkota / PRJ-000029 / REB-002

The public-safe registry lives at `public/data/projects.json`.

## Authority and safety

- A9-governed Google Drive remains the engineering and project-data authority.
- GitHub is the code/publication/version-history layer.
- Website rendering does not create engineering approval, construction approval, project commencement, or contract-value authority.
- Private Drive identifiers/URLs, internal checkpoint/register links, and unapproved contact details must not be exposed in public website payloads.
- Approved Google Docs/Sheets may later be linked from a project module only after their public/stakeholder access classification explicitly permits it.
- Narayani M80 remains `CODAL_NOT_VERIFIED / HOLD / DEFERRED`.
- Ramachandra Devkota remains `PLANNED`; its current estimate remains internal/preliminary.

## Publication ledger rule

Every governed web publication should be represented in A9 and GitHub with at least:

- source project/event/release lineage
- candidate branch
- parent/base commit
- commit SHA
- tree SHA
- pull request
- public-safety/readback state
- tag and GitHub Release when created
- deployment provider + deployment URL/state
- rollback commit/tag

Recommended A9 typed relations include `PUBLISHED_AS`, `COMMIT_FOR`, `PR_FOR`, `TAG_FOR`, `RELEASE_FOR`, `DEPLOYS`, `SUPERSEDES` and `ROLLBACK_TO`.

## Build

Framework: Vite + TypeScript

```bash
npm run typecheck
npm run build
```

Output: `dist/`

## Candidate status

Branch: `project-hub-v0.2`

This branch is a candidate until source-level QA, provider readback, A9 Local/Main registration and deployment verification are complete. Do not infer a public/live deployment merely from the branch or commit existing.
