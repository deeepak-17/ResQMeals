import { Response } from 'express';
import PickupTask, { TaskStatus } from '../models/PickupTask';
import { AuthRequest } from '../middleware/auth';

// Get all tasks assigned to the logged-in volunteer
export const getMyTasks = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const volunteerId = req.user?.id;

        if (!volunteerId) {
            res.status(401).json({ message: 'Unauthorized: User ID required' });
            return;
        }

        // In a real app, we would populate donation details
        // using .populate('donationId') if the FoodDonation model existed
        // @ts-ignore - bypassing strict type check for now, can be fixed by typing the filter properly
        const tasks = await PickupTask.find({ volunteerId })
            .sort({ createdAt: -1 })
            .populate('donationId');

        res.status(200).json(tasks);
    } catch (error) {
        console.error("getMyTasks error:", error);
        res.status(500).json({ message: 'Error fetching tasks' });
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

        // Enforce authorization
        if (task.volunteerId.toString() !== req.user?.id) {
            res.status(403).json({ message: 'Unauthorized: You are not assigned to this task' });
            return;
        }

        if (task.status !== TaskStatus.ASSIGNED) {
            res.status(400).json({ message: 'Task cannot be accepted in its current state' });
            return;
        }

        task.status = TaskStatus.ACCEPTED;
        await task.save();

        res.status(200).json(task);
    } catch (error) {
        console.error("acceptTask error:", error);
        res.status(500).json({ message: 'Error accepting task' });
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

        // Enforce authorization
        if (task.volunteerId.toString() !== req.user?.id) {
            res.status(403).json({ message: 'Unauthorized: You are not assigned to this task' });
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
        console.error("declineTask error:", error);
        res.status(500).json({ message: 'Error declining task' });
    }
};

// Allowed transitions map
const allowedTransitions: Record<string, TaskStatus[]> = {
    [TaskStatus.ACCEPTED]: [TaskStatus.PICKED],
    [TaskStatus.PICKED]: [TaskStatus.DELIVERED]
};

// Update task status (Picked / Delivered)
export const updateTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const task = await PickupTask.findById(id);

        if (!task) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        // Enforce authorization
        if (task.volunteerId.toString() !== req.user?.id) {
            res.status(403).json({ message: 'Unauthorized: You are not assigned to this task' });
            return;
        }

        // Validate state transition
        const currentStatus = task.status;
        const allowed = allowedTransitions[currentStatus] || [];

        if (!allowed.includes(status)) {
            res.status(400).json({
                message: `Invalid status transition from ${currentStatus} to ${status}`
            });
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
        console.error("updateTaskStatus error:", error);
        res.status(500).json({ message: 'Error updating task status' });
    }
};
