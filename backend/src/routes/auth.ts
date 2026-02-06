import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import User, { IUser } from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { registerValidation, loginValidation } from "../middleware/validation";

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", registerValidation, async (req: Request, res: Response): Promise<void> => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }

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
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET as string,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// @route   POST /api/auth/login
// @desc    Auth user & get token
// @access  Public
router.post("/login", loginValidation, async (req: Request, res: Response): Promise<void> => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }

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
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET as string,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, role: user?.role });
            }
        );
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
