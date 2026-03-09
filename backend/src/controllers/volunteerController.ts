import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import PickupTask, { TaskStatus } from '../models/PickupTask';
import FoodDonation from '../models/FoodDonation';
import User from '../models/User';
import { emitToRole, emitToUser } from '../utils/socketEvents';

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

        task.status = TaskStatus.ACCEPTED;
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
        await task.save();

        // USER STORY 4.6 — Automatic Reassignment
        console.log(`[Volunteer] Task ${id} declined. Triggering automatic reassignment...`);

        // To reassign, we mark the donation as 'reserved' again (so it's available for matching)
        // and delete the declined task (or keep it as history, but we need a new assignment)
        const donation = await FoodDonation.findById(task.donationId);
        if (donation) {
            // Re-emit for matching logic
            emitToRole('admin', 'task:reassignment_needed', {
                taskId: task._id,
                donationId: task.donationId,
            });

            // We can also just set a small timeout and trigger the assignment logic
            // For now, let's reset the donation status to 'reserved' if no one else is assigned
            // so the NGO dashboard or scheduler can pick it up.
            donation.status = "reserved";
            await donation.save();
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
        if (status === TaskStatus.PICKED) {
            task.pickedAt = new Date();
        } else if (status === TaskStatus.DELIVERED) {
            task.deliveredAt = new Date();
            if (feedback) task.feedback = feedback;
            if (rating) task.rating = rating;
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
                await User.findByIdAndUpdate(req.user.id, {
                    $inc: {
                        sustainabilityCredits: 10,
                        totalDeliveries: 1,
                        totalDistance: 5 // Simulated 5km per delivery
                    }
                });

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
    await taskToAssign.save();

    // 5. Notify
    emitToUser(volunteerId.toString(), "task:assigned", {
        taskId: taskToAssign._id,
        donationId: taskToAssign.donationId,
    });

    console.log(`[Scheduler] Assigned nearby task ${taskToAssign._id} to volunteer ${volunteerId}`);
};
