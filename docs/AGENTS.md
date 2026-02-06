# ResQMeals (M7 Platform) - AI Agent Context

> This document provides complete context for AI coding assistants to help team members work on this project systematically.

## Project Overview

**ResQMeals** is a food redistribution platform (M7 Project) that connects surplus food donors with NGOs and shelters.

**Repositories:**
- **ResQMeals** (this repo): Backend API
- **RMFrontend** (separate repo): Frontend application

## Tech Stack

### Backend (ResQMeals/backend)
- Node.js + Express.js
- MongoDB (Mongoose ODM)
- JWT + Bcrypt (Authentication)
- Socket.io (Real-time)
- TypeScript

### Frontend (RMFrontend)
- React 19 + Vite
- Tailwind CSS v4 + shadcn/ui
- React Router v7
- Axios (API calls)

## Current State

**Phase 0 (Base Setup) is COMPLETE:**
- Folder structure created
- ESLint + Prettier configured
- GitHub Actions CI pipeline
- `.env.example` files ready

**Next: Phase 1-8 (Sprint 1 Features)**

---

## Team Assignments

| Member | Role | Branch | Tasks |
|--------|------|--------|-------|
| Deepak | DevOps | `feature/ngo`, `feature/realtime` | NGO Backend, Socket.io |
| Member 2 | Backend Dev | `feature/auth` | User Model, Auth APIs, Login/Register UI |
| Member 3 | Full Stack | `feature/donor` | FoodDonation Model, CRUD, Forms |
| Member 4 | Full Stack | `feature/volunteer` | PickupTask Model, Task UI |
| Member 5 | Full Stack | `feature/admin`, `feature/matching` | Admin APIs, Matching Engine |

---

## Git Workflow

1. **Pull latest `dev`**: `git pull origin dev`
2. **Create feature branch**: `git checkout -b feature/your-module`
3. **Make atomic commits**: `git commit -m "feat: add user model"`
4. **Push branch**: `git push -u origin feature/your-module`
5. **Create PR** to `dev` on GitHub
6. **After merge**: Delete feature branch

**Commit Prefixes:**
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `refactor:` code cleanup

---

## Getting Started

```bash
# Clone and setup
git clone <repo-url>
cd ResQMeals/backend
cp .env.example .env
# Edit .env with your MongoDB URI

npm install
npm run dev
```

---

## Your Tasks (Replace with your assignment)

### If you are Member 2 (Auth):
```
Branch: feature/auth

Backend Tasks:
1. Create User model in backend/src/models/User.ts
   - Fields: name, email, password, role, verified, createdAt
   - role: 'donor' | 'ngo' | 'volunteer' | 'admin'

2. Create Auth routes in backend/src/routes/auth.ts
   - POST /auth/register (hash password, create user, return JWT)
   - POST /auth/login (verify password, return JWT)
   - GET /auth/me (protected, return current user)

3. Create authMiddleware in backend/src/middleware/auth.ts
   - Verify JWT token from Authorization header

Frontend Tasks (in RMFrontend):
4. Create /login and /register pages
5. Store JWT in localStorage
6. Redirect to role-based dashboard after login
```

### If you are Member 3 (Donor):
```
Branch: feature/donor

Backend Tasks:
1. Create FoodDonation model
   - Fields: donorId, foodType, quantity, preparedTime, expiryTime, location, status
   - Auto-calculate: expiryTime = preparedTime + 4 hours

2. Create Donation routes
   - POST /donations (create)
   - GET /donations/my (donor's history)
   - PUT /donations/:id (edit)
   - DELETE /donations/:id (cancel)

Frontend Tasks:
3. Create /donor/add page with donation form
4. Create /donor/history page showing past donations
```

### If you are Member 4 (Volunteer):
```
Branch: feature/volunteer

Backend Tasks:
1. Create PickupTask model
   - Fields: donationId, volunteerId, status, assignedAt, pickedAt, deliveredAt

2. Create Task routes
   - GET /tasks/my (volunteer's tasks)
   - PUT /tasks/:id/accept
   - PUT /tasks/:id/status (picked/delivered)

Frontend Tasks:
3. Create /volunteer/tasks page
4. Add Accept and Status update buttons
```

### If you are Member 5 (Admin + Matching):
```
Branch: feature/admin

Backend Tasks:
1. Admin routes
   - GET /admin/users
   - PUT /admin/users/:id/verify
   - PUT /admin/users/:id/block

2. Matching Engine (when NGO accepts):
   - Find volunteers within 5km
   - Sort by distance
   - Auto-create PickupTask for nearest

Frontend Tasks:
3. Create /admin page with user management
```

---

## API Base URL

- **Development**: `http://localhost:5000/api`
- **Frontend runs on**: `http://localhost:5173`

## Dependencies to Install

**Backend (if adding new packages):**
```bash
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken
```

**Frontend (if adding Axios):**
```bash
npm install axios
```

---

## Questions?

Coordinate with Deepak (DevOps lead) for:
- Branch conflicts
- Deployment issues
- Architecture decisions
