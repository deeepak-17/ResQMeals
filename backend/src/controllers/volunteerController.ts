import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import PickupTask, { TaskStatus } from '../models/PickupTask';
import FoodDonation from '../models/FoodDonation';
import User from '../models/User';
import { emitToRole, emitToUser } from '../utils/socketEvents';
import { updateVolunteerReliability, calculateBadge, calculateOnTimeRate } from '../utils/scoring';

// Get all tasks assigned to the logged-in volunteer
export const getMyTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const volunteerId = req.user?.id;
        console.log(`[Volunteer] Fetching tasks for ID: ${volunteerId}`);

        const tasks = await PickupTask.find({ volunteerId })
            .sort({ createdAt: -1 })
            .populate('donationId')
            .populate('ngoId', 'name email organizationType');

        console.log(`[Volunteer] Found ${tasks.length} tasks for user ${volunteerId}`);
        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tasks', error });
    }
};

// Accept a task
export const acceptTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const task = await PickupTask.findById(id);

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        if (task.status !== TaskStatus.ASSIGNED) {
            res.status(400).json({ message: 'Task cannot be accepted in its current state' });
            return;
        }

        const donation = await FoodDonation.findById(task.donationId);
        if (donation && donation.expiryTime && new Date(donation.expiryTime) < new Date()) {
            res.status(400).json({ message: 'User Story 3.7: Cannot accept expired donation' });
            return;
        }

        if (task.pickupWindowEnd && new Date(task.pickupWindowEnd) < new Date()) {
            res.status(400).json({ message: 'User Story 5.5: Time window for this pickup has expired' });
            return;
        }

        task.status = TaskStatus.ACCEPTED;
        // User Story 5.3: Chain-of-Custody Tracking
        task.history.push({
            status: TaskStatus.ACCEPTED,
            timestamp: new Date(),
            updatedBy: req.user?.id as any,
            note: "Task accepted by volunteer"
        });
        await task.save();

        // Notify NGOs that the volunteer accepted
        emitToRole('ngo', 'task:accepted', {
            taskId: task._id,
            volunteerId: req.user?.id,
            donationId: task.donationId,
        });

        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error accepting task', error });
    }
};

