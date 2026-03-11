import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getNearbyDonations, acceptDonation, confirmPickup } from '../controllers/ngoController';
import FoodDonation from '../models/FoodDonation';

// Mock the FoodDonation model
jest.mock('../models/FoodDonation');

describe('NGO Controller', () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    // ─── getNearbyDonations ────────────────────────────────────
    describe('getNearbyDonations', () => {
        it('should return nearby donations with valid coordinates', async () => {
            const mockReq = {
                query: { lat: '13.0', lng: '80.2', radiusKm: '5' },
            } as unknown as AuthRequest;

            const donations = [
                { _id: 'd1', foodType: 'Rice', status: 'available' },
            ];
            (FoodDonation.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue(donations),
                }),
            });

            await getNearbyDonations(mockReq, mockRes as Response);

            expect(mockRes.json).toHaveBeenCalledWith({
                count: 1,
                radiusKm: 5,
                donations,
            });
        });

        it('should return 400 if latitude is missing', async () => {
            const mockReq = {
                query: { lng: '80.2' },
            } as unknown as AuthRequest;

            await getNearbyDonations(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Latitude and longitude are required',
            });
        });

        it('should return 400 if longitude is missing', async () => {
            const mockReq = {
                query: { lat: '13.0' },
            } as unknown as AuthRequest;

            await getNearbyDonations(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 for invalid coordinates (NaN)', async () => {
            const mockReq = {
                query: { lat: 'abc', lng: '80.2' },
            } as unknown as AuthRequest;

            await getNearbyDonations(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid coordinates or radius' });
        });

        it('should return 400 for latitude out of range', async () => {
            const mockReq = {
                query: { lat: '100', lng: '80.2' },
            } as unknown as AuthRequest;

            await getNearbyDonations(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Latitude must be between -90 and 90',
            });
        });

        it('should return 400 for longitude out of range', async () => {
            const mockReq = {
                query: { lat: '13.0', lng: '200' },
            } as unknown as AuthRequest;

            await getNearbyDonations(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Longitude must be between -180 and 180',
            });
        });

        it('should return 400 for negative radius', async () => {
            const mockReq = {
                query: { lat: '13.0', lng: '80.2', radiusKm: '-5' },
            } as unknown as AuthRequest;

            await getNearbyDonations(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Radius must be a positive number',
            });
        });

        it('should cap radius at 50km', async () => {
            const mockReq = {
                query: { lat: '13.0', lng: '80.2', radiusKm: '100' },
            } as unknown as AuthRequest;

            (FoodDonation.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue([]),
                }),
            });

            await getNearbyDonations(mockReq, mockRes as Response);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ radiusKm: 50 })
            );
        });

        it('should use default radius of 10km when not provided', async () => {
            const mockReq = {
                query: { lat: '13.0', lng: '80.2' },
            } as unknown as AuthRequest;

            (FoodDonation.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue([]),
                }),
            });

            await getNearbyDonations(mockReq, mockRes as Response);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({ radiusKm: 10 })
            );
        });
    });

    // ─── acceptDonation ────────────────────────────────────────
    describe('acceptDonation', () => {
        it('should accept an available donation successfully', async () => {
            const mockReq = {
                params: { id: 'donation1' },
                user: { id: 'ngo1', role: 'ngo' },
            } as unknown as AuthRequest;

            const acceptedDonation = {
                _id: 'donation1',
                status: 'reserved',
                reservedBy: 'ngo1',
            };
            (FoodDonation.findOneAndUpdate as jest.Mock).mockResolvedValue(acceptedDonation);

            await acceptDonation(mockReq, mockRes as Response);

            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Donation accepted successfully',
                donation: acceptedDonation,
            });
        });

        it('should return 401 if user is not authenticated', async () => {
            const mockReq = {
                params: { id: 'donation1' },
            } as unknown as AuthRequest;

            await acceptDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('should return 404 if donation not found', async () => {
            const mockReq = {
                params: { id: 'nonexistent' },
                user: { id: 'ngo1' },
            } as unknown as AuthRequest;

            (FoodDonation.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
            (FoodDonation.findById as jest.Mock).mockResolvedValue(null);

            await acceptDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 if donation is already reserved', async () => {
            const mockReq = {
                params: { id: 'donation1' },
                user: { id: 'ngo1' },
            } as unknown as AuthRequest;

            (FoodDonation.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'reserved',
            });

            await acceptDonation(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should mark donation as expired if it has expired', async () => {
            const mockReq = {
                params: { id: 'donation1' },
                user: { id: 'ngo1' },
            } as unknown as AuthRequest;

            const expiredDonation = {
                _id: 'donation1',
                status: 'available',
                save: jest.fn().mockResolvedValue(true),
            };
            (FoodDonation.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
            (FoodDonation.findById as jest.Mock).mockResolvedValue(expiredDonation);

            await acceptDonation(mockReq, mockRes as Response);

            expect(expiredDonation.status).toBe('expired');
            expect(expiredDonation.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });

    // ─── confirmPickup ────────────────────────────────────────
    describe('confirmPickup', () => {
        it('should confirm pickup for a donation reserved by the NGO', async () => {
            const mockReq = {
                params: { id: 'donation1' },
                user: { id: 'ngo1' },
            } as unknown as AuthRequest;

            const collectedDonation = {
                _id: 'donation1',
                status: 'collected',
            };
            (FoodDonation.findOneAndUpdate as jest.Mock).mockResolvedValue(collectedDonation);

            await confirmPickup(mockReq, mockRes as Response);

            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Pickup confirmed successfully',
                donation: collectedDonation,
            });
        });

        it('should return 401 if user is not authenticated', async () => {
            const mockReq = {
                params: { id: 'donation1' },
            } as unknown as AuthRequest;

            await confirmPickup(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('should return 404 if donation not found', async () => {
            const mockReq = {
                params: { id: 'nonexistent' },
                user: { id: 'ngo1' },
            } as unknown as AuthRequest;

            (FoodDonation.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
            (FoodDonation.findById as jest.Mock).mockResolvedValue(null);

            await confirmPickup(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 if donation is not in reserved status', async () => {
            const mockReq = {
                params: { id: 'donation1' },
                user: { id: 'ngo1' },
            } as unknown as AuthRequest;

            (FoodDonation.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'available',
            });

            await confirmPickup(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 403 if donation is reserved by another NGO', async () => {
            const mockReq = {
                params: { id: 'donation1' },
                user: { id: 'ngo1' },
            } as unknown as AuthRequest;

            (FoodDonation.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
            (FoodDonation.findById as jest.Mock).mockResolvedValue({
                _id: 'donation1',
                status: 'reserved',
                reservedBy: 'ngo2', // different NGO
            });

            await confirmPickup(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'You did not reserve this donation',
            });
        });
    });
});
