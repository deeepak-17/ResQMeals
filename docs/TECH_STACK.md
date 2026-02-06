# Tech Stack Documentation

## 1. The Core (MERN + Vite)
- **Frontend Framework**: React 19 (initialized via Vite)
  - *Context*: Fastest dev server, instant updates, industry standard.
- **Backend Runtime**: Node.js
- **Backend Framework**: Express.js
  - *Context*: Minimalist, flexible, perfect for REST APIs.
- **Database**: MongoDB (via MongoDB Atlas cloud)
  - *Context*: Handles unstructured data (different food types) and geospatial queries (finding nearby food) easily.

## 2. Frontend Libraries (The "Vibe" Layer)
- **Styling**: Tailwind CSS v4
  - *Context*: Rapid development without context switching.
- **Component Library**: shadcn/ui
  - *Context*: Polished, accessible, pre-built components.
- **Routing**: React Router DOM v7
  - *Context*: Standard for SPA navigation.
- **Maps**: React-Leaflet + Leaflet + OpenStreetMap
  - *Context*: Cost-effective alternative to Google Maps.
- **Icons**: Lucide React
  - *Context*: Clean, consistent visual language.
- **API Client**: Axios
  - *Context*: Superior error handling and interceptors compared to fetch.
- **State Management**: React Context API
  - *Context*: Simple and sufficient for the current scope (Zustand optional).

## 3. Backend Libraries (The "Depth" Layer)
- **ODM**: Mongoose
  - *Context*: Schema enforcement for FoodItem, User, Order.
- **Authentication**: JWT (jsonwebtoken) + Bcrypt.js
  - *Context*: Stateless, secure authentication.
- **File Uploads**: Multer + Cloudinary (Optional)
  - *Context*: For handling food images.
- **Real-time**: Socket.io
  - *Context*: Instant notifications for NGOs/recipients.
- **Security**: cors
  - *Context*: Enabling secure cross-origin requests.

## 4. DevOps & Tools
- **Version Control**: Git + GitHub (Mono-repo structure).
- **CI/CD**: GitHub Actions (Automated testing).
- **Testing**: Postman (API) + Vitest (Unit).
- **Deployment**:
  - **Frontend**: Vercel/Netlify.
  - **Backend**: Render/Railway.
