import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from './auth';

/**
 * JWT authentication middleware (alternative import path).
 * Re-exports the same auth pattern as ./auth.ts for consistency.
 * 
 * NOTE: In development, if no JWT_SECRET is configured, this will
 * reject all requests. Use proper .env setup.
 */

interface JwtPayload {
    id: string;
    role: string;
    iat?: number;
    exp?: number;
}

function isJwtPayload(decoded: any): decoded is JwtPayload {
    return (
        typeof decoded === 'object' &&
        decoded !== null &&
        'id' in decoded &&
        typeof decoded.id === 'string' &&
        'role' in decoded &&
        typeof decoded.role === 'string'
    );
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'No token, authorization denied' });
        return;
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
        res.status(401).json({ message: 'No token, authorization denied' });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('JWT_SECRET is not configured');
            res.status(500).json({ message: 'Server configuration error' });
            return;
        }

        const decoded = jwt.verify(token, secret);

        if (isJwtPayload(decoded)) {
            req.user = decoded;
            next();
        } else {
            console.error('Invalid token structure:', decoded);
            res.status(401).json({ message: 'Invalid token structure' });
        }
    } catch {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
