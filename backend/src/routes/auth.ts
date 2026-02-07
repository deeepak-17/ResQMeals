import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User, { IUser } from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { registerValidation, loginValidation } from "../middleware/validation";

const router = express.Router();

// Rate limiter for login endpoint - stricter limits to prevent brute force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: "Too many login attempts from this IP, please try again after 15 minutes",
});

// Rate limiter for registration endpoint - prevent spam registrations
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 registration requests per windowMs
    message: "Too many accounts created from this IP, please try again after an hour",
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", registerLimiter, async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, role, organizationType } = req.body;

    try {
        let user = await User.findOne({ email });

        if (user) {
            res.status(400).json({ message: "User already exists" });
            return;
        }

        user = new User({
            name,
            email,
            password,
            role,
            organizationType,
            // NOTE: Only donors are auto-verified on registration.
            // According to docs/BACKEND_STRUCTURE.md, NGO and volunteer accounts
            // must go through a separate verification workflow (e.g. manual/admin
            // review or a dedicated verification flow) before being marked as
            // verified in the system. They are therefore created as unverified
            // here and handled by that workflow.
            verified: role === 'donor'
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id
            },
            role: user.role
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET as string,
            { expiresIn: 3600 } // 1 hour in seconds
        );
        res.json({ token });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/auth/login
// @desc    Auth user & get token
// @access  Public
router.post("/login", loginLimiter, async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (!user) {
            res.status(400).json({ message: "Invalid Credentials" });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password as string);

        if (!isMatch) {
            res.status(400).json({ message: "Invalid Credentials" });
            return;
        }

        const payload = {
            user: {
                id: user.id
            },
            role: user.role
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET as string,
            { expiresIn: 3600 } // 1 hour in seconds
        );
        res.json({ token, role: user?.role });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// @route   GET /api/auth/me
// @desc    Get logged in user
// @access  Private
router.get("/me", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.user.user.id).select("-password");
        res.json(user);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

export default router;
