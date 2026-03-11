/**
 * Integration Tests: Admin Module
 *
 * Tests the full request-response cycle through:
 *   HTTP request → authMiddleware → roleMiddleware → adminController → response
 *
 * DB layer (User, FoodDonation models) is mocked.
 * JWT is signed with a test secret to simulate real auth.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';
import {
    getAllUsers,
    verifyUser,
    blockUser,
    getAllDonations,
} from '../controllers/adminController';
import User from '../models/User';
import FoodDonation from '../models/FoodDonation';

// ── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('../models/User');
jest.mock('../models/FoodDonation');

// Use a consistent test secret so JWT signing & verification both work
const TEST_JWT_SECRET = 'test-secret';
process.env.JWT_SECRET = TEST_JWT_SECRET;

// ── Token helpers ──────────────────────────────────────────────────────────
const makeToken = (payload: object) =>
    jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '1h' });

const ADMIN_TOKEN = makeToken({ id: 'admin123', role: 'admin' });
const DONOR_TOKEN = makeToken({ id: 'donor123', role: 'donor' });

// ── App setup ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Mount admin routes with the real middleware chain
app.get('/api/admin/users', authMiddleware, roleMiddleware('admin'), getAllUsers);
app.put('/api/admin/users/:id/verify', authMiddleware, roleMiddleware('admin'), verifyUser);
app.put('/api/admin/users/:id/block', authMiddleware, roleMiddleware('admin'), blockUser);
app.get('/api/admin/donations', authMiddleware, roleMiddleware('admin'), getAllDonations);

// ── Helpers ────────────────────────────────────────────────────────────────
/** Returns a chainable mock mimicking User.find().select().sort().skip().limit() */
const mockUserFindChain = (resolveValue: unknown) =>
    (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue(resolveValue),
                }),
            }),
        }),
    });

/** Returns a chainable mock mimicking FoodDonation.find().populate().populate().sort().skip().limit() */
const mockDonationFindChain = (resolveValue: unknown) =>
    (FoodDonation.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(resolveValue),
    });

