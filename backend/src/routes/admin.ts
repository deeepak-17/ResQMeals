import express from "express";
import { authMiddleware } from "../middleware/auth";
import { roleMiddleware } from "../middleware/role";
import { getAllUsers, verifyUser, blockUser } from "../controllers/adminController";

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(roleMiddleware("admin"));

// @route   GET /api/admin/users
// @desc    List all users (supports ?role=donor&verified=true&page=1&limit=20)
// @access  Admin only
router.get("/users", getAllUsers);

// @route   PUT /api/admin/users/:id/verify
// @desc    Verify a user account
// @access  Admin only
router.put("/users/:id/verify", verifyUser);

// @route   PUT /api/admin/users/:id/block
// @desc    Block or unblock a user (send { blocked: true/false })
// @access  Admin only
router.put("/users/:id/block", blockUser);

import { getAllDonations } from "../controllers/adminController";
// @route   GET /api/admin/donations
// @desc    List all donations (supports ?status=available&page=1&limit=20)
// @access  Admin only
router.get("/donations", getAllDonations);

export default router;
