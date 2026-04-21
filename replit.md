# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Full-stack scheduling dashboard — manages associates, shift assignments, pooling rules, and backup coverage for operations managers.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: In-memory with disk persistence (backend_data/state.json)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Artifacts

- `artifacts/scheduling-dashboard` — React frontend (previewPath: `/`)
- `artifacts/api-server` — Express API server (previewPath: `/api`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## API Routes

- `GET /api/state` — get full scheduling state (associates, pooling, assignments, backups)
- `PUT /api/state` — persist full state
- `POST /api/schedule/auto-assign` — auto-assign a month `{ month: "YYYY-MM", overwrite: boolean }`
- `GET /api/summary?month=YYYY-MM` — get per-associate stats for a month
- `GET /api/healthz` — health check

## Source

Ported from: https://github.com/ronaldbadua/fullstack-scheduling-dashboard
