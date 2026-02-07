import express from "express";
import { getNearbyDonations, acceptDonation, confirmPickup } from "../controllers/ngoController";
import { authMiddleware } from "../middleware/auth";
import { roleMiddleware } from "../middleware/role";

const router = express.Router();

// All NGO routes require authentication and NGO role
router.use(authMiddleware);
router.use(roleMiddleware("ngo"));

// GET /api/ngo/donations/nearby?lat=xx&lng=xx&radiusKm=xx
router.get("/donations/nearby", getNearbyDonations);

// POST /api/ngo/accept/:id - Claim a donation
router.post("/accept/:id", acceptDonation);

// POST /api/ngo/confirm/:id - Confirm pickup
router.post("/confirm/:id", confirmPickup);

export default router;
