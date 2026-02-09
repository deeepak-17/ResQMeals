import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// JWT payload structure: { user: { id: string }, role: string }
export interface UserPayload {
    user: {
        id: string;
    };
    role: string;
}

// Extend Express Request to include typed user payload
export interface AuthRequest extends Request {
    user?: UserPayload;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => { // Return type void, handle response with res methods
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        res.status(401).json({ message: "No token, authorization denied" });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as UserPayload;
        req.user = decoded;
        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            console.error("JWT verification failed: token expired", { message: err.message });
        } else if (err instanceof jwt.JsonWebTokenError) {
            console.error("JWT verification failed: invalid token", { message: err.message });
        } else {
            console.error("JWT verification failed with unexpected error", err);
        }
        res.status(401).json({ message: "Token is not valid" });
    }
};
