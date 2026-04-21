# Full-Stack Scheduling Dashboard

Modern full-stack scheduling app with 4 synced tabs:

1. Shift Scheduling
2. Associates List
3. Pooling
4. Backup Associates

## Features
- Shared state across all tabs
- Rule-safe assignments (availability + shift constraints)
- Vacation handling and invalid-assignment prevention
- Backup shown beneath main assignment in scheduling cards
- API + database layer with Supabase-ready repository
- Fallback memory/disk mode when Supabase credentials are not yet configured

## Stack
- Frontend: Vanilla JS + modern CSS dashboard UI
- Backend: Node.js + Express API
- Validation: Zod + shared rule engine
- DB/Auth: Supabase (optional in local dev until credentials are provided)

## Project Structure
- `frontend/` UI (tabs, state sync, render)
- `backend/server.js` server entry
- `backend/routes/api.js` API endpoints + validation
- `backend/lib/rules.js` scheduling rules
- `backend/lib/repository.js` Supabase or memory repository
- `shared/schema.js` shared enums/schemas
- `supabase/001_init.sql` database schema + RLS

## Environment
Copy `.env.example` to `.env` and set values.

Required for Supabase mode:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `SUPABASE_ANON_KEY`
- `REQUIRE_AUTH`

## Run
```bash
npm install
npm run dev
```
Open: `http://localhost:3000`

## Tests
```bash
npm test
npm run smoke
```

## API
- `GET /api/health`
- `GET /api/state`
- `PUT /api/state`

## Supabase Setup
1. Create a Supabase project.
2. Run SQL from `supabase/001_init.sql` in SQL editor.
3. Add `.env` keys.
4. Restart server.

## Deployment
### Option A: Render (Web Service)
- Build command: `npm install`
- Start command: `npm start`
- Add environment variables from `.env.example`

### Option B: Railway / Fly / other Node host
- Same runtime requirements.

### Option C: Vercel
- Use Node server deployment mode.

## Rollback and Recovery
If runtime errors occur:
1. Stop deployment.
2. Revert to last known good commit/tag.
3. Re-run tests: `npm test && npm run smoke`.
4. Fix root cause only and redeploy.
