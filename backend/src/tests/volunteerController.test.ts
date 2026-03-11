import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getMyTasks, acceptTask, declineTask, updateTaskStatus } from '../controllers/volunteerController';
import PickupTask, { TaskStatus } from '../models/PickupTask';

// Mock the PickupTask model
jest.mock('../models/PickupTask');

describe('Volunteer Controller', () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    // ─── getMyTasks ────────────────────────────────────────────
    describe('getMyTasks', () => {
        it('should return tasks for authenticated volunteer', async () => {
            const mockReq = {
                user: { id: 'vol123' },
            } as unknown as AuthRequest;

            const tasks = [
                { _id: 't1', volunteerId: 'vol123', status: TaskStatus.ASSIGNED },
                { _id: 't2', volunteerId: 'vol123', status: TaskStatus.ACCEPTED },
            ];

            (PickupTask.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(tasks),
                }),
            });

            await getMyTasks(mockReq, mockRes as Response);

            expect(PickupTask.find).toHaveBeenCalledWith({ volunteerId: 'vol123' });
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(tasks);
        });

        it('should return 500 on server error', async () => {
            const mockReq = { user: { id: 'vol123' } } as unknown as AuthRequest;

            (PickupTask.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockRejectedValue(new Error('DB Error')),
                }),
            });

            await getMyTasks(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    // ─── acceptTask ────────────────────────────────────────────
    describe('acceptTask', () => {
        it('should accept a task with ASSIGNED status', async () => {
            const mockReq = {
                params: { id: 'task1' },
            } as unknown as AuthRequest;

            const task = {
                _id: 'task1',
                status: TaskStatus.ASSIGNED,
                save: jest.fn().mockResolvedValue(true),
            };
            (PickupTask.findById as jest.Mock).mockResolvedValue(task);

            await acceptTask(mockReq, mockRes as Response);

            expect(task.status).toBe(TaskStatus.ACCEPTED);
            expect(task.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should return 404 if task not found', async () => {
            const mockReq = { params: { id: 'nonexistent' } } as unknown as AuthRequest;
            (PickupTask.findById as jest.Mock).mockResolvedValue(null);

            await acceptTask(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task not found' });
        });

        it('should return 400 if task is not in ASSIGNED status', async () => {
            const mockReq = { params: { id: 'task1' } } as unknown as AuthRequest;
            const task = { _id: 'task1', status: TaskStatus.ACCEPTED };
            (PickupTask.findById as jest.Mock).mockResolvedValue(task);

            await acceptTask(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Task cannot be accepted in its current state',
            });
        });

        it('should return 500 on server error', async () => {
            const mockReq = { params: { id: 'task1' } } as unknown as AuthRequest;
            (PickupTask.findById as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await acceptTask(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    // ─── declineTask ────────────────────────────────────────────
    describe('declineTask', () => {
        it('should decline a task with ASSIGNED status', async () => {
            const mockReq = { params: { id: 'task1' } } as unknown as AuthRequest;

            const task = {
                _id: 'task1',
                status: TaskStatus.ASSIGNED,
                save: jest.fn().mockResolvedValue(true),
            };
            (PickupTask.findById as jest.Mock).mockResolvedValue(task);

            await declineTask(mockReq, mockRes as Response);

            expect(task.status).toBe(TaskStatus.DECLINED);
            expect(task.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should return 404 if task not found', async () => {
            const mockReq = { params: { id: 'nonexistent' } } as unknown as AuthRequest;
            (PickupTask.findById as jest.Mock).mockResolvedValue(null);

            await declineTask(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 if task is not in ASSIGNED status', async () => {
            const mockReq = { params: { id: 'task1' } } as unknown as AuthRequest;
            const task = { _id: 'task1', status: TaskStatus.DELIVERED };
            (PickupTask.findById as jest.Mock).mockResolvedValue(task);

            await declineTask(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });

    // ─── updateTaskStatus ────────────────────────────────────────────
    describe('updateTaskStatus', () => {
        it('should update task to PICKED status', async () => {
            const mockReq = {
                params: { id: 'task1' },
                body: { status: TaskStatus.PICKED },
            } as unknown as AuthRequest;

            const task = {
                _id: 'task1',
                status: TaskStatus.ACCEPTED,
                save: jest.fn().mockResolvedValue(true),
                pickedAt: undefined as Date | undefined,
                deliveredAt: undefined as Date | undefined,
            };
            (PickupTask.findById as jest.Mock).mockResolvedValue(task);

            await updateTaskStatus(mockReq, mockRes as Response);

            expect(task.status).toBe(TaskStatus.PICKED);
            expect(task.pickedAt).toBeDefined();
            expect(task.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should update task to DELIVERED status', async () => {
            const mockReq = {
                params: { id: 'task1' },
                body: { status: TaskStatus.DELIVERED },
            } as unknown as AuthRequest;

            const task = {
                _id: 'task1',
                status: TaskStatus.PICKED,
                save: jest.fn().mockResolvedValue(true),
                pickedAt: undefined as Date | undefined,
                deliveredAt: undefined as Date | undefined,
            };
            (PickupTask.findById as jest.Mock).mockResolvedValue(task);

            await updateTaskStatus(mockReq, mockRes as Response);

            expect(task.status).toBe(TaskStatus.DELIVERED);
            expect(task.deliveredAt).toBeDefined();
            expect(task.save).toHaveBeenCalled();
        });

        it('should return 400 for invalid status', async () => {
            const mockReq = {
                params: { id: 'task1' },
                body: { status: 'invalid-status' },
            } as unknown as AuthRequest;

            await updateTaskStatus(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid status update' });
        });

        it('should return 404 if task not found', async () => {
            const mockReq = {
                params: { id: 'nonexistent' },
                body: { status: TaskStatus.PICKED },
            } as unknown as AuthRequest;

            (PickupTask.findById as jest.Mock).mockResolvedValue(null);

            await updateTaskStatus(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 on server error', async () => {
            const mockReq = {
                params: { id: 'task1' },
                body: { status: TaskStatus.PICKED },
            } as unknown as AuthRequest;

            (PickupTask.findById as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await updateTaskStatus(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        it('should reject ASSIGNED status as an update', async () => {
            const mockReq = {
                params: { id: 'task1' },
                body: { status: TaskStatus.ASSIGNED },
            } as unknown as AuthRequest;

            await updateTaskStatus(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });
});
