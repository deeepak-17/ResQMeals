import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth';

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    const TEST_SECRET = 'test-secret-key';

    beforeEach(() => {
        mockReq = {
            header: jest.fn(),
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
        process.env.JWT_SECRET = TEST_SECRET;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should reject request with no Authorization header', () => {
        (mockReq.header as jest.Mock).mockReturnValue(undefined);

        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'No token, authorization denied' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with non-Bearer authorization scheme', () => {
        (mockReq.header as jest.Mock).mockReturnValue('Basic abc123');

        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid authorization scheme' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with empty Bearer token', () => {
        (mockReq.header as jest.Mock).mockReturnValue('Bearer ');

        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'No token, authorization denied' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
        (mockReq.header as jest.Mock).mockReturnValue('Bearer invalid-token');
        (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('invalid'); });

        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token is not valid' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept request with valid token and set req.user', () => {
        const payload = { id: 'user123', role: 'donor' };
        (mockReq.header as jest.Mock).mockReturnValue('Bearer valid-token');
        (jwt.verify as jest.Mock).mockReturnValue(payload);

        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockReq.user).toEqual(payload);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject token with invalid structure (missing id)', () => {
        const payload = { role: 'donor' }; // Missing id
        (mockReq.header as jest.Mock).mockReturnValue('Bearer valid-token');
        (jwt.verify as jest.Mock).mockReturnValue(payload);

        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token structure' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token with invalid structure (missing role)', () => {
        const payload = { id: 'user123' }; // Missing role
        (mockReq.header as jest.Mock).mockReturnValue('Bearer valid-token');
        (jwt.verify as jest.Mock).mockReturnValue(payload);

        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token structure' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 500 if JWT_SECRET is not configured', () => {
        delete process.env.JWT_SECRET;
        (mockReq.header as jest.Mock).mockReturnValue('Bearer some-token');

        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server configuration error' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token with non-string id', () => {
        const payload = { id: 123, role: 'donor' }; // id is number, not string
        (mockReq.header as jest.Mock).mockReturnValue('Bearer valid-token');
        (jwt.verify as jest.Mock).mockReturnValue(payload);

        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token structure' });
    });

    it('should handle token with extra whitespace', () => {
        const payload = { id: 'user123', role: 'donor' };
        (mockReq.header as jest.Mock).mockReturnValue('Bearer   valid-token  ');
        (jwt.verify as jest.Mock).mockReturnValue(payload);

        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(jwt.verify).toHaveBeenCalledWith('valid-token', TEST_SECRET);
        expect(mockNext).toHaveBeenCalled();
    });
});
