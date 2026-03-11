import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { roleMiddleware } from '../middleware/role';

describe('Role Middleware', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });

    it('should return 401 if user is not authenticated', () => {
        const middleware = roleMiddleware('admin');
        middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized: User not authenticated' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not in allowed roles', () => {
        mockReq.user = { id: 'user1', role: 'donor' };
        const middleware = roleMiddleware('admin');
        middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() if user role matches allowed role', () => {
        mockReq.user = { id: 'user1', role: 'admin' };
        const middleware = roleMiddleware('admin');
        middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple allowed roles', () => {
        mockReq.user = { id: 'user1', role: 'ngo' };
        const middleware = roleMiddleware('admin', 'ngo', 'volunteer');
        middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny access when user role does not match any allowed roles', () => {
        mockReq.user = { id: 'user1', role: 'donor' };
        const middleware = roleMiddleware('admin', 'ngo');
        middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user with empty role string', () => {
        mockReq.user = { id: 'user1', role: '' };
        const middleware = roleMiddleware('admin');
        middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied' });
    });

    it('should work with single role check for each valid role', () => {
        const roles = ['donor', 'ngo', 'volunteer', 'admin'];
        for (const role of roles) {
            const req = { user: { id: 'user1', role } } as AuthRequest;
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
            const next = jest.fn();

            const middleware = roleMiddleware(role);
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        }
    });
});
