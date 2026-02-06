import express from "express";
import { createDonation, getMyDonations, updateDonation, deleteDonation } from "../controllers/donationController";
// import authMiddleware from "../middleware/auth"; // Member 2 will provide this

const router = express.Router();

// TODO: Add authMiddleware to these routes once available
router.post("/", createDonation);
router.get("/my", getMyDonations);
router.put("/:id", updateDonation);
router.delete("/:id", deleteDonation);

export default router;
