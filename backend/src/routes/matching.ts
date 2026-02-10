import express from "express";
import { authMiddleware } from "../middleware/auth";
import { roleMiddleware } from "../middleware/role";
import { assignVolunteer, getMatchingStatus } from "../controllers/matchingController";

const router = express.Router();

// All matching routes require authentication
router.use(authMiddleware);

// @route   POST /api/matching/assign/:donationId
// @desc    Auto-assign nearest available volunteer to a reserved donation
// @access  Admin or NGO
router.post("/assign/:donationId", roleMiddleware("admin", "ngo"), assignVolunteer);

// @route   GET /api/matching/status/:donationId
// @desc    Check volunteer assignment status for a donation
// @access  Admin, NGO, or Volunteer
router.get("/status/:donationId", roleMiddleware("admin", "ngo", "volunteer"), getMatchingStatus);

export default router;
