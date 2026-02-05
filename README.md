# ResQMeals (M7 Platform)

A food redistribution platform connecting surplus food donors with NGOs and shelters.

## Tech Stack

- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io
- **Frontend**: React 19, Vite, Tailwind CSS, shadcn/ui
- **Auth**: JWT + Bcrypt

## Project Structure

```
ResQMeals/
├── backend/           # Express API server
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.ts
│   └── .env.example
├── docs/              # Project documentation
└── .github/workflows/ # CI/CD pipelines
```

Frontend is in a separate repository: **RMFrontend**

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas account
- npm or bun

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

### Frontend Setup (RMFrontend repo)

```bash
cd ../RMFrontend
cp .env.example .env
npm install
npm run dev
```

## Team

| Member | Role |
|--------|------|
| Deepak | DevOps + NGO Module |
| Member 2 | Auth System |
| Member 3 | Donor Module |
| Member 4 | Volunteer Module |
| Member 5 | Admin + Matching |

## Git Workflow

1. Create feature branch from `develop`
2. Make atomic commits with conventional messages
3. Open PR to `develop`
4. Code review and merge

## Scripts

```bash
# Backend
npm run dev      # Start dev server
npm run lint     # Run ESLint
npm run build    # Build for production

# Frontend
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```
