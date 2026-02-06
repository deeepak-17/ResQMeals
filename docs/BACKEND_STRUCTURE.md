# Backend Structure (BACKEND_STRUCTURE.md)

## 1. Architecture Pattern
- **MVC (Model-View-Controller)**:
    - **Models**: Mongoose Schemas (Strongly typed).
    - **Controllers**: Business Logic (Matching algorithm, Impact calc).
    - **Routes**: API Endpoints (Versioned `/api/v1/`).

## 2. Key Entities (Database Schema)

### User (Polymorphic)
- `_id`: ObjectId
- `role`: Enum ['donor', 'ngo', 'volunteer', 'admin']
- `organizationType`: Enum ['restaurant', 'canteen', 'event', 'shelter'] (If Donor/NGO)
- `verificationStatus`: Enum ['pending', 'verified', 'rejected']
- `sustainabilityCredits`: Number (Gamification)
- `languagePref`: String (e.g., 'en', 'ta', 'hi')

### FoodItem
- `_id`: ObjectId
- `donorId`: Ref(User)
- `title`: String (e.g., "Rice and Curry for 50")
- `quantity`: Number (kg or plates)
- `foodType`: Enum ['veg', 'non-veg', 'vegan']
- `cookedAt`: Date (CRITICAL for safety)
- `safetyWindow`: Number (Hours valid)
- `expiryDate`: Date (Calculated: cookedAt + safetyWindow)
- `hygieneCert`: Boolean (Self-attested)
- `location`: { type: 'Point', coordinates: [lng, lat] }
- `status`: Enum ['available', 'reserved', 'collected', 'expired']

### ImpactLog (Analytics)
- `_id`: ObjectId
- `foodId`: Ref(FoodItem)
- `donorId`: Ref(User)
- `recipientId`: Ref(User)
- `weightKg`: Number
- `co2Saved`: Number (Formula: weight * co2_factor)
- `timestamp`: Date

## 3. Advanced API Endpoints

### Intelligent Matching
- `GET /api/matches/recommend`
    - Algorithm inputs: Distance, Perishability (expiry - now), Recipient Need.

### Impact
- `GET /api/analytics/impact/:userId`
    - Returns: `{ carbonSaved, mealsRecovered, creditsEarned }`

## 4. Middleware
- `safetyCheckMiddleware`: Auto-reject requests for expired items.
- `roleMiddleware`: specific access (e.g., only verifies NGOs can claim).
