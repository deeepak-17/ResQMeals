import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getMyTasks, acceptTask, declineTask, updateTaskStatus } from '../controllers/volunteerController';
import PickupTask, { TaskStatus } from '../models/PickupTask';
import FoodDonation from '../models/FoodDonation';
import User from '../models/User';

// Mock all dependencies
jest.mock('../models/PickupTask');
jest.mock('../models/FoodDonation');
jest.mock('../models/User');
jest.mock('../utils/socketEvents', () => ({
    emitToUser: jest.fn(),
    emitToRole: jest.fn(),
}));
jest.mock('../utils/scoring', () => ({
    updateVolunteerReliability: jest.fn().mockReturnValue(0.9),
}));

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

            // Controller chain: .sort().populate('donationId').populate('ngoId', ...)
            (PickupTask.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockResolvedValue(tasks),
                    }),
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
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockRejectedValue(new Error('DB Error')),
                    }),
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
                user: { id: 'vol123' },
            } as unknown as AuthRequest;

            const task = {
                _id: 'task1',
                status: TaskStatus.ASSIGNED,
                donationId: 'donation1',
                history: [],
                save: jest.fn().mockResolvedValue(true),
            };
            (PickupTask.findById as jest.Mock).mockResolvedValue(task);

            // acceptTask checks if donation is expired
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                expiryTime: new Date(Date.now() + 3600000), // 1 hour from now
            });

            await acceptTask(mockReq, mockRes as Response);

            expect(task.status).toBe(TaskStatus.ACCEPTED);
            expect(task.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should return 404 if task not found', async () => {
            const mockReq = { params: { id: 'nonexistent' }, user: { id: 'vol123' } } as unknown as AuthRequest;
            (PickupTask.findById as jest.Mock).mockResolvedValue(null);

            await acceptTask(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task not found' });
        });

        it('should return 400 if task is not in ASSIGNED status', async () => {
            const mockReq = { params: { id: 'task1' }, user: { id: 'vol123' } } as unknown as AuthRequest;
            const task = { _id: 'task1', status: TaskStatus.ACCEPTED, history: [] };
            (PickupTask.findById as jest.Mock).mockResolvedValue(task);

            await acceptTask(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Task cannot be accepted in its current state',
            });
        });

        it('should return 500 on server error', async () => {
            const mockReq = { params: { id: 'task1' }, user: { id: 'vol123' } } as unknown as AuthRequest;
            (PickupTask.findById as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await acceptTask(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    // ─── declineTask ────────────────────────────────────────────
    describe('declineTask', () => {
        it('should decline a task with ASSIGNED status', async () => {
            const mockReq = {
                params: { id: 'task1' },
                user: { id: 'vol123' },
            } as unknown as AuthRequest;

            const task = {
                _id: 'task1',
                donationId: 'donation1',
                ngoId: 'ngo1',
                status: TaskStatus.ASSIGNED,
                priority: 'Normal',
                history: [],
                save: jest.fn().mockResolvedValue(true),
            };
            (PickupTask.findById as jest.Mock).mockResolvedValue(task);

            // declineTask calls User.findById for reliability scoring
            (User.findById as jest.Mock).mockResolvedValue({
                _id: 'vol123',
                reliabilityScore: 0.8,
                save: jest.fn(),
            });

            // declineTask calls FoodDonation.findById for reassignment
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'reserved',
                location: { type: 'Point', coordinates: [80.2, 13.0] },
            });

            // Reassignment: find declined tasks for this donation
            (PickupTask.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue([{ volunteerId: 'vol123' }]),
            });

            // Reassignment: no other volunteers available → PENDING task
            (User.find as jest.Mock).mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
                select: jest.fn().mockResolvedValue([]),
            });

            // Mock PickupTask constructor for the new PENDING task
            const mockNewSave = jest.fn().mockResolvedValue(true);
            (PickupTask as any).mockImplementation(() => ({
                save: mockNewSave,
                _id: 'newTask1',
            }));

            await declineTask(mockReq, mockRes as Response);

            expect(task.status).toBe(TaskStatus.DECLINED);
            expect(task.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should return 404 if task not found', async () => {
            const mockReq = { params: { id: 'nonexistent' }, user: { id: 'vol123' } } as unknown as AuthRequest;
            (PickupTask.findById as jest.Mock).mockResolvedValue(null);

            await declineTask(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 if task is not in ASSIGNED status', async () => {
            const mockReq = { params: { id: 'task1' }, user: { id: 'vol123' } } as unknown as AuthRequest;
            const task = { _id: 'task1', status: TaskStatus.DELIVERED, history: [] };
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
                user: { id: 'vol123' },
            } as unknown as AuthRequest;

            const task = {
                _id: 'task1',
                status: TaskStatus.ACCEPTED,
                donationId: 'donation1',
                history: [],
                save: jest.fn().mockResolvedValue(true),
                pickedAt: undefined as Date | undefined,
                deliveredAt: undefined as Date | undefined,
            };
            (PickupTask.findById as jest.Mock).mockResolvedValue(task);
            (PickupTask.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue([]),
            });
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'reserved',
                save: jest.fn().mockResolvedValue(true),
            });

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
                user: { id: 'vol123' },
            } as unknown as AuthRequest;

            const task = {
                _id: 'task1',
                status: TaskStatus.PICKED,
                donationId: 'donation1',
                volunteerId: 'vol123',
                history: [],
                save: jest.fn().mockResolvedValue(true),
                pickedAt: undefined as Date | undefined,
                deliveredAt: undefined as Date | undefined,
            };
            (PickupTask.findById as jest.Mock).mockResolvedValue(task);
            (PickupTask.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue([]),
            });
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'collected',
                donorId: 'donor123',
                save: jest.fn().mockResolvedValue(true),
            });

            // updateTaskStatus (DELIVERED) calls FoodDonation.findByIdAndUpdate
            (FoodDonation.findByIdAndUpdate as jest.Mock).mockResolvedValue({ status: 'delivered' });

            // updateTaskStatus calls User.findById for reliability scoring
            (User.findById as jest.Mock).mockResolvedValue({
                _id: 'vol123',
                reliabilityScore: 0.8,
                totalCompletedTasks: 0,
                save: jest.fn() as jest.Mock,
            } as any);

            await updateTaskStatus(mockReq, mockRes as Response);

            expect(task.status).toBe(TaskStatus.DELIVERED);
            expect(task.deliveredAt).toBeDefined();
            expect(task.save).toHaveBeenCalled();
        });

        it('should return 400 for invalid status', async () => {
            const mockReq = {
                params: { id: 'task1' },
                body: { status: 'invalid-status' },
                user: { id: 'vol123' },
            } as unknown as AuthRequest;

            await updateTaskStatus(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid status update' });
        });

        it('should return 404 if task not found', async () => {
            const mockReq = {
                params: { id: 'nonexistent' },
                body: { status: TaskStatus.PICKED },
                user: { id: 'vol123' },
            } as unknown as AuthRequest;

            (PickupTask.findById as jest.Mock).mockResolvedValue(null);

            await updateTaskStatus(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 on server error', async () => {
            const mockReq = {
                params: { id: 'task1' },
                body: { status: TaskStatus.PICKED },
                user: { id: 'vol123' },
            } as unknown as AuthRequest;

            (PickupTask.findById as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await updateTaskStatus(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        it('should reject ASSIGNED status as an update', async () => {
            const mockReq = {
                params: { id: 'task1' },
                body: { status: TaskStatus.ASSIGNED },
                user: { id: 'vol123' },
            } as unknown as AuthRequest;

            await updateTaskStatus(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });
});
