# Team Assignments: Sprint 1

## Team Roster

| Name | Role | Primary Focus |
|------|------|---------------|
| Deepak | DevOps Engineer | Base Setup, CI/CD, Deployment, Real-time, NGO Backend |
| Member 2 | Backend Developer | Authentication System |
| Member 3 | Full Stack Developer | Donor Module |
| Member 4 | Full Stack Developer | Volunteer Module |
| Member 5 | Full Stack Developer | Admin Module + Matching Engine |

---

## Git Workflow

### Branching Strategy
```
main (protected - production)
  └── develop (integration branch)
        ├── setup/base-config
        ├── feature/auth
        ├── feature/donor
        ├── feature/ngo
        ├── feature/volunteer
        ├── feature/admin
        ├── feature/matching
        ├── feature/realtime
        └── deploy/production
```

### Process
1. **Create branch** from `develop` (e.g., `feature/auth`).
2. **Write code** with small, atomic commits.
3. **Push branch** to GitHub.
4. **Open Pull Request** to `develop` with clear description.
5. **Code Review** by at least one teammate.
6. **Merge** after approval.
7. **Delete** feature branch after merge.

### Commit Convention
```
feat: add user registration API
fix: correct JWT token expiry
docs: update README with setup steps
refactor: extract auth middleware
```

---

## Phase 0: Base Setup (Deepak - FIRST)

> This must be completed BEFORE anyone else starts.

### Tasks
- [ ] Create folder structure for Backend and Frontend.
- [ ] Setup TypeScript configs (`tsconfig.json`).
- [ ] Setup ESLint and Prettier.
- [ ] Create `.env.example` files with required variables.
- [ ] Setup GitHub repository with branch protection.
- [ ] Create GitHub Actions CI pipeline (lint + build).
- [ ] Document setup instructions in `README.md`.

### Branch
```
setup/base-config
```

### Output
- Clean project skeleton.
- Teammates can clone and run `npm install`.

---

## Feature Work (All 5 Members - PARALLEL)

### Deepak: NGO Module + Real-time

#### Branch: `feature/ngo`
**Backend Tasks:**
- [ ] Create `GET /donations/nearby` API (GeoQuery).
- [ ] Create `POST /ngo/accept/:id` API to claim donation.
- [ ] Create `POST /ngo/confirm/:id` API to confirm pickup.

**Frontend Tasks:**
- [ ] Create `/ngo/available` page showing nearby donations.
- [ ] Add distance filter/sort.
- [ ] Create `/ngo/history` page for past claims.

#### Branch: `feature/realtime`
- [ ] Setup Socket.io on backend.
- [ ] Emit `donation_posted` when donor adds food.
- [ ] Emit `accepted` when NGO claims.
- [ ] Emit `delivered` when volunteer completes.
- [ ] Frontend: Listen for events and show toast notifications.

---

### Member 2: Authentication System

#### Branch: `feature/auth`

**Backend Tasks:**
- [ ] Create `User` model with fields: `name, email, password, role, verified, createdAt`.
- [ ] Create `POST /auth/register` API (hash password with bcrypt).
- [ ] Create `POST /auth/login` API (return JWT token).
- [ ] Create `GET /auth/me` API (protected, returns current user).
- [ ] Create `authMiddleware` to verify JWT on protected routes.

**Frontend Tasks:**
- [ ] Create `/register` page with form (Name, Email, Password, Role dropdown).
- [ ] Create `/login` page with form (Email, Password).
- [ ] Store JWT token in localStorage.
- [ ] Create `AuthContext` for global auth state.
- [ ] Redirect to role-based dashboard after login:
  - Donor → `/donor/dashboard`
  - NGO → `/ngo/dashboard`
  - Volunteer → `/volunteer/dashboard`
  - Admin → `/admin/dashboard`

---

### Member 3: Donor Module

#### Branch: `feature/donor`

**Backend Tasks:**
- [ ] Create `FoodDonation` model with fields:
  - `donorId, foodType, quantity, preparedTime, expiryTime, location, status, imageUrl`
