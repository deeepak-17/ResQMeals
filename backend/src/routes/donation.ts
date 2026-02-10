import express from "express";
import { createDonation, getMyDonations, updateDonation, deleteDonation } from "../controllers/donationController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

router.post("/", createDonation);
router.get("/my", getMyDonations);
router.put("/:id", updateDonation);
router.delete("/:id", deleteDonation);

export default router;
