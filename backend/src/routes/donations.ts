import express, { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import FoodDonation from "../models/FoodDonation";

const router = express.Router();

// @route   POST /api/donations
// @desc    Create a new donation
// @access  Private (Donor only)
router.post(
    "/",
    authMiddleware,
    [
        body("foodType", "Food type is required").not().isEmpty(),
        body("quantity", "Quantity is required").not().isEmpty(),
        body("preparedTime", "Prepared time is required").isISO8601(),
        body("location", "Location is required").not().isEmpty(),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            // Ensure user is a donor
            if (req.user?.role !== 'donor') {
                res.status(403).json({ message: "Only donors can create donations" });
                return;
            }

            const { foodType, quantity, preparedTime, location, imageUrl } = req.body;

            // Calculate expiry time (4 hours after prepared time)
            const preparedDate = new Date(preparedTime);
            const expiryTime = new Date(preparedDate.getTime() + 4 * 60 * 60 * 1000);

            const newDonation = new FoodDonation({
                donorId: req.user.id,
                foodType,
                quantity,
                preparedTime,
                expiryTime,
                location,
                imageUrl,
                status: 'available'
            });

            const donation = await newDonation.save();
            res.json(donation);
        } catch (err) {
            console.error((err as Error).message);
            res.status(500).json({ message: "Server Error" });
        }
    }
);

// @route   GET /api/donations/my
// @desc    Get all donations for the logged-in donor
// @access  Private
router.get("/my", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const donations = await FoodDonation.find({ donorId: req.user?.id as any }).sort({ createdAt: -1 });
        res.json(donations);
    } catch (err) {
        console.error((err as Error).message);
        res.status(500).json({ message: "Server Error" });
    }
});

// @route   GET /api/donations/:id
// @desc    Get donation by ID
// @access  Private
router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const donation = await FoodDonation.findById(req.params.id);

        if (!donation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        res.json(donation);
    } catch (err) {
        console.error((err as Error).message);
        if ((err as any).kind === "ObjectId") {
            res.status(404).json({ message: "Donation not found" });
            return;
        }
        res.status(500).json({ message: "Server Error" });
    }
});

// @route   DELETE /api/donations/:id
// @desc    Delete a donation
// @access  Private (Donor only)
router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const donation = await FoodDonation.findById(req.params.id);

        if (!donation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        // Check user
        if (donation.donorId.toString() !== req.user?.id) {
            res.status(401).json({ message: "User not authorized" });
            return;
        }

        await donation.deleteOne();

        res.json({ message: "Donation removed" });
    } catch (err) {
        console.error((err as Error).message);
        if ((err as any).kind === "ObjectId") {
            res.status(404).json({ message: "Donation not found" });
            return;
        }
        res.status(500).json({ message: "Server Error" });
    }
});

export default router;
