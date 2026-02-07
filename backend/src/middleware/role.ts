import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

/**
 * Role-based access control middleware.
 * Checks if the authenticated user has one of the allowed roles.
 * Must be used AFTER authMiddleware.
 */
export const roleMiddleware = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized: User not authenticated" });
            return;
        }

        // The user object from JWT contains { user: { id: string } }
        // We need to fetch the user's role from DB or include it in JWT
        // For now, assuming role is included in JWT payload
        const userRole = req.user.role;

        if (!userRole || !allowedRoles.includes(userRole)) {
            res.status(403).json({
                message: "Access denied: Insufficient permissions",
                required: allowedRoles,
                current: userRole || "unknown"
            });
            return;
        }

        next();
    };
};
