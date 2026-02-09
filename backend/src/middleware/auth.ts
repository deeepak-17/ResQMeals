import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request to include user
interface JwtPayload {
    user: {
        id: string;
        role: string;
    };
    iat?: number;
    exp?: number;
}

export interface AuthRequest extends Request {
    user?: JwtPayload;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    // Check if not token
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

        const decoded = jwt.verify(token, secret) as JwtPayload;
        req.user = decoded;
        next();
    } catch (_err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};
