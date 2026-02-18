import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import FoodDonation from "../models/FoodDonation";
import PickupTask, { TaskStatus } from "../models/PickupTask";
import User from "../models/User";
import { emitToUser } from "../utils/socketEvents";

/**
 * GET /api/ngo/history
 * Get donation history for the logged-in NGO (reserved, collected).
 */
export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const ngoUserId = req.user?.id;

        if (!ngoUserId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const donations = await FoodDonation.find({
            $or: [
                { reservedBy: ngoUserId },
                { status: "collected", reservedBy: ngoUserId } // Redundant but clear
            ]
        })
            .populate("donorId", "name email organizationType")
            .sort({ updatedAt: -1 });

        res.json(donations);
    } catch (error: any) {
        console.error("getHistory error:", error.message);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

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
        let radius = parseFloat(radiusKm as string);

        if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
            res.status(400).json({ message: "Invalid coordinates or radius" });
            return;
        }

        // Validate geographic ranges
        if (latitude < -90 || latitude > 90) {
            res.status(400).json({ message: "Latitude must be between -90 and 90" });
            return;
        }
        if (longitude < -180 || longitude > 180) {
            res.status(400).json({ message: "Longitude must be between -180 and 180" });
            return;
        }

        // Validate and cap radius
        const MAX_RADIUS_KM = 50;
        if (radius <= 0) {
            res.status(400).json({ message: "Radius must be a positive number" });
            return;
        }
        radius = Math.min(radius, MAX_RADIUS_KM);

        // Convert km to meters for MongoDB
        const radiusInMeters = radius * 1000;

        // For testing/fallback: if coordinates are (0,0), don't filter by distance
        const isDefaultLocation = latitude === 0 && longitude === 0;

        const query: any = {
            status: "available",
            expiryTime: { $gt: new Date() }, // Not expired
        };

        if (!isDefaultLocation) {
            query.location = {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
                    },
                    $maxDistance: radiusInMeters,
                },
            };
        }

        const donations = await FoodDonation.find(query)
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
 * Uses atomic findOneAndUpdate to prevent race condition double-reservations.
 */
export const acceptDonation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const ngoUserId = req.user?.id;

        if (!ngoUserId) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }

        // Atomic update: only succeeds if donation is available and not expired
        const donation = await FoodDonation.findOneAndUpdate(
            {
                _id: id,
                status: "available",
                expiryTime: { $gt: new Date() }
            },
            {
                $set: {
                    status: "reserved",
                    reservedBy: ngoUserId,
                    reservedAt: new Date()
                }
            },
            { new: true }
        );

        if (donation) {
            // Workflow: Automatically assign a volunteer when NGO accepts
            // Find AVAILABLE volunteers (not currently busy with other tasks)
            const busyVolunteerIds = await PickupTask.distinct("volunteerId", {
                status: { $in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.PICKED] }
            });

            const availableVolunteer = await User.findOne({
                role: "volunteer",
                verified: true,  // Only verified volunteers
                _id: { $nin: busyVolunteerIds }  // Exclude busy volunteers
            }).sort({ createdAt: -1 });  // Still pick latest if multiple available

            console.log(`[NGO Accept] Target Volunteer: ${availableVolunteer ? availableVolunteer.email : 'NONE FOUND'}`);

            if (availableVolunteer) {
                // 2a. Create the PickupTask (ASSIGNED)
                const pickupTask = new PickupTask({
                    donationId: donation._id,
                    volunteerId: availableVolunteer._id,
                    ngoId: ngoUserId,
                    status: TaskStatus.ASSIGNED,
                    assignedAt: new Date(),
                });
                await pickupTask.save();

                // Notify volunteer
                emitToUser(availableVolunteer._id.toString(), "task:assigned", {
                    taskId: pickupTask._id,
                    donationId: donation._id,
                });

                console.log(`Task automatically assigned to volunteer: ${availableVolunteer.name}`);
            } else {
                console.log("No volunteers available. Creating PENDING task.");
                // 2b. Create the PickupTask (PENDING)
                const pickupTask = new PickupTask({
                    donationId: donation._id,
                    volunteerId: undefined, // Explicitly undefined
                    ngoId: ngoUserId,
                    status: TaskStatus.PENDING,
                });
                await pickupTask.save();
                console.log(`Task ${pickupTask._id} queued as PENDING`);
            }

            // Notify the donor that their donation was reserved
            // ✅ MOVED OUTSIDE: This now runs regardless of volunteer assignment
            const donorIdStr = donation.donorId.toString();
            console.log(`📢 Emitting 'donation:reserved' to donor ${donorIdStr}`);
            console.log(`   - Donation ID: ${donation._id}`);
            console.log(`   - Reserved By: ${ngoUserId}`);

            emitToUser(donorIdStr, "donation:reserved", {
                donationId: donation._id,
                reservedBy: ngoUserId,
            });

            res.json({
                message: "Donation accepted and transport task created",
                donation,
                assignedVolunteer: availableVolunteer ? {
                    id: availableVolunteer._id,
                    name: availableVolunteer.name,
                    email: availableVolunteer.email
                } : null
            });
            return;
        }

        // Atomic update failed - determine why
        const existingDonation = await FoodDonation.findById(id);

        if (!existingDonation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        if (existingDonation.status !== "available") {
            res.status(400).json({
                message: `Donation is not available. Current status: ${existingDonation.status}`
            });
            return;
        }

        // Must be expired
        existingDonation.status = "expired";
        await existingDonation.save();
        res.status(400).json({ message: "Donation has expired" });

    } catch (error: any) {
        console.error("acceptDonation error:", error.message);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

/**
 * POST /api/ngo/confirm/:id
 * NGO confirms that they have picked up the donation.
 * Uses atomic findOneAndUpdate to prevent race conditions.
 */
export const confirmPickup = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const ngoUserId = req.user?.id;

        if (!ngoUserId) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }

        // Atomic update: only succeeds if donation is reserved by this NGO
        const donation = await FoodDonation.findOneAndUpdate(
            {
                _id: id,
                status: "reserved",
                reservedBy: ngoUserId
            } as any,
            {
                $set: {
                    status: "collected",
                    collectedAt: new Date()
                }
            },
            { new: true }
        );

        if (donation) {
            // Notify the donor that pickup was confirmed
            emitToUser(donation.donorId.toString(), "donation:collected", {
                donationId: donation._id,
                collectedAt: donation.collectedAt,
            });

            res.json({
                message: "Pickup confirmed successfully",
                donation,
            });
            return;
        }

        // Atomic update failed - determine why
        const existingDonation = await FoodDonation.findById(id);

        if (!existingDonation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        if (existingDonation.status !== "reserved") {
            res.status(400).json({
                message: `Cannot confirm pickup. Current status: ${existingDonation.status}`
            });
            return;
        }

        // Must be reserved by someone else
        res.status(403).json({ message: "You did not reserve this donation" });

    } catch (error: any) {
        console.error("confirmPickup error:", error.message);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
