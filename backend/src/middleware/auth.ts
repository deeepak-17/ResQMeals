import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request to include user
export interface AuthRequest extends Request {
    user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => { // Return type void, handle response with res methods
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        res.status(401).json({ message: "No token, authorization denied" });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
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
