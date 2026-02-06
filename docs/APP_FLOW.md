# Application Flow & Navigation (APP_FLOW.md)

## 1. User Journey Maps

### Donor Flow
1.  **Login/Register** -> Dashboard
2.  **Dashboard** -> Click "Donate Food"
3.  **Add Food Form** (Upload Img, Details, Location) -> Submit
4.  **Confirmation** -> Redirect to "My Donations"
5.  **Notification** -> Receive "Item Claimed" alert -> View Order -> Verify Pickup Code

### Recipient Flow
1.  **Login/Register** -> Set Location
2.  **Home Feed** -> Browse/Search Food (Filter by Distance/Type)
3.  **Food Detail** -> View Map & Expiry -> Click "Claim"
4.  **Claim Success** -> Receive Pickup Code
5.  **Pickup** -> Show Code to Donor -> Confirm Pickup

## 2. Sitemap
- **/ (Landing)**: Hero, "How it Works", CTA.
- **/auth**:
    - `/login`
    - `/register`
- **/dashboard**: User specific overview.
- **/feed**: Main listing of food items.
- **/donate**: Form to post new food.
- **/my-pickups**: History of claimed items.
- **/profile**: User settings and impact stats.

## 3. Navigation Structure
- **Navbar (Top)**: Logo, "Donate", User Menu (Profile, Logout).
- **Bottom Nav (Mobile)**: Feed, Donate, Map, Profile.
