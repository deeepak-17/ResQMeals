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

        // JWT payload structure: { user: { id: string }, role: string }
        // Role is included at top level of the decoded token
        const userRole = req.user.role;

        if (!userRole || !allowedRoles.includes(userRole)) {
            // Log details server-side for debugging, don't expose in response
            console.warn(`Access denied: user role '${userRole || "none"}' not in allowed roles [${allowedRoles.join(", ")}]`);
            res.status(403).json({ message: "Access denied" });
            return;
        }

        next();
    };
};
