import { Request, Response } from "express";
import FoodDonation from "../models/FoodDonation";

interface AuthRequest extends Request {
    user?: any;
}

// POST /donations
export const createDonation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { foodType, quantity, preparedTime, location, imageUrl } = req.body;

        // TODO: remove fallback when auth is implemented
        const donorId = req.user?.id || req.body.donorId;

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
    } catch (error: any) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// GET /donations/my
export const getMyDonations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const donorId = req.user?.id || req.query.donorId; // Fallback for testing

        if (!donorId) {
            res.status(401).json({ message: "Unauthorized: User ID required" });
            return;
        }

        const donations = await FoodDonation.find({ donorId }).sort({ createdAt: -1 });
        res.json(donations);
    } catch (error: any) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// PUT /donations/:id
export const updateDonation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Prevent updating critical fields directly if needed, for now allow all
        const updatedDonation = await FoodDonation.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedDonation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        res.json(updatedDonation);
    } catch (error: any) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// DELETE /donations/:id
export const deleteDonation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deletedDonation = await FoodDonation.findByIdAndDelete(id);

        if (!deletedDonation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        res.json({ message: "Donation deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
