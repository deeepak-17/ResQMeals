import { Request, Response } from 'express';
import { createDonation, getMyDonations, updateDonation, deleteDonation } from '../controllers/donationController';
import FoodDonation from '../models/FoodDonation';

// Mock the FoodDonation model
jest.mock('../models/FoodDonation');
// Mock socket events so tests don't need a real socket server
jest.mock('../utils/socketEvents', () => ({ emitToRole: jest.fn() }));

interface AuthRequest extends Request {
    user?: any;
}

describe('Donation Controller', () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    // ─── createDonation ────────────────────────────────────────────
    describe('createDonation', () => {
        it('should create a donation successfully', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                body: {
                    foodType: 'Rice',
                    quantity: '10 plates',
                    preparedTime: new Date().toISOString(),
                    location: { type: 'Point', coordinates: [80.2, 13.0] },
                    imageUrl: 'http://example.com/img.jpg',
                },
            } as unknown as AuthRequest;

            const savedDonation = {
                _id: 'donation1',
                donorId: 'donor123',
                ...mockReq.body,
            };
            (FoodDonation as any).mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(savedDonation),
            }));

            await createDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(savedDonation);
        });

        it('should return 401 if user is not authenticated', async () => {
            const mockReq = {
                body: { foodType: 'Rice', quantity: '10' },
            } as unknown as AuthRequest;

            await createDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Unauthorized: User not authenticated',
            });
        });

        it('should return 401 when no user is authenticated (no body fallback)', async () => {
            const mockReq = {
                body: {
                    donorId: 'fallback-donor', // body donorId is NOT used by the real controller
                    foodType: 'Pasta',
                    quantity: '5 trays',
                    preparedTime: new Date().toISOString(),
                    location: { type: 'Point', coordinates: [80.2, 13.0] },
                },
            } as unknown as AuthRequest;

            await createDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Unauthorized: User not authenticated',
            });
        });

        it('should return 500 on server error', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                body: { foodType: 'Rice' },
            } as unknown as AuthRequest;

            (FoodDonation as any).mockImplementation(() => ({
                save: jest.fn().mockRejectedValue(new Error('DB Error')),
            }));

            await createDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Server Error',
                error: 'DB Error',
            });
        });
    });

    // ─── getMyDonations ────────────────────────────────────────────
    describe('getMyDonations', () => {
        it('should return donations for authenticated user', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                query: {},
            } as unknown as AuthRequest;

            const donations = [
                { _id: 'd1', foodType: 'Rice', donorId: 'donor123' },
                { _id: 'd2', foodType: 'Pasta', donorId: 'donor123' },
            ];
            (FoodDonation.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue(donations),
            });

            await getMyDonations(mockReq, mockRes as Response);

            expect(FoodDonation.find).toHaveBeenCalledWith({ donorId: 'donor123' });
            expect(mockRes.json).toHaveBeenCalledWith(donations);
        });

        it('should use donorId from query as fallback', async () => {
            const mockReq = {
                query: { donorId: 'query-donor' },
            } as unknown as AuthRequest;

            (FoodDonation.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue([]),
            });

            await getMyDonations(mockReq, mockRes as Response);

            expect(FoodDonation.find).toHaveBeenCalledWith({ donorId: 'query-donor' });
        });

        it('should return 401 if no user ID available', async () => {
            const mockReq = {
                query: {},
            } as unknown as AuthRequest;

            await getMyDonations(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Unauthorized: User ID required',
            });
        });

        it('should return 500 on server error', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                query: {},
            } as unknown as AuthRequest;

            (FoodDonation.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error('DB Error')),
            });

            await getMyDonations(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    // ─── updateDonation ────────────────────────────────────────────
    describe('updateDonation', () => {
        it('should update a donation successfully', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                params: { id: 'donation1' },
                body: { quantity: '20 plates' },
            } as unknown as AuthRequest;

            const existingDonation = {
                _id: 'donation1',
                donorId: { toString: () => 'donor123' },
                status: 'available',
            };
            const updatedDonation = { _id: 'donation1', quantity: '20 plates' };
            (FoodDonation.findById as jest.Mock).mockResolvedValue(existingDonation);
            (FoodDonation.findByIdAndUpdate as jest.Mock).mockResolvedValue(updatedDonation);

            await updateDonation(mockReq, mockRes as Response);

            expect(FoodDonation.findByIdAndUpdate).toHaveBeenCalledWith(
                'donation1',
                { quantity: '20 plates' },
                { new: true }
            );
            expect(mockRes.json).toHaveBeenCalledWith(updatedDonation);
        });

        it('should return 404 if donation not found', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                params: { id: 'nonexistent' },
                body: { quantity: '20' },
            } as unknown as AuthRequest;

            (FoodDonation.findById as jest.Mock).mockResolvedValue(null);

            await updateDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Donation not found' });
        });

        it('should return 403 if user does not own the donation', async () => {
            const mockReq = {
                user: { id: 'other-user' },
                params: { id: 'donation1' },
                body: { quantity: '5 plates' },
            } as unknown as AuthRequest;

            const existingDonation = {
                _id: 'donation1',
                donorId: { toString: () => 'donor123' }, // different owner
                status: 'available',
            };
            (FoodDonation.findById as jest.Mock).mockResolvedValue(existingDonation);

            await updateDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Unauthorized: You can only edit your own donations',
            });
        });

        it('should return 400 if donation is already collected', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                params: { id: 'donation1' },
                body: { quantity: '5 plates' },
            } as unknown as AuthRequest;

            const existingDonation = {
                _id: 'donation1',
                donorId: { toString: () => 'donor123' },
                status: 'collected',
            };
            (FoodDonation.findById as jest.Mock).mockResolvedValue(existingDonation);

            await updateDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Cannot edit donations that are already collected or expired',
            });
        });

        it('should return 400 if donation is expired', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                params: { id: 'donation1' },
                body: { quantity: '5 plates' },
            } as unknown as AuthRequest;

            const existingDonation = {
                _id: 'donation1',
                donorId: { toString: () => 'donor123' },
                status: 'expired',
            };
            (FoodDonation.findById as jest.Mock).mockResolvedValue(existingDonation);

            await updateDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Cannot edit donations that are already collected or expired',
            });
        });

        it('should return 500 on server error', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                params: { id: 'donation1' },
                body: {},
            } as unknown as AuthRequest;

            (FoodDonation.findById as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await updateDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    // ─── deleteDonation ────────────────────────────────────────────
    describe('deleteDonation', () => {
        it('should delete a donation successfully', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                params: { id: 'donation1' },
            } as unknown as AuthRequest;

            const existingDonation = {
                _id: 'donation1',
                donorId: { toString: () => 'donor123' },
                status: 'available',
            };
            (FoodDonation.findById as jest.Mock).mockResolvedValue(existingDonation);
            (FoodDonation.findByIdAndDelete as jest.Mock).mockResolvedValue(existingDonation);

            await deleteDonation(mockReq, mockRes as Response);

            expect(FoodDonation.findByIdAndDelete).toHaveBeenCalledWith('donation1');
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Donation deleted successfully' });
        });

        it('should return 404 if donation not found', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                params: { id: 'nonexistent' },
            } as unknown as AuthRequest;

            (FoodDonation.findById as jest.Mock).mockResolvedValue(null);

            await deleteDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Donation not found' });
        });

        it('should return 403 if user does not own the donation', async () => {
            const mockReq = {
                user: { id: 'other-user' },
                params: { id: 'donation1' },
            } as unknown as AuthRequest;

            const existingDonation = {
                _id: 'donation1',
                donorId: { toString: () => 'donor123' }, // different owner
                status: 'available',
            };
            (FoodDonation.findById as jest.Mock).mockResolvedValue(existingDonation);

            await deleteDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Unauthorized: You can only delete your own donations',
            });
        });

        it('should return 400 if donation is already collected', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                params: { id: 'donation1' },
            } as unknown as AuthRequest;

            const existingDonation = {
                _id: 'donation1',
                donorId: { toString: () => 'donor123' },
                status: 'collected',
            };
            (FoodDonation.findById as jest.Mock).mockResolvedValue(existingDonation);

            await deleteDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Cannot delete a donation that has already been collected. Please contact support.',
            });
        });

        it('should return 500 on server error', async () => {
            const mockReq = {
                user: { id: 'donor123' },
                params: { id: 'donation1' },
            } as unknown as AuthRequest;

            (FoodDonation.findById as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await deleteDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
});