// ══════════════════════════════════════════════════════════════════════════
describe('Admin API — Integration Tests', () => {
    beforeEach(() => jest.clearAllMocks());

    // ── Auth & Role guard tests ──────────────────────────────────────────
    describe('Authentication & Authorization Guards', () => {
        it('GET /api/admin/users → 401 when no token provided', async () => {
            const res = await request(app).get('/api/admin/users');
            expect(res.status).toBe(401);
        });

        it('GET /api/admin/users → 401 when token is invalid', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', 'Bearer bad.token.here');
            expect(res.status).toBe(401);
        });

        it('GET /api/admin/users → 403 when authenticated as non-admin role', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${DONOR_TOKEN}`);
            expect(res.status).toBe(403);
        });
    });

    // ── GET /api/admin/users ─────────────────────────────────────────────
    describe('GET /api/admin/users', () => {
        it('returns paginated user list with default pagination', async () => {
            const mockUsers = [
                { _id: 'u1', name: 'Alice', role: 'donor' },
                { _id: 'u2', name: 'Bob', role: 'ngo' },
            ];
            mockUserFindChain(mockUsers);
            (User.countDocuments as jest.Mock).mockResolvedValue(2);

            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(res.status).toBe(200);
            expect(res.body.users).toHaveLength(2);
            expect(res.body.pagination).toMatchObject({ page: 1, limit: 20, total: 2, pages: 1 });
        });

        it('filters by role query param', async () => {
            mockUserFindChain([]);
            (User.countDocuments as jest.Mock).mockResolvedValue(0);

            await request(app)
                .get('/api/admin/users?role=ngo')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ role: 'ngo' }));
        });

        it('filters by verified=true query param', async () => {
            mockUserFindChain([]);
            (User.countDocuments as jest.Mock).mockResolvedValue(0);

            await request(app)
                .get('/api/admin/users?verified=true')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ verified: true }));
        });

        it('filters by verified=false query param', async () => {
            mockUserFindChain([]);
            (User.countDocuments as jest.Mock).mockResolvedValue(0);

            await request(app)
                .get('/api/admin/users?verified=false')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ verified: false }));
        });

        it('caps limit at 50 even if client requests more', async () => {
            mockUserFindChain([]);
            (User.countDocuments as jest.Mock).mockResolvedValue(0);

            const res = await request(app)
                .get('/api/admin/users?limit=200')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(res.body.pagination.limit).toBe(50);
        });

        it('returns 500 on database error', async () => {
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

            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(res.status).toBe(500);
            expect(res.body.message).toBe('Server Error');
        });
    });

    // ── PUT /api/admin/users/:id/verify ──────────────────────────────────
    describe('PUT /api/admin/users/:id/verify', () => {
        it('verifies a user and returns updated user', async () => {
            const verifiedUser = { _id: 'u1', name: 'Alice Donor', verified: true, role: 'donor' };
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(verifiedUser),
            });

            const res = await request(app)
                .put('/api/admin/users/u1/verify')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("User 'Alice Donor' has been verified");
            expect(res.body.user.verified).toBe(true);
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                'u1',
                { verified: true },
                { new: true }
            );
        });

        it('returns 404 when user does not exist', async () => {
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });

            const res = await request(app)
                .put('/api/admin/users/nonexistent/verify')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(res.status).toBe(404);
            expect(res.body.message).toBe('User not found');
        });

        it('returns 403 when a non-admin tries to verify', async () => {
            const res = await request(app)
                .put('/api/admin/users/u1/verify')
                .set('Authorization', `Bearer ${DONOR_TOKEN}`);

            expect(res.status).toBe(403);
        });

        it('returns 500 on database error', async () => {
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error('DB Error')),
            });

            const res = await request(app)
                .put('/api/admin/users/u1/verify')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(res.status).toBe(500);
        });
    });

    // ── PUT /api/admin/users/:id/block ───────────────────────────────────
    describe('PUT /api/admin/users/:id/block', () => {
        it('blocks a user successfully (blocked: true)', async () => {
            const blockedUser = { _id: 'u2', name: 'Bob NGO', verified: false };
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(blockedUser),
            });

            const res = await request(app)
                .put('/api/admin/users/u2/block')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ blocked: true });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("User 'Bob NGO' has been blocked");
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                'u2',
                { verified: false }, // blocked=true → verified=false
                { new: true }
            );
        });

        it('unblocks a user successfully (blocked: false)', async () => {
            const unblockedUser = { _id: 'u2', name: 'Bob NGO', verified: true };
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(unblockedUser),
            });

            const res = await request(app)
                .put('/api/admin/users/u2/block')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ blocked: false });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("User 'Bob NGO' has been unblocked");
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
                'u2',
                { verified: true }, // blocked=false → verified=true
                { new: true }
            );
        });

        it('returns 400 when blocked field is missing', async () => {
            const res = await request(app)
                .put('/api/admin/users/u2/block')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("'blocked' field");
        });

        it('returns 400 when blocked field is not boolean (string)', async () => {
            const res = await request(app)
                .put('/api/admin/users/u2/block')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ blocked: 'yes' });

            expect(res.status).toBe(400);
        });

        it('returns 400 when admin tries to block themselves', async () => {
            // admin123 is the ID in ADMIN_TOKEN
            const res = await request(app)
                .put('/api/admin/users/admin123/block')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ blocked: true });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe('You cannot block yourself');
        });

        it('returns 404 when target user does not exist', async () => {
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });

            const res = await request(app)
                .put('/api/admin/users/nonexistent/block')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ blocked: true });

            expect(res.status).toBe(404);
        });

        it('returns 500 on database error', async () => {
            (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error('DB Error')),
            });

            const res = await request(app)
                .put('/api/admin/users/u2/block')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
                .send({ blocked: true });

            expect(res.status).toBe(500);
        });
    });

    // ── GET /api/admin/donations ─────────────────────────────────────────
    describe('GET /api/admin/donations', () => {
        it('returns paginated donation list with default pagination', async () => {
            const mockDonations = [
                { _id: 'd1', foodType: 'Rice', status: 'available' },
                { _id: 'd2', foodType: 'Pasta', status: 'reserved' },
            ];
            mockDonationFindChain(mockDonations);
            (FoodDonation.countDocuments as jest.Mock).mockResolvedValue(2);

            const res = await request(app)
                .get('/api/admin/donations')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(res.status).toBe(200);
            expect(res.body.donations).toHaveLength(2);
            expect(res.body.pagination).toMatchObject({ page: 1, limit: 20, total: 2, pages: 1 });
        });

        it('filters donations by status query param', async () => {
            mockDonationFindChain([]);
            (FoodDonation.countDocuments as jest.Mock).mockResolvedValue(0);

            await request(app)
                .get('/api/admin/donations?status=available')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(FoodDonation.find).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'available' })
            );
        });

        it('does not filter when status=all', async () => {
            mockDonationFindChain([]);
            (FoodDonation.countDocuments as jest.Mock).mockResolvedValue(0);

            await request(app)
                .get('/api/admin/donations?status=all')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(FoodDonation.find).toHaveBeenCalledWith({});
        });

        it('caps limit at 50', async () => {
            mockDonationFindChain([]);
            (FoodDonation.countDocuments as jest.Mock).mockResolvedValue(0);

            const res = await request(app)
                .get('/api/admin/donations?limit=999')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(res.body.pagination.limit).toBe(50);
        });

        it('returns 401 when unauthenticated', async () => {
            const res = await request(app).get('/api/admin/donations');
            expect(res.status).toBe(401);
        });

        it('returns 403 for non-admin users', async () => {
            const res = await request(app)
                .get('/api/admin/donations')
                .set('Authorization', `Bearer ${DONOR_TOKEN}`);
            expect(res.status).toBe(403);
        });

        it('returns 500 on database error', async () => {
            (FoodDonation.find as jest.Mock).mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockRejectedValue(new Error('DB Error')),
            });
            (FoodDonation.countDocuments as jest.Mock).mockResolvedValue(0);

            const res = await request(app)
                .get('/api/admin/donations')
                .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

            expect(res.status).toBe(500);
            expect(res.body.message).toBe('Server Error');
        });
    });
});
