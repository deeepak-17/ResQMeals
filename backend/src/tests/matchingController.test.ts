import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { assignVolunteer, getMatchingStatus } from '../controllers/matchingController';
import User from '../models/User';
import FoodDonation from '../models/FoodDonation';
import PickupTask, { TaskStatus } from '../models/PickupTask';

// Mock all models
jest.mock('../models/User');
jest.mock('../models/FoodDonation');
jest.mock('../models/PickupTask');

describe('Matching Controller', () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    // ─── assignVolunteer ────────────────────────────────────────
    describe('assignVolunteer', () => {
        it('should assign a volunteer to a reserved donation', async () => {
            const mockReq = {
                params: { donationId: 'donation1' },
            } as unknown as AuthRequest;

            const donation = {
                _id: 'donation1',
                status: 'reserved',
                location: { type: 'Point', coordinates: [80.2, 13.0] },
            };
            (FoodDonation.findById as jest.Mock).mockResolvedValue(donation);

            // No existing task
            (PickupTask.findOne as jest.Mock).mockResolvedValue(null);

            // No busy volunteers
            (PickupTask.distinct as jest.Mock).mockResolvedValue([]);

            // Available volunteer
            const volunteer = { _id: 'vol1', name: 'John', email: 'john@test.com' };
            (User.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue([volunteer]),
            });

            // Mock PickupTask constructor
            const savedTask = { _id: 'task1', donationId: 'donation1', volunteerId: 'vol1', status: TaskStatus.ASSIGNED };
            (PickupTask as any).mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(savedTask),
            }));

            await assignVolunteer(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('John'),
                })
            );
        });

        it('should return 404 if donation not found', async () => {
            const mockReq = { params: { donationId: 'nonexistent' } } as unknown as AuthRequest;
            (FoodDonation.findById as jest.Mock).mockResolvedValue(null);

            await assignVolunteer(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Donation not found' });
        });

        it('should return 400 if donation is not in reserved status', async () => {
            const mockReq = { params: { donationId: 'donation1' } } as unknown as AuthRequest;
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'available',
            });

            await assignVolunteer(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if donation has no location', async () => {
            const mockReq = { params: { donationId: 'donation1' } } as unknown as AuthRequest;
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'reserved',
                location: null,
            });

            await assignVolunteer(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Donation does not have a valid location',
            });
        });

        it('should return 400 if a pickup task already exists', async () => {
            const mockReq = { params: { donationId: 'donation1' } } as unknown as AuthRequest;
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'reserved',
                location: { type: 'Point', coordinates: [80.2, 13.0] },
            });

            (PickupTask.findOne as jest.Mock).mockResolvedValue({
                _id: 'existingTask',
                status: TaskStatus.ASSIGNED,
            });

            await assignVolunteer(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'A pickup task already exists for this donation',
                })
            );
        });

        it('should return 404 if no available volunteers', async () => {
            const mockReq = { params: { donationId: 'donation1' } } as unknown as AuthRequest;
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'reserved',
                location: { type: 'Point', coordinates: [80.2, 13.0] },
            });

            (PickupTask.findOne as jest.Mock).mockResolvedValue(null);
            (PickupTask.distinct as jest.Mock).mockResolvedValue([]);
            (User.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue([]),
            });

            await assignVolunteer(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 on server error', async () => {
            const mockReq = { params: { donationId: 'donation1' } } as unknown as AuthRequest;
            (FoodDonation.findById as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await assignVolunteer(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    // ─── getMatchingStatus ────────────────────────────────────────
    describe('getMatchingStatus', () => {
        it('should return status when task exists', async () => {
            const mockReq = {
                params: { donationId: 'donation1' },
            } as unknown as AuthRequest;

            (FoodDonation.findById as jest.Mock).mockResolvedValue({ _id: 'donation1' });

            const task = {
                _id: 'task1',
                status: TaskStatus.ASSIGNED,
                volunteerId: { name: 'John', email: 'john@test.com' },
            };
            (PickupTask.findOne as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue(task),
                }),
            });

            await getMatchingStatus(mockReq, mockRes as Response);

            expect(mockRes.json).toHaveBeenCalledWith({
                donationId: 'donation1',
                status: TaskStatus.ASSIGNED,
                task,
            });
        });

        it('should return unassigned status when no task exists', async () => {
            const mockReq = {
                params: { donationId: 'donation1' },
            } as unknown as AuthRequest;

            (FoodDonation.findById as jest.Mock).mockResolvedValue({ _id: 'donation1' });
            (PickupTask.findOne as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue(null),
                }),
            });

            await getMatchingStatus(mockReq, mockRes as Response);

            expect(mockRes.json).toHaveBeenCalledWith({
                donationId: 'donation1',
                status: 'unassigned',
                message: 'No volunteer has been assigned yet',
            });
        });

        it('should return 404 if donation not found', async () => {
            const mockReq = { params: { donationId: 'nonexistent' } } as unknown as AuthRequest;
            (FoodDonation.findById as jest.Mock).mockResolvedValue(null);

            await getMatchingStatus(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 on server error', async () => {
            const mockReq = { params: { donationId: 'donation1' } } as unknown as AuthRequest;
            (FoodDonation.findById as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await getMatchingStatus(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
});
