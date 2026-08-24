# Current Application Working Guide

This document explains, in simple terms, how the current Assetly application works and how the frontend, backend, database, Supabase or Neon, and Vercel are connected.

## Short Summary

Assetly is currently built as:

- Frontend: React + Vite app inside `apps/web`
- Backend: API route files inside `api`
- Database: PostgreSQL, hosted on either Neon or Supabase
- Deployment: Vercel serves the frontend and runs the backend API routes

The important idea is:

```text
Browser
  -> React frontend
  -> /api backend routes
  -> PostgreSQL database
```

The frontend never connects directly to the database. It calls backend API routes, and only the backend uses the database connection string.

## Main Folders

```text
asset/
  apps/web/                 React frontend app
  api/                      Backend API routes
  api/_lib/                 Shared backend helpers
  database/supabase/        SQL schema and seed files
  scripts/                  Local development scripts
  docs/                     Project documentation
  vercel.json               Vercel deployment configuration
```

## Frontend: How The React App Works

The frontend lives in:

```text
apps/web
```

It is a Vite React application. When you open the app in the browser, Vite or Vercel serves the React single-page application.

The frontend has screens such as:

- Login
- Dashboard
- Assets
- Employees
- Departments
- Vendors
- Requests
- Settings

The frontend stores page data in Redux slices:

```text
apps/web/src/store/
```

For example:

- `assetsSlice.ts` stores asset data in the browser state
- `employeesSlice.ts` stores employee data
- `departmentsSlice.ts` stores departments
- `vendorsSlice.ts` stores vendors
- `authSlice.ts` stores logged-in user information

## Two Data Modes: Demo Mode And API Mode

The app can run in two different modes.

### 1. Demo Mode

If this value is missing or not set to `true`:

```text
VITE_USE_API=true
```

then the app behaves mostly like a frontend demo. Data is kept in browser memory through Redux. Some demo data comes from:

```text
apps/web/src/data/demoData.ts
```

In this mode, changes may not persist permanently after refresh or restart because the app is not relying fully on the backend database.

### 2. API Mode

If this is set:

```text
VITE_USE_API=true
```

then the frontend uses backend APIs and the database.

The file that controls this is:

```text
apps/web/src/services/api/config.ts
```

Current logic:

```text
VITE_USE_API=true      -> use backend/database
VITE_USE_API missing   -> use local demo behavior
```

The frontend API base URL is:

```text
VITE_API_URL
```

If `VITE_API_URL` is empty, the app calls the same domain:

```text
/api/...
```

This is useful on Vercel because frontend and backend are served from the same deployment.

## Frontend To Backend Connection

The frontend talks to the backend using `fetch`.

The shared frontend API fetch helper is:

```text
apps/web/src/services/api/client.ts
```

That file builds requests like this:

```text
fetch("/api/assets")
fetch("/api/sync")
fetch("/api/auth/login")
```

If the user is logged in, it also sends the JWT token:

```text
Authorization: Bearer <token>
```

The token is stored in browser session storage:

```text
sessionStorage["assetly_token"]
```

That means the frontend remembers the token only for the browser session.

## Backend: How The API Works

The backend lives in:

```text
api/
```

This project uses Vercel-style API routes. Each file in `api` becomes an HTTP endpoint.

Examples:

```text
api/health.ts             -> /api/health
api/sync.ts               -> /api/sync
api/auth/login.ts         -> /api/auth/login
api/assets/index.ts       -> /api/assets
api/assets/[id].ts        -> /api/assets/:id
api/assets/import.ts      -> /api/assets/import
```

Each API route receives a request, does backend work, and returns JSON.

Example flow:

```text
Browser clicks "Assets"
  -> frontend calls GET /api/sync or GET /api/assets
  -> backend reads from PostgreSQL
  -> backend returns JSON
  -> frontend puts JSON into Redux
  -> page updates
```

## Backend To Database Connection

The backend database helper is:

```text
api/_lib/db.ts
```

It uses:

```text
@neondatabase/serverless
```

The important code idea is:

```text
DATABASE_URL -> neon(DATABASE_URL) -> SQL queries
```

So the backend connects to PostgreSQL using this environment variable:

```text
DATABASE_URL
```

This value must be in the server/backend environment, not in frontend code.

## What Is Neon Doing?

Neon is a hosted serverless PostgreSQL database.

