import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import FoodDonation from "../models/FoodDonation";

/**
 * GET /api/ngo/donations/nearby
 * Find available donations near the NGO's location.
 * Query params: lat, lng, radiusKm (default 10)
 */
export const getNearbyDonations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { lat, lng, radiusKm = "10" } = req.query;

        if (!lat || !lng) {
            res.status(400).json({ message: "Latitude and longitude are required" });
            return;
        }

        const latitude = parseFloat(lat as string);
        const longitude = parseFloat(lng as string);
        const radius = parseFloat(radiusKm as string);

        if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
            res.status(400).json({ message: "Invalid coordinates or radius" });
            return;
        }

        // Convert km to meters for MongoDB
        const radiusInMeters = radius * 1000;

        const donations = await FoodDonation.find({
            status: "available",
            expiryTime: { $gt: new Date() }, // Not expired
            location: {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
                    },
                    $maxDistance: radiusInMeters,
                },
            },
        })
            .populate("donorId", "name email organizationType")
            .sort({ expiryTime: 1 }); // Most urgent first

        res.json({
            count: donations.length,
            radiusKm: radius,
            donations,
        });
    } catch (error: any) {
        console.error("getNearbyDonations error:", error.message);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

/**
 * POST /api/ngo/accept/:id
 * NGO claims/reserves a donation for pickup.
 */
export const acceptDonation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const ngoUserId = req.user?.user?.id;

        if (!ngoUserId) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }

        const donation = await FoodDonation.findById(id);

        if (!donation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        if (donation.status !== "available") {
            res.status(400).json({
                message: `Donation is not available. Current status: ${donation.status}`
            });
            return;
        }

        // Check if expired
        if (new Date() > donation.expiryTime) {
            donation.status = "expired";
            await donation.save();
            res.status(400).json({ message: "Donation has expired" });
            return;
        }

        // Reserve the donation
        donation.status = "reserved";
        donation.reservedBy = ngoUserId;
        donation.reservedAt = new Date();
        await donation.save();

        res.json({
            message: "Donation accepted successfully",
            donation,
        });
    } catch (error: any) {
        console.error("acceptDonation error:", error.message);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

/**
 * POST /api/ngo/confirm/:id
 * NGO confirms that they have picked up the donation.
 */
export const confirmPickup = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const ngoUserId = req.user?.user?.id;

        if (!ngoUserId) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }

        const donation = await FoodDonation.findById(id);

        if (!donation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        if (donation.status !== "reserved") {
            res.status(400).json({
                message: `Cannot confirm pickup. Current status: ${donation.status}`
            });
            return;
        }

        // Verify this NGO reserved it
        if (donation.reservedBy?.toString() !== ngoUserId) {
            res.status(403).json({
                message: "You did not reserve this donation"
            });
            return;
        }

        // Mark as collected
        donation.status = "collected";
        donation.collectedAt = new Date();
        await donation.save();

        res.json({
            message: "Pickup confirmed successfully",
            donation,
        });
    } catch (error: any) {
        console.error("confirmPickup error:", error.message);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
