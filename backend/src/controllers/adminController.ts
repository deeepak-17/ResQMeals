import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../models/User";

/**
 * GET /api/admin/users
 * List all users (admin only).
 * Supports optional query params: role, verified, page, limit
 */
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { role, verified, page = "1", limit = "20" } = req.query;

        const filter: Record<string, any> = {};
        if (role && typeof role === "string") {
            filter.role = role;
        }
        if (verified !== undefined) {
            filter.verified = verified === "true";
        }

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [users, total] = await Promise.all([
            User.find(filter)
                .select("-password")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            User.countDocuments(filter),
        ]);

        res.json({
            users,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
            },
        });
    } catch (error: any) {
        console.error("getAllUsers error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

/**
 * PUT /api/admin/users/:id/verify
 * Verify a user account (set verified = true).
 */
export const verifyUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndUpdate(
            id,
            { verified: true },
            { new: true }
        ).select("-password");

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json({
            message: `User '${user.name}' has been verified`,
            user,
        });
    } catch (error: any) {
        console.error("verifyUser error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

/**
 * PUT /api/admin/users/:id/block
 * Block or unblock a user. Toggles the verified field to false (blocked) or true (unblocked).
 * Accepts { blocked: true/false } in request body.
 */
export const blockUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { blocked } = req.body;

        if (typeof blocked !== "boolean") {
            res.status(400).json({ message: "'blocked' field (boolean) is required in request body" });
            return;
        }

        // Prevent admin from blocking themselves
        if (req.user?.id === id) {
            res.status(400).json({ message: "You cannot block yourself" });
            return;
        }

        const user = await User.findByIdAndUpdate(
            id,
            { verified: !blocked }, // blocked = true means verified = false
            { new: true }
        ).select("-password");

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json({
            message: `User '${user.name}' has been ${blocked ? "blocked" : "unblocked"}`,
            user,
        });
    } catch (error: any) {
        console.error("blockUser error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};
