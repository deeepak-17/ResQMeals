# Detailed PR Review: `feature/auth-v2`

**Base Branch:** `dev`
**Compare Branch:** `feature/auth-v2`

This report details the specific changes, improvements, and fixes included in this Pull Request.

---

## 1. 🛡️ Authentication & Security Improvements

### **Strict Bearer Token Validation**
**File:** `backend/src/middleware/auth.ts`
- **Change:** Implemented strict validation for the `Authorization` header.
- **Details:**
  -  Replaced loose `.replace("Bearer ", "")` logic.
  -  Now strictly checks if the header starts with `"Bearer "`.
  -  Returns `401 Invalid authorization scheme` if the scheme is incorrect.
  -  Properly extracts and trims the token.

### **Error Handling & Information Leaks**
**File:** `backend/src/routes/auth.ts`
- **Change:** Secured error responses in the `/me` endpoint and auth callbacks.
- **Details:**
  - **Before:** Potential to leak internal error details (stack traces/messages) to the client.
  - **After:** Returns generic `500 Server Error` messages to the client while logging full error details to the server console for debugging.
  - **Fix:** Removed `throw err` in `jwt.sign` callbacks to prevent unhandled process crashes.

### **Password Complexity**
**File:** `backend/verify-auth.ts`
- **Change:** Updated test user credentials to meet new security requirements.
- **Details:** Changed test password to `StrongPass@123` to pass the regex requirement for uppercase and special characters.

---

## 2. 📚 Documentation Updates

### **Git Workflow Standardization**
**File:** `docs/AGENTS.md`
- **Change:** Updated workflow guide to match strict repository practices.
- **Details:**
  - Changed base branch from `main` to `dev`.
  - Updated PR target instructions to point to `dev`.
  - Standardized feature branch naming convention.

### **Tech Stack Accuracy**
**File:** `docs/TECH_STACK.md`
- **Change:** Corrected status of frontend and testing tools.
- **Details:**
  - **Frontend:** Marked as `"React 19 (planned; not yet initialized)"` to reflect current state.
  - **Testing:** Updated test runner from incorrect "Vitest" to actual **"Jest"**.

### **Backend Structure**
**File:** `docs/BACKEND_STRUCTURE.md`
- **Change:** Clarified middleware status.
- **Details:** Marked `roleMiddleware` as `(Planned)` to align documentation with actual implementation.

### **New Documentation**
- **Created:** `docs/API_FLOWS.md`
  - Added Mermaid.js sequence diagram illustrating the full User Registration → Login → Donation flow.

---

## 3. 🐛 Bug Fixes & Code Quality

### **Seed Data Logic**
**File:** `backend/src/utils/seed.ts`
- **Change:** Fixed business logic for donation expiry.
- **Details:**
  - **Before:** Expiry set to arbitrary +1/+2 days.
  - **After:** Expiry strictly calculated as `preparedTime + 4 hours`, complying with the `FoodDonation` model rules.

### **Express Validator Compatibility**
**Files:** `backend/src/middleware/validation.ts`, `backend/src/routes/auth.ts`
- **Change:** Fixed compatibility with Express 5.
- **Details:** Verified use of `matchedData(req)` instead of relying on `req.query` mutation, which is deprecated/unsafe in newer Express versions.

### **CI/CD Pipeline**
**File:** `.github/workflows/ci.yml`
- **Change:** Hardened test execution.
- **Details:** Removed `--if-present` flag from `npm test` step. The CI pipeline will now **fail** if tests are missing, preventing silent failures.

---

## 4. 🧪 Testing

### **New Health Check Test**
**File:** `backend/src/tests/health.test.ts` (New File)
- **Change:** Added real integration test.
- **Details:**
  - Replaced placeholder assertions.
  - Implemented `supertest` to perform an actual HTTP GET request to the root endpoint (`/`).
  - Verifies `200 OK` status and response body.

### **Test Configuration**
- **Added:** `backend/jest.config.js` for proper Jest configuration.
- **Dependencies:** Added `supertest` and types for integration testing.

---

## 5. ⚙️ Configuration & Dependencies

- **`.gitignore`**: Updated to include proper ignores (node_modules, env files).
- **`backend/package.json`**:
  - Added strict `test` script (`jest`).
  - Updated dependencies (`express-validator`, `supertest`).
- **`frontend/package-lock.json`**: Added to track frontend dependency state (even if not yet fully initialized).
