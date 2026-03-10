import request from 'supertest';
import express from 'express';
import * as volunteerController from '../controllers/volunteerController';
import PickupTask, { TaskStatus } from '../models/PickupTask';
import FoodDonation from '../models/FoodDonation';
import User from '../models/User';
import * as socketEvents from '../utils/socketEvents';

// Mock the models and utils
jest.mock('../models/PickupTask');
jest.mock('../models/FoodDonation');
jest.mock('../models/User');
jest.mock('../utils/socketEvents');
jest.mock('../utils/scoring', () => ({
    updateVolunteerReliability: jest.fn().mockReturnValue(1.0),
}));

const app = express();
app.use(express.json());

// Mock Auth Middleware
const mockAuth = (req: any, res: any, next: any) => {
    req.user = { id: 'volunteer123', role: 'volunteer' };
    next();
};

app.get('/api/volunteer/tasks', mockAuth, volunteerController.getMyTasks);
app.post('/api/volunteer/tasks/:id/accept', mockAuth, volunteerController.acceptTask);
app.post('/api/volunteer/tasks/:id/decline', mockAuth, volunteerController.declineTask);
app.patch('/api/volunteer/tasks/:id/status', mockAuth, volunteerController.updateTaskStatus);

describe('Volunteer Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getMyTasks', () => {
        it('should return tasks for the logged-in volunteer', async () => {
            const mockTasks = [{ _id: 'task1', status: TaskStatus.ASSIGNED }];
            (PickupTask.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockResolvedValue(mockTasks)
                    })
                })
            });

            const response = await request(app).get('/api/volunteer/tasks');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockTasks);
            expect(PickupTask.find).toHaveBeenCalledWith({ volunteerId: 'volunteer123' });
        });

        it('should return 500 on database error', async () => {
            (PickupTask.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        populate: jest.fn().mockRejectedValue(new Error('DB Error'))
                    })
                })
            });

            const response = await request(app).get('/api/volunteer/tasks');
            expect(response.status).toBe(500);
        });
    });

    describe('acceptTask', () => {
        it('should accept an assigned task', async () => {
            const mockTask = {
                _id: 'task1',
                status: TaskStatus.ASSIGNED,
                donationId: 'donation1',
                history: [],
                save: jest.fn().mockResolvedValue(true)
            };
            (PickupTask.findById as jest.Mock).mockResolvedValue(mockTask);
            // FoodDonation.findById returns null = no expiry check needed
            (FoodDonation.findById as jest.Mock).mockResolvedValue(null);

            const response = await request(app).post('/api/volunteer/tasks/task1/accept');

            expect(response.status).toBe(200);
            expect(mockTask.status).toBe(TaskStatus.ACCEPTED);
            expect(mockTask.save).toHaveBeenCalled();
            expect(socketEvents.emitToRole).toHaveBeenCalledWith('ngo', 'task:accepted', expect.any(Object));
        });

        it('should return 404 if task not found', async () => {
            (PickupTask.findById as jest.Mock).mockResolvedValue(null);
            const response = await request(app).post('/api/volunteer/tasks/task1/accept');
            expect(response.status).toBe(404);
        });

        it('should return 400 if task is not in ASSIGNED state', async () => {
            const mockTask = { _id: 'task1', status: TaskStatus.ACCEPTED, history: [] };
            (PickupTask.findById as jest.Mock).mockResolvedValue(mockTask);

            const response = await request(app).post('/api/volunteer/tasks/task1/accept');
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Task cannot be accepted in its current state');
        });
    });

    describe('declineTask', () => {
        it('should decline an assigned task and trigger reassignment', async () => {
            const mockTask = {
                _id: 'task1',
                status: TaskStatus.ASSIGNED,
                donationId: 'donation1',
                history: [],
                save: jest.fn().mockResolvedValue(true)
            };
            const mockVolunteer = {
                reliabilityScore: 1,
                totalAssignedTasks: 1,
                completedTasks: 0,
                save: jest.fn().mockResolvedValue(true)
            };
            const mockDonation = {
                _id: 'donation1',
                status: 'reserved',
                save: jest.fn().mockResolvedValue(true)
            };

            (PickupTask.findById as jest.Mock).mockResolvedValue(mockTask);
            (User.findById as jest.Mock).mockResolvedValue(mockVolunteer);
            (FoodDonation.findById as jest.Mock).mockResolvedValue(mockDonation);

            const response = await request(app).post('/api/volunteer/tasks/task1/decline');

            expect(response.status).toBe(200);
            expect(mockTask.status).toBe(TaskStatus.DECLINED);
            expect(socketEvents.emitToRole).toHaveBeenCalledWith('admin', 'task:reassignment_needed', expect.any(Object));
        });
    });

    describe('updateTaskStatus', () => {
        it('should update status to PICKED', async () => {
            const mockTask = {
                _id: 'task1',
                status: TaskStatus.ACCEPTED,
                donationId: 'donation1',
                history: [],
                save: jest.fn().mockResolvedValue(true)
            };
            const mockDonation = {
                _id: 'donation1',
                status: 'reserved',
                save: jest.fn().mockResolvedValue(true)
            };
            (PickupTask.findById as jest.Mock).mockResolvedValue(mockTask);
            (FoodDonation.findById as jest.Mock).mockResolvedValue(mockDonation);

            const response = await request(app)
                .patch('/api/volunteer/tasks/task1/status')
                .send({ status: TaskStatus.PICKED });

            expect(response.status).toBe(200);
            expect(mockTask.status).toBe(TaskStatus.PICKED);
            expect((mockTask as any).pickedAt).toBeDefined();
        });

        it('should update status to DELIVERED and notify', async () => {
            const mockTask = {
                _id: 'task1',
                status: TaskStatus.PICKED,
                donationId: 'donation1',
                history: [],
                save: jest.fn().mockResolvedValue(true)
            };
            const mockDonation = { _id: 'donation1', donorId: 'donor123', status: 'collected', save: jest.fn() };
            const mockVolunteer = {
                sustainabilityCredits: 0,
                totalDeliveries: 0,
                totalDistance: 0,
                completedTasks: 0,
                totalAssignedTasks: 1,
                reliabilityScore: 1,
                location: null, // No location = checkAndAssignPendingTasks exits early
                save: jest.fn().mockResolvedValue(true)
            };

            (PickupTask.findById as jest.Mock).mockResolvedValue(mockTask);
            (FoodDonation.findById as jest.Mock).mockResolvedValue(mockDonation);
            (User.findById as jest.Mock).mockResolvedValue(mockVolunteer);
            (PickupTask.countDocuments as jest.Mock).mockResolvedValue(0);

            const response = await request(app)
                .patch('/api/volunteer/tasks/task1/status')
                .send({ status: TaskStatus.DELIVERED });

            expect(response.status).toBe(200);
            expect(mockTask.status).toBe(TaskStatus.DELIVERED);
            expect(socketEvents.emitToUser).toHaveBeenCalledWith('donor123', 'delivery:complete', expect.any(Object));
        });
    });
});
