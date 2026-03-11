import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../models/User";
import FoodDonation from "../models/FoodDonation";
import PickupTask, { TaskStatus } from "../models/PickupTask";
import { emitToUser } from "../utils/socketEvents";

const MATCHING_RADIUS_KM = 5;

// USER STORY 4.1 – Priority-Based Food Selection
const calculateDonationPriority = (donation: any) => {
    let score = 0;
    const now = new Date();

    // Priority Score based on Expiry Time
    if (donation.expiryTime) {
        const timeLeft = new Date(donation.expiryTime).getTime() - now.getTime();
        const hoursLeft = timeLeft / (1000 * 60 * 60);

        if (hoursLeft < 0) score -= 100; // Already expired
        else if (hoursLeft < 2) score += 50; // Critical
        else if (hoursLeft < 4) score += 25; // Urgent
    }

    // USER STORY 4.7 — Peak-Time Optimization
    // Check if current time is peak (e.g., lunch/dinner hours)
    const hour = now.getHours();
    const isPeakTime = (hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21);
    if (isPeakTime) {
        score += 10;
    }

    return score;
};

// USER STORY 4.4 – Route Optimization (Simulation)
const getOptimizedRoute = (donationCoords: number[], volunteerCoords: number[]) => {
    // Simulated route optimization logic
    // In production, this would use OSRM or Google Maps API
    return {
        distance: "2.5 km",
        estimatedTime: "12 mins",
        optimizedPath: [volunteerCoords, donationCoords],
        trafficStatus: "Normal"
    };
};

/**
 * POST /api/matching/assign/:donationId
 * Enhanced with User Stories 4.1 to 4.5
 */
export const assignVolunteer = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { donationId } = req.params;

        // 1. Find the donation and validate
        const donation = await FoodDonation.findById(donationId);

        if (!donation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        // USER STORY 4.1: Priority Check
        const priorityScore = calculateDonationPriority(donation);

        if (donation.status !== "reserved") {
            res.status(400).json({
                message: `Donation must be in 'reserved' status. Current status: ${donation.status}`,
            });
            return;
        }

        // 2. USER STORY 4.2 & 4.3: Match nearby volunteers using Geospatial Query
        const donationLocation = donation.location.coordinates; // [lng, lat]

        // USER STORY 4.5: Volunteer Load Balancing
        // Find all verified volunteers within radius, then sort by active task count
        const nearbyVolunteers = await User.find({
            role: "volunteer",
            verified: true,
            isAvailable: true,
            location: {
                $nearSphere: {
                    $geometry: { type: "Point", coordinates: donationLocation },
                    $maxDistance: MATCHING_RADIUS_KM * 1000,
                },
            },
        }).select("-password");

        // Always include all other available volunteers (even without location)
        const nearbyIds = nearbyVolunteers.map(v => v._id.toString());
        const allVolunteers = await User.find({ role: "volunteer", verified: true, isAvailable: true }).select("-password");
        const otherVolunteers = allVolunteers.filter(
            v => !nearbyIds.includes(v._id.toString())
        );
        const volunteersToConsider = [...nearbyVolunteers, ...otherVolunteers];

        if (volunteersToConsider.length === 0) {
            res.status(404).json({ message: "No volunteers available" });
            return;
        }

        // Load Balancing logic: Get active task counts for these volunteers
        const volunteerScores = await Promise.all(volunteersToConsider.map(async (v) => {
            const activeTasks = await PickupTask.countDocuments({
                volunteerId: v._id,
                status: { $in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.PICKED] }
            });
            const isNearby = nearbyIds.includes(v._id.toString());
            return { volunteer: v, activeTasks, isNearby };
        }));

        // Sort: least busy, then nearby preference (USER STORY 4.5)
        volunteerScores.sort((a, b) => {
            if (a.activeTasks !== b.activeTasks) return a.activeTasks - b.activeTasks;
            if (a.isNearby !== b.isNearby) return a.isNearby ? -1 : 1;
            return 0;
        });

        const assignedVolunteer = volunteerScores[0].volunteer;

        // 3. USER STORY 4.4: Route Optimization
        const route = getOptimizedRoute(donationLocation, assignedVolunteer.location?.coordinates || donationLocation);

        // 4. Create the PickupTask
        const pickupTask = new PickupTask({
            donationId: donation._id,
            volunteerId: assignedVolunteer._id,
            ngoId: donation.reservedBy, // Assuming it's reserved by the NGO
            status: TaskStatus.ASSIGNED,
            priority: priorityScore > 30 ? "High" : "Normal",
            assignedAt: new Date(),
        });

        await pickupTask.save();

        // Notify
        emitToUser(assignedVolunteer._id.toString(), "task:assigned", {
            taskId: pickupTask._id,
            donationId: donation._id,
            route: route, // Path optimization info
            priority: priorityScore > 30 ? "High" : "Normal"
        });

        res.status(201).json({
            message: `Volunteer '${assignedVolunteer.name}' assigned with optimized route`,
            task: pickupTask,
            route: route,
            priority: priorityScore
        });
    } catch (error: any) {
        console.error("assignVolunteer error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

/**
 * GET /api/matching/status/:donationId
 * Check the matching/assignment status of a donation.
 */
export const getMatchingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { donationId } = req.params;

        const donation = await FoodDonation.findById(donationId);
        if (!donation) {
            res.status(404).json({ message: "Donation not found" });
            return;
        }

        const task = await PickupTask.findOne({ donationId: donation._id })
            .populate("volunteerId", "name email")
            .sort({ createdAt: -1 });

        if (!task) {
            res.json({
                donationId,
                status: "unassigned",
                message: "No volunteer has been assigned yet",
            });
            return;
        }

        res.json({
            donationId,
            status: task.status,
            task,
        });
    } catch (error: any) {
        console.error("getMatchingStatus error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

/**
 * GET /api/matching/predictions
 * USER STORY 4.8 — Surplus and Demand Prediction
 */
export const getPredictions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Mocked prediction logic based on current system state
        const totalDonations = await FoodDonation.countDocuments();
        const activeVolunteers = await User.countDocuments({ role: 'volunteer', verified: true });

        // Simple heuristic: Predict surplus if donations > volunteers * factor
        const surplusRisk = totalDonations > (activeVolunteers * 2) ? "High" : "Low";

        // Mock historical trend
        const dailyTrend = [
            { day: "Mon", donations: 12, predicted: 15 },
            { day: "Tue", donations: 19, predicted: 18 },
            { day: "Wed", donations: 15, predicted: 20 },
            { day: "Thu", donations: 22, predicted: 22 },
            { day: "Fri", donations: 30, predicted: 28 }, // Peak weekend start
        ];

        res.json({
            surplusRisk,
            activeVolunteers,
            totalActiveDonations: totalDonations,
            recommendedVolunteerShiftIncrease: surplusRisk === "High" ? "20%" : "0%",
            dailyTrend,
            timestamp: new Date()
        });
    } catch (error: any) {
        console.error("getPredictions error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};