// Decline a task
export const declineTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const task = await PickupTask.findById(id);

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        if (![TaskStatus.ASSIGNED, TaskStatus.ACCEPTED].includes(task.status)) {
            res.status(400).json({ message: 'Task cannot be declined in its current state (already picked or delivered)' });
            return;
        }

        task.status = TaskStatus.DECLINED;
        // User Story 5.3: Chain-of-Custody Tracking
        task.history.push({
            status: TaskStatus.DECLINED,
            timestamp: new Date(),
            updatedBy: req.user?.id as any,
            note: "Task declined by volunteer"
        });
        await task.save();

        // User Story 5.4: Volunteer Reliability Scoring
        if (req.user?.id) {
            const volunteer = await User.findById(req.user.id);
            if (volunteer) {
                // If they decline, we don't naturally increment totalAssigned if it already was incremented at assignment.
                // But we should recalculate current reliability score.
                volunteer.reliabilityScore = updateVolunteerReliability(volunteer);
                await volunteer.save();
            }
        }

        // USER STORY 4.6 — Automatic Reassignment
        console.log(`[Volunteer] Task ${id} declined. Triggering automatic reassignment...`);

        const donation = await FoodDonation.findById(task.donationId);
        if (donation && donation.location?.coordinates) {
            // 1. Find ALL volunteers who declined this donation (including current one)
            const allDeclinedTasks = await PickupTask.find({
                donationId: task.donationId,
                status: TaskStatus.DECLINED,
            }).select("volunteerId");
            const excludeIds = allDeclinedTasks
                .map(t => t.volunteerId)
                .filter(Boolean);

            // 2. Find a new volunteer (same logic as ngoController.acceptDonation)
            const volunteerFilter: any = {
                role: "volunteer",
                verified: true,
                isAvailable: true,
            };
            if (excludeIds.length > 0) {
                volunteerFilter._id = { $nin: excludeIds };
            }

            const donationCoords = donation.location.coordinates;
            const nearbyCandidates = await User.find({
                ...volunteerFilter,
                location: {
                    $nearSphere: {
                        $geometry: { type: "Point", coordinates: donationCoords },
                        $maxDistance: 5000, // 5km
                    },
                },
            }).limit(10);

            // Always include all other available volunteers (even without location)
            const nearbyIds = nearbyCandidates.map(v => v._id.toString());
            const allCandidates = await User.find(volunteerFilter).select("-password");
            const otherCandidates = allCandidates.filter(
                v => !nearbyIds.includes(v._id.toString())
            );
            const candidates = [...nearbyCandidates, ...otherCandidates];

            if (candidates.length > 0) {
                // 3. Load balance: pick least busy, nearby preference, then reliability
                const scored = await Promise.all(candidates.map(async (v) => {
                    const activeTasks = await PickupTask.countDocuments({
                        volunteerId: v._id,
                        status: { $in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.PICKED] }
                    });
                    const isNearby = nearbyIds.includes(v._id.toString());
                    return { volunteer: v, activeTasks, reliability: v.reliabilityScore || 0, isNearby };
                }));
                scored.sort((a, b) => {
                    if (a.activeTasks !== b.activeTasks) return a.activeTasks - b.activeTasks;
                    if (a.isNearby !== b.isNearby) return a.isNearby ? -1 : 1;
                    return b.reliability - a.reliability;
                });
                const newVolunteer = scored[0].volunteer;

                // 4. Create new ASSIGNED task
                const newTask = new PickupTask({
                    donationId: donation._id,
                    volunteerId: newVolunteer._id,
                    ngoId: task.ngoId,
                    status: TaskStatus.ASSIGNED,
                    assignedAt: new Date(),
                    priority: task.priority || 'Normal',
                    history: [{
                        status: TaskStatus.ASSIGNED,
                        timestamp: new Date(),
                        updatedBy: req.user?.id as any,
                        note: `Reassigned to ${newVolunteer.name} after previous volunteer declined`
                    }]
                });
                await newTask.save();

                await User.findByIdAndUpdate(newVolunteer._id, {
                    $inc: { totalAssignedTasks: 1 }
                });

                emitToUser(newVolunteer._id.toString(), "task:assigned", {
                    taskId: newTask._id,
                    donationId: donation._id,
                });

                console.log(`[Reassignment] Task reassigned to volunteer: ${newVolunteer.name} (${newVolunteer.email})`);
            } else {
                // No volunteers available — create a PENDING task for the scheduler
                console.log('[Reassignment] No available volunteers. Creating PENDING task.');
                const pendingTask = new PickupTask({
                    donationId: donation._id,
                    volunteerId: undefined,
                    ngoId: task.ngoId,
                    status: TaskStatus.PENDING,
                    priority: task.priority || 'Normal',
                    history: [{
                        status: TaskStatus.PENDING,
                        timestamp: new Date(),
                        updatedBy: req.user?.id as any,
                        note: "All available volunteers declined. Queued as PENDING."
                    }]
                });
                await pendingTask.save();
            }

            // Notify admins about the reassignment
            emitToRole('admin', 'task:reassignment_needed', {
                taskId: task._id,
                donationId: task.donationId,
            });
        }

        res.status(200).json({ message: 'Task declined. Automatic reassignment triggered.', task });
    } catch (error) {
        res.status(500).json({ message: 'Error declining task', error });
    }
};

