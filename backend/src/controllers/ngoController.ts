import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import FoodDonation from "../models/FoodDonation";
import PickupTask, { TaskStatus } from "../models/PickupTask";
import User from "../models/User";
import { emitToUser } from "../utils/socketEvents";

/**
 * GET /api/ngo/tasks
 * Get all pickup tasks for the logged-in NGO.
 */
export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const ngoUserId = req.user?.id;

        if (!ngoUserId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const tasks = await PickupTask.find({ ngoId: ngoUserId })
            .populate("donationId")
            .populate("volunteerId", "name email reliabilityScore averageRating")
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error: any) {
        console.error("getTasks error:", error.message);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

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
        } as any)
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
        const MAX_RADIUS_KM = 5000;
        if (radius <= 0) {
            res.status(400).json({ message: "Radius must be a positive number" });
            return;
        }
        radius = Math.min(radius, MAX_RADIUS_KM);

        // Convert km to meters for MongoDB
        const radiusInMeters = radius * 1000;

        // Skip geo filter if: (1) coords are (0,0) default, or (2) radius >= 5000 ("show all" mode)
        const isDefaultLocation = latitude === 0 && longitude === 0;
        const isShowAll = radius >= 5000;

        console.log(`[NGO Nearby] Fetching: lat=${latitude}, lng=${longitude}, radius=${radiusKm}, isShowAll=${isShowAll}`);

        const query: any = {
            status: "available",
            // expiryTime: { $gt: new Date() }, // Temporary commented for debugging
        };

        if (!isDefaultLocation && !isShowAll) {
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

        console.log(`[NGO Nearby] Mongo Query: ${JSON.stringify(query)}`);

        const donations = await FoodDonation.find(query)
            .populate("donorId", "name email organizationType")
            .sort({ createdAt: -1 }); // Newest first for debugging

        console.log(`[NGO Nearby] Found ${donations.length} available donations`);

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
            // USER STORY 4.2, 4.3, 4.5: Find available volunteers with Load Balancing
            const donationLocation = donation.location.coordinates;

            // Find volunteers who already declined this donation — exclude them
            const declinedTasks = await PickupTask.find({
                donationId: donation._id,
                status: TaskStatus.DECLINED,
            }).select("volunteerId");
            const excludeVolunteerIds = declinedTasks
                .map(t => t.volunteerId)
                .filter(Boolean);

            const volunteerFilter: any = {
                role: "volunteer",
                verified: true,
                isAvailable: true, // Only assign to Online volunteers
            };
            if (excludeVolunteerIds.length > 0) {
                volunteerFilter._id = { $nin: excludeVolunteerIds };
            }

            const nearbyVolunteers = await User.find({
                ...volunteerFilter,
                location: {
                    $nearSphere: {
                        $geometry: { type: "Point", coordinates: donationLocation },
                        $maxDistance: 5000, // 5km
                    },
                },
            }).limit(10);

            // ALWAYS also fetch all other verified/available volunteers
            // (including those without location set). This prevents a single
            // geo-located volunteer from monopolizing every assignment.
            const nearbyIds = nearbyVolunteers.map(v => v._id.toString());
            const allVolunteers = await User.find(volunteerFilter).select("-password");
            // Merge: nearby first, then everyone else (deduplicated)
            const otherVolunteers = allVolunteers.filter(
                v => !nearbyIds.includes(v._id.toString())
            );

            const volunteersToConsider = [...nearbyVolunteers, ...otherVolunteers];
            let availableVolunteer = null;

            if (volunteersToConsider.length > 0) {
                // Load Balancing: Get active task counts
                const volunteerScores = await Promise.all(volunteersToConsider.map(async (v) => {
                    const activeTasks = await PickupTask.countDocuments({
                        volunteerId: v._id,
                        status: { $in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.PICKED] }
                    });
                    // Nearby volunteers (have location within 5km) get a proximity bonus
                    const isNearby = nearbyIds.includes(v._id.toString());
                    return { volunteer: v, activeTasks, reliability: v.reliabilityScore || 0, isNearby };
                }));
                // Sort: least busy first, then nearby preference, then highest reliability
                volunteerScores.sort((a, b) => {
                    if (a.activeTasks !== b.activeTasks) return a.activeTasks - b.activeTasks;
                    if (a.isNearby !== b.isNearby) return a.isNearby ? -1 : 1;
                    return b.reliability - a.reliability;
                });
                availableVolunteer = volunteerScores[0].volunteer;
            }

            console.log(`[NGO Accept] Target Volunteer: ${availableVolunteer ? availableVolunteer.email : 'NONE FOUND (queuing as PENDING)'}`);

            if (availableVolunteer) {
                // 2a. Create the PickupTask (ASSIGNED)
                const pickupTask = new PickupTask({
                    donationId: donation._id,
                    volunteerId: availableVolunteer._id,
                    ngoId: ngoUserId,
                    status: TaskStatus.ASSIGNED,
                    assignedAt: new Date(),
                    priority: donation.isHighRisk ? 'High' : 'Normal',
                    // User Story 5.3: Chain-of-Custody Tracking
                    history: [{
                        status: TaskStatus.ASSIGNED,
                        timestamp: new Date(),
                        updatedBy: ngoUserId as any,
                        note: `Task assigned automatically to volunteer ${availableVolunteer.name}`
                    }]
                });
                await pickupTask.save();

                // User Story 5.4: Volunteer Reliability Scoring
                await User.findByIdAndUpdate(availableVolunteer._id, {
                    $inc: { totalAssignedTasks: 1 }
                });

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
                    priority: donation.isHighRisk ? 'High' : 'Normal',
                    // User Story 5.3: Chain-of-Custody Tracking
                    history: [{
                        status: TaskStatus.PENDING,
                        timestamp: new Date(),
                        updatedBy: ngoUserId as any,
                        note: "Task created and queued as PENDING (no volunteers available)"
                    }]
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

/**
 * POST /api/ngo/tasks/:id/feedback
 * NGO submits feedback and rating for a delivered task.
 * User Story 5.5 & 5.8
 */
export const submitTaskFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { rating, feedback } = req.body;
        const ngoUserId = req.user?.id;

        if (!ngoUserId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({ message: "Invalid rating. Must be between 1 and 5." });
            return;
        }

        const task = await PickupTask.findOne({
            _id: id,
            ngoId: ngoUserId,
            status: TaskStatus.DELIVERED
        });

        if (!task) {
            res.status(404).json({ message: "Delivered task not found or already rated." });
            return;
        }

        // Update task with feedback
        task.rating = rating;
        task.feedback = feedback;

        // User Story 5.8: Close the feedback loop by updating the 'delivered' history note
        const deliveryEntry = task.history.reverse().find(h => h.status === TaskStatus.DELIVERED);
        if (deliveryEntry) {
            deliveryEntry.note = `Food delivered to NGO. Ratings: ${rating} ★. Feedback: "${feedback || 'Excellent service!'}"`;
        } else {
            // Fallback: If no delivery entry found, add a new history step
            task.history.push({
                status: TaskStatus.DELIVERED,
                timestamp: new Date(),
                updatedBy: ngoUserId as any,
                note: `NGO provided feedback: ${rating} Stars. "${feedback || 'No comments'}"`
            });
        }

        // Reverse back to maintain original chronological order
        task.history.reverse();

        await task.save();

        // Update volunteer performance (User Story 5.5)
        if (task.volunteerId) {
            const volunteer = await User.findById(task.volunteerId);
            if (volunteer) {
                const currentTotal = volunteer.totalRatings || 0;
                const currentAvg = volunteer.averageRating || 0;

                // New average = ((old_avg * old_count) + new_rating) / (old_count + 1)
                const newTotal = currentTotal + 1;
                const newAvg = ((currentAvg * currentTotal) + rating) / newTotal;

                volunteer.averageRating = Number(newAvg.toFixed(2));
                volunteer.totalRatings = newTotal;
                await volunteer.save();
            }
        }

        res.json({ message: "Feedback submitted successfully", task });
    } catch (error: any) {
        console.error("submitTaskFeedback error:", error.message);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
