import { Request, Response } from "express";
import FoodDonation from "../models/FoodDonation";
import { emitToRole } from "../utils/socketEvents";

interface AuthRequest extends Request {
    user?: any;
}

// POST /donations
// POST /donations
export const createDonation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        console.log("DonationController: createDonation called. Body:", req.body);
        console.log("DonationController: File:", req.file);

        const donorId = req.user?.id;
        if (!donorId) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }

        // Parse FormData fields (multer puts them in req.body)
        const title = req.body.title || "Food Donation";
        const description = req.body.description || "";
        const foodType = req.body.foodType;
        const quantityVal = req.body.quantity;
        const unit = req.body.unit;
        const quantity = `${quantityVal} ${unit}`; // Combine quantity + unit
        const preparedTime = req.body.preparedAt; // Frontend sends preparedAt

        // Handle location - check both structured object and flat keys
        let lng: number, lat: number, address: string = "";

        if (req.body.location && req.body.location.coordinates) {
            // Already parsed as object
            lng = parseFloat(req.body.location.coordinates[0]);
            lat = parseFloat(req.body.location.coordinates[1]);
            address = req.body.location.address || "";
        } else {
            // Handle raw nested keys from FormData
            lng = parseFloat(req.body['location[coordinates][0]']);
            lat = parseFloat(req.body['location[coordinates][1]']);
            address = req.body['location[address]'] || "";
        }

        console.log(`DonationController: Parsed coordinates: [${lng}, ${lat}], Address: ${address}`);

        // Construct location object
        const location = {
            type: "Point",
            coordinates: [lng, lat],
            address
        };

        // Handle image file
        let imageUrl = '';
        if (req.file) {
            // accessible via http://localhost:5001/uploads/filename
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const newDonation = new FoodDonation({
            donorId,
            title,
            description,
            foodType,
            quantity,
            preparedTime,
            location,
            imageUrl,
        });

        const savedDonation = await newDonation.save();

        // Notify all NGOs about the new donation
        emitToRole("ngo", "donation:new", savedDonation);

        res.status(201).json(savedDonation);
    } catch (error: any) {
        console.error("Donation creation error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// GET /donations/my
export const getMyDonations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        console.log("DonationController: getMyDonations called. User:", req.user);
        const donorId = req.user?.id || req.query.donorId; // Fallback for testing

        if (!donorId) {
            console.error("DonationController: No donorId found in request");
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
        const userId = req.user?.id;
        const updateData = req.body;

        const donation = await FoodDonation.findById(id);

        if (!donation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        // Ownership check
        if (donation.donorId.toString() !== userId) {
            res.status(403).json({ message: "Unauthorized: You can only edit your own donations" });
            return;
        }

        // Status check - only allow editing if available (or maybe reserved?)
        // Let's allow editing if it's not collected/expired.
        if (donation.status === 'collected' || donation.status === 'expired') {
            res.status(400).json({ message: "Cannot edit donations that are already collected or expired" });
            return;
        }

        const updatedDonation = await FoodDonation.findByIdAndUpdate(id, updateData, { new: true });

        // Notify NGOs about updated donation
        emitToRole("ngo", "donation:updated", updatedDonation);

        res.json(updatedDonation);
    } catch (error: any) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// DELETE /donations/:id
export const deleteDonation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const donation = await FoodDonation.findById(id);

        if (!donation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        // Ownership check
        if (donation.donorId.toString() !== userId) {
            res.status(403).json({ message: "Unauthorized: You can only delete your own donations" });
            return;
        }

        if (donation.status === 'collected') {
            res.status(400).json({ message: "Cannot delete a donation that has already been collected. Please contact support." });
            return;
        }

        await FoodDonation.findByIdAndDelete(id);

        // Notify NGOs about deleted donation
        emitToRole("ngo", "donation:deleted", { id });

        res.json({ message: "Donation deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