// Update task status (Picked / Delivered)
export const updateTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, feedback, rating } = req.body;

        if (![TaskStatus.PICKED, TaskStatus.DELIVERED].includes(status)) {
            res.status(400).json({ message: 'Invalid status update' });
            return;
        }

        const task = await PickupTask.findById(id);

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        // Update status and timestamps
        task.status = status;
        const now = new Date();

        // Find the donation to sync status
        const donation = await FoodDonation.findById(task.donationId);

        if (status === TaskStatus.PICKED) {
            task.pickedAt = now;
            if (task.pickupWindowEnd && now > new Date(task.pickupWindowEnd)) {
                task.missedPickup = true;
            }
            // User Story 5.3: Chain-of-Custody Tracking
            task.history.push({
                status: TaskStatus.PICKED,
                timestamp: now,
                updatedBy: req.user?.id as any,
                note: "Food picked up from donor"
            });

            // Sync with Donation model for the "Donation Journey" timeline
            if (donation) {
                donation.status = "collected";
                donation.collectedAt = now;
                await donation.save();
            }
        } else if (status === TaskStatus.DELIVERED) {
            task.deliveredAt = now;
            if (feedback) task.feedback = feedback;
            if (rating) task.rating = rating;

            // User Story 5.3: Chain-of-Custody Tracking
            task.history.push({
                status: TaskStatus.DELIVERED,
                timestamp: now,
                updatedBy: req.user?.id as any,
                note: `Food delivered to NGO. User Story 5.8 feedback: ${feedback || 'None'}`
            });

            // Ensure donation is marked as collected if it wasn't already
            if (donation && donation.status !== 'collected') {
                donation.status = "collected";
                donation.collectedAt = donation.collectedAt || now;
                await donation.save();
            }
        }

        await task.save();

        // Emit real-time events for status updates
        if (status === TaskStatus.DELIVERED) {
            // Notify donor and NGOs about completed delivery
            const donation = await FoodDonation.findById(task.donationId);
            if (donation) {
                emitToUser(donation.donorId.toString(), 'delivery:complete', {
                    taskId: task._id,
                    donationId: task.donationId,
                });
            }
            emitToRole('ngo', 'delivery:complete', {
                taskId: task._id,
                donationId: task.donationId,
            });

            // Trigger reassignment check for this volunteer
            // They are now free!
            if (req.user?.id) {
                // USER STORY 3.8 — Award 10 sustainability credits and update performance
                // USER STORY 5.4 — Reliability update
                const volunteer = await User.findById(req.user.id);
                if (volunteer) {
                    volunteer.sustainabilityCredits += 10;
                    volunteer.totalDeliveries += 1;
                    volunteer.totalDistance += 5; // Sim

                    // US 5.4 & V6 implementation
                    volunteer.completedTasks += 1;
                    volunteer.reliabilityScore = updateVolunteerReliability(volunteer);

                    if (task.missedPickup) {
                        volunteer.latePickups = (volunteer.latePickups || 0) + 1;
                    } else {
                        volunteer.onTimePickups = (volunteer.onTimePickups || 0) + 1;
                    }

                    if (task.assignedAt && task.deliveredAt) {
                        const deliveryMin = (task.deliveredAt.getTime() - task.assignedAt.getTime()) / 60000;
                        const prevTotal = (volunteer.averageDeliveryTimeMin || 0) * (volunteer.totalDeliveries - 1);
                        volunteer.averageDeliveryTimeMin = Math.round((prevTotal + deliveryMin) / volunteer.totalDeliveries);
                    }

                    await volunteer.save();
                }

                try {
                    await checkAndAssignPendingTasks(req.user.id);
                } catch (err) {
                    console.error("Error assigning pending tasks:", err);
                }
            }
        }

        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task status', error });
    }
};

// Toggle volunteer availability
export const toggleAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { isAvailable } = req.body;
        const volunteerId = req.user?.id;

        if (!volunteerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const user = await User.findByIdAndUpdate(
            volunteerId,
            { isAvailable },
            { new: true }
        );

        if (!user) {
            res.status(404).json({ message: 'Volunteer not found' });
            return;
        }

        if (isAvailable) {
            try {
                await checkAndAssignPendingTasks(volunteerId);
            } catch (err) {
                console.error("Error assigning pending tasks on toggle:", err);
            }
        }

        res.status(200).json({
            message: `Availability status updated to ${isAvailable ? 'Online' : 'Offline'}`,
            isAvailable: user.isAvailable
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating availability', error });
    }
};

// Update volunteer location
export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { lng, lat, address } = req.body;
        const volunteerId = req.user?.id;

        if (!volunteerId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const user = await User.findByIdAndUpdate(
            volunteerId,
            {
                location: {
                    type: 'Point',
                    coordinates: [lng, lat],
                    address
                }
            },
            { new: true }
        );

        res.status(200).json({ message: 'Location updated', location: user?.location });
    } catch (error) {
        res.status(500).json({ message: 'Error updating location', error });
    }
};

