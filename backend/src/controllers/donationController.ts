import { Request, Response } from "express";
import FoodDonation, { IFoodDonation } from "../models/FoodDonation";
import { AuthRequest } from "../middleware/auth";

// POST /donations
export const createDonation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { foodType, quantity, preparedTime, location, imageUrl } = req.body;

        const donorId = req.user?.id;

        if (!donorId) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }

        const newDonation = new FoodDonation({
            donorId,
            foodType,
            quantity,
            preparedTime,
            location,
            imageUrl,
        });

        const savedDonation = await newDonation.save();
        res.status(201).json(savedDonation);
    } catch (error: unknown) {
        const err = error as Error;
        console.error("createDonation error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// GET /donations/my
export const getMyDonations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const donorId = req.user?.id;

        if (!donorId) {
            res.status(401).json({ message: "Unauthorized: User ID required" });
            return;
        }

        const donations = await FoodDonation.find({ donorId } as any).sort({ createdAt: -1 });
        res.json(donations);
    } catch (error: unknown) {
        const err = error as Error;
        console.error("getMyDonations error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// PUT /donations/:id
export const updateDonation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const donorId = req.user?.id;

        if (!donorId) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }

        const donation = await FoodDonation.findById(id);

        if (!donation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        // Enforce ownership
        if (donation.donorId.toString() !== donorId) {
            res.status(403).json({ message: "Unauthorized: You do not own this donation" });
            return;
        }

        // Whitelist allowed fields
        const { foodType, quantity, preparedTime, location, imageUrl } = req.body;

        if (foodType) donation.foodType = foodType;
        if (quantity) donation.quantity = quantity;
        if (location) donation.location = location;
        if (imageUrl) donation.imageUrl = imageUrl;

        // If preparedTime changes, update it and recompute expiryTime
        if (preparedTime) {
            donation.preparedTime = preparedTime;
            // Recompute expiry (preparedTime + 4 hours)
            const preparedDate = new Date(preparedTime);
            donation.expiryTime = new Date(preparedDate.getTime() + 4 * 60 * 60 * 1000);
        }

        const updatedDonation = await donation.save();
        res.json(updatedDonation);
    } catch (error: unknown) {
        const err = error as Error;
        console.error("updateDonation error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// DELETE /donations/:id
export const deleteDonation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const donorId = req.user?.id;

        if (!donorId) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }

        const donation = await FoodDonation.findById(id);

        if (!donation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        // Enforce ownership
        if (donation.donorId.toString() !== donorId) {
            res.status(403).json({ message: "Unauthorized: You do not own this donation" });
            return;
        }

        await donation.deleteOne();

        res.json({ message: "Donation deleted successfully" });
    } catch (error: unknown) {
        const err = error as Error;
        console.error("deleteDonation error:", err.message);
        res.status(500).json({ message: "Server Error" });
    }
};
