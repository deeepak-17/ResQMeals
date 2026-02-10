# API Flow Documentation

This document describes the key API flows in the ResQMeals application.

## Authentication and Donation Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React App
    participant AuthAPI as Auth API
    participant DonationAPI as Donation API
    participant Database as MongoDB

    User->>Frontend: Register/Login
    Frontend->>AuthAPI: POST /api/auth/register or /login
    AuthAPI->>Database: Create/validate user
    Database-->>AuthAPI: User record
    AuthAPI-->>Frontend: JWT token + role
    Frontend->>AuthAPI: GET /api/auth/me (Bearer token)
    AuthAPI-->>Frontend: User data
    User->>Frontend: Submit donation
    Frontend->>DonationAPI: POST /api/donations (Bearer token)
    DonationAPI->>Database: Create FoodDonation
    Database-->>DonationAPI: Donation created
    DonationAPI-->>Frontend: 201 Created
```

## Flow Description

### 1. User Registration/Login
- User submits credentials via the React frontend
- Frontend sends POST request to `/api/auth/register` or `/api/auth/login`
- Auth API validates credentials and creates/retrieves user from MongoDB
- Returns JWT token and user role to frontend

### 2. User Authentication
- Frontend includes JWT token in Authorization header (Bearer token)
- GET request to `/api/auth/me` retrieves current user data
- Auth middleware validates token before processing request

### 3. Donation Submission
- Authenticated user submits donation details
- Frontend sends POST to `/api/donations` with Bearer token
- Donation API creates FoodDonation record in MongoDB
- Returns 201 Created status with donation data

## Security Notes
- All protected endpoints require valid JWT token in Authorization header
- Token format: `Bearer <token>`
- Auth middleware validates token and extracts user information
- Tokens include user ID and role for authorization