const checkAndAssignPendingTasks = async (volunteerId: string) => {
    console.log(`[Scheduler] Checking pending tasks for volunteer ${volunteerId}...`);

    // 1. Double check: Is this volunteer actually free?
    const busyTasks = await PickupTask.countDocuments({
        volunteerId,
        status: { $in: [TaskStatus.ASSIGNED, TaskStatus.ACCEPTED, TaskStatus.PICKED] }
    });

    if (busyTasks > 0) {
        console.log(`[Scheduler] Volunteer ${volunteerId} is still busy.`);
        return;
    }

    // 2. Get volunteer's location
    const volunteer = await User.findById(volunteerId);
    if (!volunteer || !volunteer.location || !volunteer.location.coordinates) {
        console.log(`[Scheduler] Volunteer ${volunteerId} has no location set. Skipping automatic assignment.`);
        return;
    }

    const [vLng, vLat] = volunteer.location.coordinates;

    // 3. Find nearby donations that have PENDING tasks
    // We'll use aggregation to join PickupTask with FoodDonations and filter by distance
    const assignmentMatch = await PickupTask.aggregate([
        { $match: { status: TaskStatus.PENDING } },
        {
            $lookup: {
                from: 'fooddonations',
                localField: 'donationId',
                foreignField: '_id',
                as: 'donation'
            }
        },
        { $unwind: '$donation' },
        {
            $match: {
                'donation.location': {
                    $nearSphere: {
                        $geometry: { type: 'Point', coordinates: [vLng, vLat] },
                        $maxDistance: 10000 // 10km radius
                    }
                }
            }
        },
        { $sort: { createdAt: 1 } }, // Oldest first among those nearby
        { $limit: 1 }
    ]);

    if (!assignmentMatch || assignmentMatch.length === 0) {
        console.log(`[Scheduler] No nearby pending tasks found for volunteer ${volunteerId}.`);
        return;
    }

    const taskToAssign = await PickupTask.findById(assignmentMatch[0]._id);
    if (!taskToAssign) return;

    // 4. Assign it
    taskToAssign.volunteerId = volunteerId as any;
    taskToAssign.status = TaskStatus.ASSIGNED;
    taskToAssign.assignedAt = new Date();
    // User Story 5.3: Chain-of-Custody Tracking
    taskToAssign.history.push({
        status: TaskStatus.ASSIGNED,
        timestamp: new Date(),
        updatedBy: volunteerId as any,
        note: `Task assigned automatically by scheduler to volunteer`
    });
    await taskToAssign.save();

    // User Story 5.4: Volunteer Reliability Scoring
    if (volunteer) {
        volunteer.totalAssignedTasks += 1;
        volunteer.reliabilityScore = updateVolunteerReliability(volunteer);
        await volunteer.save();
    }

    // 5. Notify
    emitToUser(volunteerId.toString(), "task:assigned", {
        taskId: taskToAssign._id,
        donationId: taskToAssign.donationId,
    });

    console.log(`[Scheduler] Assigned nearby task ${taskToAssign._id} to volunteer ${volunteerId}`);
};