If you use Neon, the flow is:

```text
Vercel API route
  -> DATABASE_URL
  -> Neon PostgreSQL
```

In this repo, Neon is a good fit because the backend uses the Neon serverless driver:

```text
@neondatabase/serverless
```

Even though the package name says Neon, the app is still writing normal SQL to a PostgreSQL database.

## What Is Supabase Doing?

Supabase also provides PostgreSQL.

In the current application, Supabase is mainly used as a PostgreSQL-compatible database option. The app is not currently using the Supabase JavaScript client for normal frontend data access.

That means the current app is not doing this:

```text
Frontend -> Supabase client -> Supabase tables
```

Instead, it does this:

```text
Frontend
  -> backend /api routes
  -> DATABASE_URL
  -> Supabase Postgres
```

So Supabase can be used as the database host, but the frontend still talks only to the backend API.

The SQL files are stored under:

```text
database/supabase/
```

Important files:

```text
001_assetly_schema.sql       Creates tables
002_assetly_seed.sql         Adds demo tenant, departments, vendors
003_user_passwords.sql       Adds password table if used
004_asset_requests.sql       Adds request-related tables/features
```

## Neon vs Supabase In This Project

Use either Neon or Supabase as the PostgreSQL database.

The app does not need both at the same time.

```text
Option A:
Frontend -> Vercel API -> Neon Postgres

Option B:
Frontend -> Vercel API -> Supabase Postgres
```

Both options work because the backend only needs a PostgreSQL connection string in `DATABASE_URL`.

## What Is Vercel Doing?

Vercel does two jobs in this project.

### 1. Serves The Frontend

Vercel builds the frontend from:

```text
apps/web
```

The final build output is:

```text
apps/web/dist
```

This is configured in:

```text
vercel.json
```

Important config:

```json
{
  "buildCommand": "npm run build --prefix apps/web",
  "outputDirectory": "apps/web/dist",
  "framework": "vite"
}
```

### 2. Runs The Backend API Routes

Vercel also detects files inside:

```text
api/
```

and exposes them as:

```text
/api/...
```

So after deployment:

```text
https://your-app.vercel.app/api/health
https://your-app.vercel.app/api/sync
https://your-app.vercel.app/api/assets
```

The frontend and backend are on the same domain in production.

## Local Development Flow

Locally, there are two servers:

```text
Frontend: http://localhost:5173
Backend:  http://127.0.0.1:3000
```

The Vite config is:

```text
apps/web/vite.config.ts
```

It proxies frontend API calls to the backend:

```text
/api -> http://127.0.0.1:3000
```

So when the browser is on:

```text
http://localhost:5173
```

and the frontend calls:

```text
/api/health
```

Vite forwards it to:

```text
http://127.0.0.1:3000/api/health
```

The recommended local command is:

```powershell
npm run dev:stack
```

or:

```powershell
npm run dev
```

When `apps/web/.env` has `VITE_USE_API=true`, the startup script also checks that the backend API is running.

## Environment Variables

There are two types of environment variables.

### Frontend Environment Variables

These live in:

```text
apps/web/.env
```

Example:

```text
VITE_USE_API=true
VITE_API_URL=
```

Frontend variables must start with `VITE_` because Vite only exposes variables with that prefix to browser code.

Do not put database passwords or private secrets in frontend env variables.

### Backend Environment Variables

These live in the root `.env` locally, and in Vercel project environment variables in production.

Example:

```text
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

Backend variables are used only by API routes.

The most important one is:

```text
DATABASE_URL
```

Without it, `/api/health` returns a database connection error.

## Login Flow

The current login endpoint is:

```text
POST /api/auth/login
```

The route file is:

```text
api/auth/login.ts
```

Current login flow:

```text
User enters email/password
  -> frontend calls POST /api/auth/login
  -> backend checks demo user credentials
  -> backend creates JWT token
  -> frontend stores token in sessionStorage
  -> future API calls include Authorization header
```

Demo users are currently defined in:

```text
api/_lib/demo-users.ts
```

Password verification is handled in:

```text
api/_lib/auth.ts
```

## Data Loading Flow

After login, the frontend can load all main data from:

```text
GET /api/sync
```

The route file is:

```text
api/sync.ts
```

This route reads from tables like:

```text
assets
employees
departments
vendors
asset_assignments
ownership_history
audit_logs
```

Then it returns everything to the frontend as JSON.

## Asset Create Flow

When an asset is created:

```text
Frontend form
  -> POST /api/assets
  -> api/assets/index.ts
  -> INSERT INTO assets
  -> JSON response
  -> frontend updates Redux state
