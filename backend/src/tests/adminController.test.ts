import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getAllUsers, verifyUser, blockUser } from '../controllers/adminController';
import User from '../models/User';

// Mock the User model
jest.mock('../models/User');

describe('Admin Controller', () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();
    });

    // ─── getAllUsers ────────────────────────────────────────────
    describe('getAllUsers', () => {
        it('should return paginated list of users', async () => {
            const mockReq = {
                query: { page: '1', limit: '10' },
            } as unknown as AuthRequest;

            const users = [
                { _id: 'u1', name: 'User 1', role: 'donor' },
                { _id: 'u2', name: 'User 2', role: 'ngo' },
            ];

            (User.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        skip: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue(users),
                        }),
                    }),
                }),
            });
            (User.countDocuments as jest.Mock).mockResolvedValue(2);

            await getAllUsers(mockReq, mockRes as Response);

            expect(mockRes.json).toHaveBeenCalledWith({
                users,
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 2,
                    pages: 1,
                },
            });
        });

        it('should filter by role when provided', async () => {
            const mockReq = {
                query: { role: 'donor', page: '1', limit: '20' },
            } as unknown as AuthRequest;

            (User.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        skip: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue([]),
                        }),
                    }),
                }),
            });
            (User.countDocuments as jest.Mock).mockResolvedValue(0);

            await getAllUsers(mockReq, mockRes as Response);

            expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ role: 'donor' }));
        });

        it('should filter by verified status when provided', async () => {
            const mockReq = {
                query: { verified: 'true', page: '1', limit: '20' },
            } as unknown as AuthRequest;

            (User.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        skip: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue([]),
                        }),
                    }),
                }),
            });
            (User.countDocuments as jest.Mock).mockResolvedValue(0);

            await getAllUsers(mockReq, mockRes as Response);

            expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ verified: true }));
        });

        it('should use default pagination when not provided', async () => {
            const mockReq = {
                query: {},
            } as unknown as AuthRequest;

            (User.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        skip: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue([]),
                        }),
                    }),
                }),
            });
            (User.countDocuments as jest.Mock).mockResolvedValue(0);

            await getAllUsers(mockReq, mockRes as Response);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    pagination: expect.objectContaining({ page: 1, limit: 20 }),
                })
            );
        });

        it('should cap limit at 50', async () => {
            const mockReq = {
                query: { limit: '100' },
            } as unknown as AuthRequest;

            (User.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        skip: jest.fn().mockReturnValue({
                            limit: jest.fn().mockResolvedValue([]),
                        }),
                    }),
                }),
            });
            (User.countDocuments as jest.Mock).mockResolvedValue(0);

            await getAllUsers(mockReq, mockRes as Response);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    pagination: expect.objectContaining({ limit: 50 }),
                })
            );
        });

        it('should return 500 on server error', async () => {
            const mockReq = { query: {} } as unknown as AuthRequest;
            (User.find as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    sort: jest.fn().mockReturnValue({
                        skip: jest.fn().mockReturnValue({
                            limit: jest.fn().mockRejectedValue(new Error('DB Error')),
                        }),
                    }),
                }),
            });
            (User.countDocuments as jest.Mock).mockResolvedValue(0);

            await getAllUsers(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    // ─── verifyUser ────────────────────────────────────────────
    describe('verifyUser', () => {
        it('should verify a user successfully', async () => {
            const mockReq = {
                params: { id: 'user1' },
            } as unknown as AuthRequest;

            const verifiedUser = { _id: 'user1', name: 'Test User', verified: true };
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(verifiedUser),
            });

            await verifyUser(mockReq, mockRes as Response);

            expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user1', { verified: true }, { new: true });
            expect(mockRes.json).toHaveBeenCalledWith({
                message: "User 'Test User' has been verified",
                user: verifiedUser,
            });
        });

        it('should return 404 if user not found', async () => {
            const mockReq = {
                params: { id: 'nonexistent' },
            } as unknown as AuthRequest;

            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });

            await verifyUser(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
        });

        it('should return 500 on server error', async () => {
            const mockReq = { params: { id: 'user1' } } as unknown as AuthRequest;
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error('DB Error')),
            });

            await verifyUser(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    // ─── blockUser ────────────────────────────────────────────
    describe('blockUser', () => {
        it('should block a user successfully', async () => {
            const mockReq = {
                params: { id: 'user2' },
                body: { blocked: true },
                user: { id: 'admin1', role: 'admin' },
            } as unknown as AuthRequest;

            const blockedUser = { _id: 'user2', name: 'Blocked User', verified: false };
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(blockedUser),
            });

            await blockUser(mockReq, mockRes as Response);

            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                'user2',
                { verified: false }, // blocked=true means verified=false
                { new: true }
            );
            expect(mockRes.json).toHaveBeenCalledWith({
                message: "User 'Blocked User' has been blocked",
                user: blockedUser,
            });
        });

        it('should unblock a user successfully', async () => {
            const mockReq = {
                params: { id: 'user2' },
                body: { blocked: false },
                user: { id: 'admin1', role: 'admin' },
            } as unknown as AuthRequest;

            const unblockedUser = { _id: 'user2', name: 'Unblocked User', verified: true };
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(unblockedUser),
            });

            await blockUser(mockReq, mockRes as Response);

            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                'user2',
                { verified: true }, // blocked=false means verified=true
                { new: true }
            );
            expect(mockRes.json).toHaveBeenCalledWith({
                message: "User 'Unblocked User' has been unblocked",
                user: unblockedUser,
            });
        });

        it('should return 400 if blocked field is not boolean', async () => {
            const mockReq = {
                params: { id: 'user2' },
                body: { blocked: 'yes' },
                user: { id: 'admin1', role: 'admin' },
            } as unknown as AuthRequest;

            await blockUser(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: "'blocked' field (boolean) is required in request body",
            });
        });

        it('should prevent admin from blocking themselves', async () => {
            const mockReq = {
                params: { id: 'admin1' },
                body: { blocked: true },
                user: { id: 'admin1', role: 'admin' },
            } as unknown as AuthRequest;

            await blockUser(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'You cannot block yourself' });
        });

        it('should return 404 if user not found', async () => {
            const mockReq = {
                params: { id: 'nonexistent' },
                body: { blocked: true },
                user: { id: 'admin1', role: 'admin' },
            } as unknown as AuthRequest;

            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });

            await blockUser(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 on server error', async () => {
            const mockReq = {
                params: { id: 'user2' },
                body: { blocked: true },
                user: { id: 'admin1', role: 'admin' },
            } as unknown as AuthRequest;

            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error('DB Error')),
            });

            await blockUser(mockReq, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
});
