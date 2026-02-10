import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request to include user
interface JwtPayload {
    id: string;
    role: string;
    iat?: number;
    exp?: number;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
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

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Get token from header
    const authHeader = req.header("Authorization");

    // Check if Authorization header exists
    if (!authHeader) {
        res.status(401).json({ message: "No token, authorization denied" });
        return;
    }

    // Verify it starts with "Bearer "
    if (!authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Invalid authorization scheme" });
        return;
    }

    // Extract and trim the token
    const token = authHeader.slice(7).trim();

    // Check if token is empty after extraction
    if (!token) {
        res.status(401).json({ message: "No token, authorization denied" });
        return;
    }

    // Verify token
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("JWT_SECRET is not configured");
            res.status(500).json({ message: "Server configuration error" });
            return;
        }

        const decoded = jwt.verify(token, secret);

        if (isJwtPayload(decoded)) {
            req.user = decoded;
            next();
        } else {
            console.error("Invalid token structure:", decoded);
            res.status(401).json({ message: "Invalid token structure" });
        }
    } catch {
        res.status(401).json({ message: "Token is not valid" });
    }
};
