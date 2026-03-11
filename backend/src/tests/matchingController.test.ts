import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { assignVolunteer, getMatchingStatus } from '../controllers/matchingController';
import User from '../models/User';
import FoodDonation from '../models/FoodDonation';
import PickupTask, { TaskStatus } from '../models/PickupTask';

// Mock all models and utilities
jest.mock('../models/User');
jest.mock('../models/FoodDonation');
jest.mock('../models/PickupTask');
jest.mock('../utils/socketEvents', () => ({
    emitToUser: jest.fn(),
    emitToRole: jest.fn(),
}));

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
                reservedBy: 'ngo1',
                expiryTime: new Date(Date.now() + 3600000),
            };
            (FoodDonation.findById as jest.Mock).mockResolvedValue(donation);

            // Available volunteer
            const volunteer = {
                _id: 'vol1',
                name: 'John',
                email: 'john@test.com',
                location: { coordinates: [80.3, 13.1] },
            };

            // Controller uses User.find().select() for geospatial query
            (User.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue([volunteer]),
            });

            // Load balancing: countDocuments per volunteer
            (PickupTask.countDocuments as jest.Mock).mockResolvedValue(0);

            // Mock PickupTask constructor + save
            const mockSave = jest.fn().mockResolvedValue(true);
            (PickupTask as any).mockImplementation(() => ({
                save: mockSave,
                _id: 'task1',
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
                location: { type: 'Point', coordinates: [80.2, 13.0] },
            });

            await assignVolunteer(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 500 if donation has no location (null coordinates crash)', async () => {
            const mockReq = { params: { donationId: 'donation1' } } as unknown as AuthRequest;
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'reserved',
                location: null, // Controller accesses location.coordinates → throws
            });

            await assignVolunteer(mockReq, mockRes as Response);

            // Controller catches the TypeError and returns 500
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        it('should return 404 if no available volunteers', async () => {
            const mockReq = { params: { donationId: 'donation1' } } as unknown as AuthRequest;
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'reserved',
                location: { type: 'Point', coordinates: [80.2, 13.0] },
            });

            // Both nearby and fallback find return empty
            (User.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue([]),
            });

            await assignVolunteer(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'No volunteers available' });
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
            // Controller: PickupTask.findOne().populate().sort()
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