- [ ] Implement auto-expiry logic: `expiryTime = preparedTime + 4 hours`.
- [ ] Create `POST /donations` API (create donation).
- [ ] Create `GET /donations/my` API (donor's history).
- [ ] Create `PUT /donations/:id` API (edit donation).
- [ ] Create `DELETE /donations/:id` API (cancel donation).

**Frontend Tasks:**
- [ ] Create `/donor/add` page with form:
  - Food Type, Quantity, Prepared Time, Location (lat/lng), Image Upload.
- [ ] Show calculated expiry time.
- [ ] Create `/donor/history` page showing all donations with status.
- [ ] Add edit/delete buttons to history cards.

---

### Member 4: Volunteer Module

#### Branch: `feature/volunteer`

**Backend Tasks:**
- [ ] Create `PickupTask` model with fields:
  - `donationId, volunteerId, status, assignedAt, pickedAt, deliveredAt`
- [ ] Create `GET /tasks/my` API (volunteer's assigned tasks).
- [ ] Create `PUT /tasks/:id/accept` API (accept task).
- [ ] Create `PUT /tasks/:id/status` API (update: picked/delivered).

**Frontend Tasks:**
- [ ] Create `/volunteer/tasks` page showing assigned tasks.
- [ ] Add Accept/Decline buttons.
- [ ] Add status update buttons (Mark as Picked / Mark as Delivered).
- [ ] Show pickup and delivery addresses on task cards.

---

### Member 5: Admin Module + Matching Engine

#### Branch: `feature/admin`

**Backend Tasks:**
- [ ] Create `GET /admin/users` API (list all users).
- [ ] Create `PUT /admin/users/:id/verify` API (approve user).
- [ ] Create `PUT /admin/users/:id/block` API (block user).
- [ ] Create `GET /admin/logs` API (transaction logs).

**Frontend Tasks:**
- [ ] Create `/admin/users` page with user list.
- [ ] Add Verify/Block buttons per user.
- [ ] Create `/admin/logs` page showing system activity.

#### Branch: `feature/matching`

**Backend Tasks:**
- [ ] When NGO accepts a donation:
  1. Get NGO location.
  2. Find all volunteers within 5km radius.
  3. Sort by distance (nearest first).
  4. Assign task to first available volunteer.
- [ ] Auto-create `PickupTask` record.
- [ ] Emit Socket.io event to notify assigned volunteer.

---

## Execution Order

```
Week 1:
├─ Day 1-2: Deepak completes Base Setup
├─ Day 2-3: Member 2 starts Auth (others wait)
├─ Day 3-4: All members start their modules (parallel)
│     ├─ Member 3: Donor
│     ├─ Member 4: Volunteer
│     ├─ Member 5: Admin + Matching
│     └─ Deepak: NGO + Realtime
├─ Day 5: Integration and bug fixes
└─ Day 6: Testing + Deployment
```

## Dependencies

| Module | Depends On |
|--------|------------|
| Base Setup | None |
| Auth | Base Setup |
| Donor | Auth (needs user context) |
| NGO | Auth, Donor (needs donations to display) |
| Volunteer | Auth, Matching (needs assigned tasks) |
| Admin | Auth |
| Matching | Donor, Volunteer (needs both models) |
| Realtime | All modules (final integration) |

---

## Testing Checklist

- [ ] Register as Donor → Post Food → See in Feed.
- [ ] Register as NGO → See Nearby Donations → Accept One.
- [ ] Volunteer receives auto-assigned task.
- [ ] Volunteer marks as Picked → Delivered.
- [ ] NGO confirms receipt.
- [ ] Admin can verify/block users.
- [ ] Real-time notifications work.

---

## Deployment

| Component | Platform | Owner |
|-----------|----------|-------|
| Backend | Render | Deepak |
| Frontend | Vercel | Deepak |
| Database | MongoDB Atlas | Deepak |
