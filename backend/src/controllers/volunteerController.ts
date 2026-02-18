import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import PickupTask, { TaskStatus } from '../models/PickupTask';
import FoodDonation from '../models/FoodDonation';
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

        if (task.status !== TaskStatus.ASSIGNED) {
            res.status(400).json({ message: 'Task cannot be declined in its current state' });
            return;
        }

        task.status = TaskStatus.DECLINED;
        await task.save();

        // Notify NGOs that the volunteer declined
        emitToRole('ngo', 'task:declined', {
            taskId: task._id,
            volunteerId: req.user?.id,
            donationId: task.donationId,
        });

        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error declining task', error });
    }
};

// Update task status (Picked / Delivered)
export const updateTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

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

// Internal helper to assign pending tasks to a specific volunteer
// This is called when a volunteer becomes free (DELIVERED/DECLINED)
// or can be called periodically
import User from '../models/User';

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

    // 2. Find oldest PENDING task
    const pendingTask = await PickupTask.findOne({ status: TaskStatus.PENDING })
        .sort({ createdAt: 1 }); // Oldest first

    if (!pendingTask) {
        console.log(`[Scheduler] No pending tasks found.`);
        return;
    }

    // 3. Assign it
    pendingTask.volunteerId = volunteerId as any; // Cast as any to avoid Type mismatch with Mongoose objectId vs string 
    pendingTask.status = TaskStatus.ASSIGNED;
    pendingTask.assignedAt = new Date();
    await pendingTask.save();

    // 4. Notify
    emitToUser(volunteerId.toString(), "task:assigned", {
        taskId: pendingTask._id,
        donationId: pendingTask.donationId,
    });

    console.log(`[Scheduler] Assigned PENDING task ${pendingTask._id} to volunteer ${volunteerId}`);
};
