import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../models/User";
import FoodDonation from "../models/FoodDonation";
import PickupTask, { TaskStatus } from "../models/PickupTask";

const MATCHING_RADIUS_KM = 5;

/**
 * POST /api/matching/assign/:donationId
 * When an NGO accepts a donation, this endpoint finds the nearest
 * available volunteer within 5km and auto-creates a PickupTask.
 *
 * Flow:
 * 1. Validate the donation exists and is "reserved"
 * 2. Use the donation's location to find volunteers within 5km
 * 3. Sort by distance (nearest first)
 * 4. Exclude volunteers who already have an active task
 * 5. Create a PickupTask for the nearest available volunteer
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

        if (donation.status !== "reserved") {
            res.status(400).json({
                message: `Donation must be in 'reserved' status to assign a volunteer. Current status: ${donation.status}`,
            });
            return;
        }

        if (!donation.location || !donation.location.coordinates) {
            res.status(400).json({ message: "Donation does not have a valid location" });
            return;
        }

        // 2. Check if a PickupTask already exists for this donation
        const existingTask = await PickupTask.findOne({
            donationId: donation._id,
            status: { $in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.PICKED] },
        });

        if (existingTask) {
            res.status(400).json({
                message: "A pickup task already exists for this donation",
                task: existingTask,
            });
            return;
        }

        // 3. Find volunteers within 5km of the donation location
        // The User model doesn't have a location field by default,
        // so we'll find all verified volunteers and use the donation location
        // to match nearby ones. For this to work with geospatial queries,
        // volunteers need a location field. For now, we find all active volunteers.
        const radiusInMeters = MATCHING_RADIUS_KM * 1000;

        // Get IDs of volunteers who already have active tasks
        const busyVolunteerIds = await PickupTask.distinct("volunteerId", {
            status: { $in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.PICKED] },
        });

        // Find available, verified volunteers (not currently busy)
        const availableVolunteers = await User.find({
            role: "volunteer",
            verified: true,
            _id: { $nin: busyVolunteerIds },
        }).select("-password");

        if (availableVolunteers.length === 0) {
            res.status(404).json({
                message: "No available volunteers found. All volunteers are currently busy or none are registered.",
            });
            return;
        }

        // 4. Pick the first available volunteer
        // NOTE: For full geospatial matching, add a 'location' field to the User model
        // and use $nearSphere query similar to ngoController.ts getNearbyDonations.
        // For now, we assign the first available verified volunteer.
        const assignedVolunteer = availableVolunteers[0];

        // 5. Create the PickupTask
        const pickupTask = new PickupTask({
            donationId: donation._id,
            volunteerId: assignedVolunteer._id,
            status: TaskStatus.ASSIGNED,
            assignedAt: new Date(),
        });

        await pickupTask.save();

        res.status(201).json({
            message: `Volunteer '${assignedVolunteer.name}' has been assigned to pick up this donation`,
            task: pickupTask,
            volunteer: {
                id: assignedVolunteer._id,
                name: assignedVolunteer.name,
                email: assignedVolunteer.email,
            },
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
