# Todo Challenge Monorepo Architecture

## Architecture
- Backend: Node.js v24, Express, TypeScript (`tsx`), Prisma ORM, SQLite (`dev.db`). Port 5001.
- Frontend: Vite, React 19, TypeScript, Tailwind CSS v4, TanStack Query. Port 3000 (proxies `/api` -> `http://127.0.0.1:5001`).
- Auth: Stateless JWT via `localStorage`, Axios interceptors, bcrypt password hashing.
- Reordering: O(1) fractional indexing on `Task.order` (Float) using midpoint interpolation.

## Current State
- API routes live at `/api/auth` (register, login) and `/api/tasks` (CRUD, `/reorder`).
- `client/` communicates with the backend via TanStack Query mutations.