```

If an asset is assigned to an employee, the backend can also insert rows into:

```text
asset_assignments
ownership_history
```

## Asset Update And Delete Flow

For one asset:

```text
PATCH /api/assets/:id      Updates asset
DELETE /api/assets/:id     Deletes asset
GET /api/assets/:id        Reads asset
```

The route file is:

```text
api/assets/[id].ts
```

Important note: in the current app, `GET /api/assets/:id` is public because it supports QR lookup. This should be reviewed before production because it may expose full asset details.

## Excel Import Flow

Excel import uses:

```text
POST /api/assets/import
```

The route file is:

```text
api/assets/import.ts
```

Current behavior:

```text
Import starts
  -> backend deletes existing demo tenant asset data
  -> backend imports employees from the file
  -> backend imports assets from the file
  -> backend returns imported assets
```

This is useful for a demo reset/import workflow, but it is risky for production because it replaces existing inventory.

## Database Tables

The main schema file is:

```text
database/supabase/001_assetly_schema.sql
```

Main tables:

```text
tenants
departments
vendors
employees
assets
asset_assignments
ownership_history
audit_logs
```

The demo tenant ID used by the backend is:

```text
11111111-1111-1111-1111-111111111111
```

This is defined in:

```text
api/_lib/db.ts
```

Most queries currently filter using this tenant ID.

## Health Check

The backend health endpoint is:

```text
GET /api/health
```

The route file is:

```text
api/health.ts
```

It runs a simple database query:

```sql
SELECT 1 AS ok
```

If the database is connected, expected response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

If `DATABASE_URL` is missing or wrong, it returns a disconnected response.

## Complete Production Request Flow

When deployed to Vercel, the complete flow looks like this:

```text
User opens https://your-app.vercel.app
  -> Vercel serves React app from apps/web/dist
  -> React app calls /api/auth/login
  -> Vercel runs api/auth/login.ts
  -> backend checks user and signs JWT
  -> React app stores JWT
  -> React app calls /api/sync with JWT
  -> Vercel runs api/sync.ts
  -> api/sync.ts connects to Postgres using DATABASE_URL
  -> database returns rows
  -> backend maps database rows to frontend shape
  -> React renders assets, employees, vendors, etc.
```

## Complete Local Request Flow

When running locally:

```text
User opens http://localhost:5173
  -> Vite serves React app
  -> React app calls /api/health
  -> Vite proxy forwards to http://127.0.0.1:3000/api/health
  -> local API server runs api/health.ts
  -> API connects to Postgres using root .env DATABASE_URL
  -> response goes back through Vite proxy
  -> frontend receives JSON
```

## Common Confusions

### Is Supabase the backend?

Not exactly in this current app.

Supabase can host the PostgreSQL database, but the application backend is the `api/` folder running on Vercel or locally.

### Is Neon the backend?

No. Neon is the PostgreSQL database host. The backend is still the API code in `api/`.

### Is Vercel the database?

No. Vercel hosts the frontend and runs backend API routes. The database is Neon or Supabase PostgreSQL.

### Does the frontend connect directly to Supabase or Neon?

No. The frontend calls `/api`. The `/api` backend connects to the database.

### Which database should I use?

Use one PostgreSQL database:

- Neon if you want a simple serverless Postgres setup with Vercel
- Supabase if you want Postgres plus optional Supabase features like Auth or Storage later

The current backend works with either as long as `DATABASE_URL` is correct.

## Important Current Limitations

This app is currently closer to an MVP/demo than a production-secure system.

Known important limitations:

- API role permissions need to be tightened
- Demo credentials are still in source code
- `JWT_SECRET` should be required in production
- Excel import is destructive
- Public asset lookup should return fewer fields
- CI and API typechecking need cleanup

## Mental Model To Remember

Use this simple model:

```text
React is the screen.
Redux is the browser-side state.
API routes are the backend.
DATABASE_URL points backend to Postgres.
Neon or Supabase stores the data.
Vercel hosts React and runs API routes.
```

That is the current working structure of this application.
