import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: any;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        // MOCK FOR TESTING: passing a dummy volunteer user with valid ObjectId format
        req.user = { userId: '507f1f77bcf86cd799439011', role: 'volunteer' };
        return next();
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = verified;
        next();
    } catch (err) {
        // Fallback to mock user for development if token is invalid
        req.user = { userId: '507f1f77bcf86cd799439011', role: 'volunteer' };
        next();
    }
};
