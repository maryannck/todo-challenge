# Full-Stack To-Do List Challenge

A responsive full-stack task management application with stateless JWT authentication, full CRUD operations, and $O(1)$ fractional midpoint indexing for drag-and-drop reordering.

## 1. Summary of the Assignment
Built a full-stack To-Do application featuring:
- Web frontend client with interactive task list, search filtering, and task detail modal.
- RESTful Express API backend with relational schema persistence (Prisma + SQLite).
- End-to-end user isolation with password hashing and JWT sessions.
- $O(1)$ drag-and-drop reordering using fractional index midpoints.

## 2. Overall Approach & Architecture
- **Backend Architecture:** Node.js v24, Express, TypeScript, and Prisma ORM. Uses clean route segregation (`/api/auth`, `/api/tasks`), Zod schema validation, and stateless JWT authorization middleware.
- **Frontend Architecture:** React 19, Vite, Tailwind CSS v4, and TanStack Query. State synchronization relies on declarative query invalidation and optimistic caching.
- **Data Model:**
  - `User`: Handles identity credentials with salted `bcryptjs` password hashing.
  - `Task`: Implements `order` (Float) enabling order updates between adjacent tasks without cascading updates across the entire collection.
- **Testing:** Automated integration testing using Vitest and Supertest against an isolated SQLite test database.

## 3. Features Completed
- [x] Secure authentication (Register / Sign In) with JWT session persistence.
- [x] Full CRUD operations (Create task, Read with user isolation, Update completion/details, Delete).
- [x] Responsive layout using Tailwind CSS.
- [x] Real-time task search filtering across titles and descriptions.
- [x] Task detail modal to view and update multi-line descriptions.
- [x] Drag-and-drop task reordering with $O(1)$ fractional index recalculation.
- [x] Vitest & Supertest automated API test suite covering auth, data isolation, and reorder math.

## 4. Deployment & Running Instructions (macOS Local & Cloud)

### Prerequisites
- Node.js >= 20 (Tested on Node.js v24)
- npm >= 10

### Local Execution (macOS)
```bash
# 1. Clone repository
git clone <YOUR_REPO_URL>
cd todo-challenge

# 2. Install workspace dependencies
npm install

# 3. Initialize server environment & database
cd server
cp .env.example .env
npx prisma migrate dev --name init
cd ..

# 4. Start backend and frontend concurrently
npm run dev