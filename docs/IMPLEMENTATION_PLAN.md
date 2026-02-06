# Implementation Plan (IMPLEMENTATION_PLAN.md)

## Phase 1: Foundation (Days 1-2)
- [x] **Project Setup**: Initialize Frontend (Vite) and Backend (Express).
- [ ] **Database**: Setup MongoDB Atlas and connect basic Mongoose.
- [ ] **Auth System**: Implement Register/Login API with JWT.
- [ ] **Frontend Auth**: Create Login/Register pages and AuthContext.

## Phase 2: Core Features (Days 3-5)
- [ ] **Backend CRUD**: Create FoodItem Model and CRUD endpoints.
- [ ] **Image Upload**: Setup Multer/Cloudinary for food images.
- [ ] **Post Food UI**: Create "Add Food" form on Frontend.
- [ ] **Feed UI**: Display FoodCards fetching data from API.

## Phase 3: Interactions & Geo (Days 6-8)
- [ ] **Geospatial**: Implement "Find Nearby" logic in MongoDB.
- [ ] **Maps**: Integrate Leaflet to show item locations.
- [ ] **Claim Flow**: Implement claiming logic and status updates.

## Phase 4: Polish & Deploy (Days 9-10)
- [ ] **Real-time**: Add Socket.io for "Item Claimed" alerts.
- [ ] **Responsiveness**: Verify UI on Mobile.
- [ ] **Deployment**: Push to Vercel (Front) and Render (Back).