// User Story V1: Get available tasks based on location
export const getAvailableTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { lat, lng, radiusKm = 10 } = req.query;
        if (!lat || !lng) {
            res.status(400).json({ message: 'Latitude and longitude are required' });
            return;
        }

        const vLng = parseFloat(lng as string);
        const vLat = parseFloat(lat as string);
        const maxDist = parseFloat(radiusKm as string) * 1000;

        const tasks = await PickupTask.aggregate([
            { $match: { status: TaskStatus.PENDING } },
            {
                $lookup: {
                    from: 'fooddonations',
                    localField: 'donationId',
                    foreignField: '_id',
                    as: 'donation'
                }
            },
            { $unwind: '$donation' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'ngoId',
                    foreignField: '_id',
                    as: 'ngo'
                }
            },
            { $unwind: { path: '$ngo', preserveNullAndEmptyArrays: true } },
            {
                $match: {
                    'donation.location': {
                        $nearSphere: {
                            $geometry: { type: 'Point', coordinates: [vLng, vLat] },
                            $maxDistance: maxDist
                        }
                    },
                    'donation.expiryTime': { $gt: new Date() } // exclude expired
                }
            },
            { $sort: { priority: -1, createdAt: 1 } }
        ]);

        const formattedTasks = tasks.map(t => ({
            ...t,
            donationId: t.donation,
            ngoId: { _id: t.ngo?._id, name: t.ngo?.name, address: t.ngo?.location?.address || t.ngo?.address }
        }));

        res.status(200).json(formattedTasks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching available tasks', error });
    }
};

// User Story V2: Real-time tracking Update
export const updateLiveLocation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { lat, lng } = req.body;

        if (!lat || !lng) {
            res.status(400).json({ message: 'Latitude and longitude are required' });
            return;
        }

        const task = await PickupTask.findById(id);
        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        task.liveLocation = {
            coordinates: [lng, lat],
            updatedAt: new Date()
        };
        await task.save();

        const donation = await FoodDonation.findById(task.donationId);
        if (donation) {
            emitToUser(donation.donorId.toString(), 'task:location_update', {
                taskId: task._id,
                location: task.liveLocation
            });
        }
        emitToUser(task.ngoId.toString(), 'task:location_update', {
            taskId: task._id,
            location: task.liveLocation
        });

        res.status(200).json({ message: 'Live location updated', liveLocation: task.liveLocation });
    } catch (error) {
        res.status(500).json({ message: 'Error updating live location', error });
    }
};

// User Story V4: Emergency reassignment
export const triggerEmergencyReassign = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const task = await PickupTask.findById(id);

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        task.isEmergency = true;
        task.emergencyAt = new Date();
        task.priority = 'High';

        // Remove volunteer if assigned/accepted
        if (task.status === TaskStatus.ASSIGNED || task.status === TaskStatus.ACCEPTED) {
            task.volunteerId = undefined;
            task.status = TaskStatus.PENDING;
            task.history.push({
                status: TaskStatus.PENDING,
                timestamp: new Date(),
                updatedBy: req.user?.id as any,
                note: 'Task marked as emergency and unassigned.'
            });
        }

        await task.save();

        emitToRole('volunteer', 'task:emergency', {
            taskId: task._id,
            donationId: task.donationId,
            message: 'Emergency reassignment needed for high-priority task!'
        });

        res.status(200).json({ message: 'Emergency reassignment triggered', task });
    } catch (error) {
        res.status(500).json({ message: 'Error triggering emergency', error });
    }
};

// User Story V6: Performance tracking
export const getMyPerformanceStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const volunteerId = req.user?.id;
        const user = await User.findById(volunteerId);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const stats = {
            reliabilityScore: user.reliabilityScore || 100,
            onTimeRate: calculateOnTimeRate(user),
            totalDeliveries: user.totalDeliveries || 0,
            totalDistance: user.totalDistance || 0,
            averageRating: user.averageRating || 5,
            badge: calculateBadge(user),
            onTimePickups: user.onTimePickups || 0,
            latePickups: user.latePickups || 0,
            averageDeliveryTimeMin: user.averageDeliveryTimeMin || 0
        };

        const recentTasks = await PickupTask.find({
            volunteerId,
            status: { $in: [TaskStatus.DELIVERED, TaskStatus.DECLINED, TaskStatus.PICKED] }
        })
            .sort({ updatedAt: -1 })
            .limit(7)
            .populate('donationId', 'title')
            .populate('ngoId', 'name');

        res.status(200).json({ stats, recentTasks });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching performance stats', error });
    }
};
