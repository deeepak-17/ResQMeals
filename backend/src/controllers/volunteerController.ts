import { Request, Response } from 'express';
import PickupTask, { TaskStatus } from '../models/PickupTask';
import { AuthRequest } from '../middleware/auth';

// Get all tasks assigned to the logged-in volunteer
export const getMyTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Fix: Use 'id' from JwtPayload, not 'userId'
        const volunteerId = req.user?.id;

        if (!volunteerId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // In a real app, we would populate donation details
        // using .populate('donationId') if the FoodDonation model existed
        const tasks = await PickupTask.find({ volunteerId })
            .sort({ createdAt: -1 })
            .populate('donationId');

        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tasks', error });
    }
};

// Accept a task
export const acceptTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const volunteerId = req.user?.id;

        if (!volunteerId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const task = await PickupTask.findById(id);

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        // Verify ownership (or if accepting a new task, ensure it is unassigned - logic depends on requirements)
        // Assuming 'acceptTask' means "I accept this assigned task" or "I claim this open task"
        // If it was pre-assigned:
        if (task.volunteerId && task.volunteerId.toString() !== volunteerId) {
            res.status(403).json({ message: 'Not authorized for this task' });
            return;
        }
        // If logic is "Claim open task", we would set volunteerId here.
        // Based on existing code `find({ volunteerId })` in getMyTasks, it seems tasks are pre-assigned?
        // Let's assume strict ownership for safety as requested.

        if (task.status !== TaskStatus.ASSIGNED) {
            res.status(400).json({ message: 'Task cannot be accepted in its current state' });
            return;
        }

        task.status = TaskStatus.ACCEPTED;
        await task.save();

        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error accepting task', error });
    }
};

// Decline a task
export const declineTask = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const volunteerId = req.user?.id;

        if (!volunteerId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const task = await PickupTask.findOne({ _id: id, volunteerId });

        if (!task) {
            res.status(404).json({ message: 'Task not found or unauthorized' });
            return;
        }

        if (task.status !== TaskStatus.ASSIGNED) {
            res.status(400).json({ message: 'Task cannot be declined in its current state' });
            return;
        }

        task.status = TaskStatus.DECLINED;
        await task.save();

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
        const volunteerId = req.user?.id;

        if (!volunteerId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (![TaskStatus.PICKED, TaskStatus.DELIVERED].includes(status)) {
            res.status(400).json({ message: 'Invalid status update' });
            return;
        }

        const task = await PickupTask.findOne({ _id: id, volunteerId });

        if (!task) {
            res.status(404).json({ message: 'Task not found or unauthorized' });
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

        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task status', error });
    }
};
