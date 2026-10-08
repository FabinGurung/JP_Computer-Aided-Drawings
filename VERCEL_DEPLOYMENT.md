# Project Drawings Hub — Vercel handoff

Candidate source branch: `project-hub-v0.2`
Direct parent: `narayani-vite-ts-vercel-v0.4` @ `9771d9d1061eab6ef3a9590a1fe0aa2a7359ae60`

Framework: Vite + TypeScript
Build command: `npm run build`
Output directory: `dist`

## Routing

- `/` — project registry
- `/projects/narayani-parajuli/` — Narayani project subpage; existing V02→M80 viewer assets remain under `/stages/`
- `/projects/ramachandra-devkota/` — Ramachandra Devkota project subpage

## Safety / promotion gate

Do not claim production deployment from the Git commit alone. Promotion requires successful build/typecheck, public-safety readback, A9 Local/Main registration, deployment-provider readback and a verified public URL.

Narayani M80 remains `CODAL_NOT_VERIFIED / HOLD / DEFERRED`. Ramachandra Devkota remains `PLANNED`; its estimate is internal/preliminary.
