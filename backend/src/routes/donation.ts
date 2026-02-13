import express from "express";
import { createDonation, getMyDonations, updateDonation, deleteDonation } from "../controllers/donationController";
import { upload } from "../middleware/upload";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.post("/", authMiddleware, upload.single('image'), createDonation);
router.get("/my", authMiddleware, getMyDonations);
router.put("/:id", authMiddleware, updateDonation);
router.delete("/:id", authMiddleware, deleteDonation);

export default router;
