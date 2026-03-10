import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { validationResult, matchedData } from "express-validator";
import User from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { registerValidation, loginValidation } from "../middleware/validation";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = "uploads/verification";
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Create unique filename: user-timestamp-originalExt
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "ngo-" + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Only images (jpeg, jpg, png) and PDFs are allowed!"));
    },
});

const router = express.Router();

// Rate limiter for login endpoint - stricter limits to prevent brute force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 15 login requests per windowMs
    message: "Too many login attempts from this IP, please try again after 15 minutes",
});

// Rate limiter for registration endpoint - prevent spam registrations
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 registration requests per windowMs
    message: "Too many accounts created from this IP, please try again after an hour",
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
// NOTE: upload.single must run BEFORE validation so req.body is populated
router.post("/register", registerLimiter, upload.single('verificationDocument'), registerValidation, async (req: Request, res: Response): Promise<void> => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }

    const { name, email, password, role, organizationType } = matchedData(req);

    // Prevent admin registration — admin is a pre-seeded account only
    if (role === "admin") {
        res.status(403).json({ message: "Admin registration is not allowed" });
        return;
    }

    // DEBUG LOGS
    console.log("📝 Register Request Received");
    console.log("   - Body:", req.body);
    console.log("   - File:", req.file);

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
            verified: role === 'donor',
            verificationDocument: req.file ? req.file.path : undefined,
            documentType: req.body.documentType
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            id: user.id,
            role: user.role,
        };


        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET is not defined");
        }

        jwt.sign(
            payload,
            secret,
            { expiresIn: 3600 },
            (err, token) => {
                if (err) {
                    console.error("JWT Error:", err);
                    res.status(500).json({ message: "Token generation failed" });
                    return;
                }
                res.json({
                    token,
                    user: {
                        id: user?.id,
                        name: user?.name,
                        email: user?.email,
                        role: user?.role,
                        verified: user?.verified,
                    },
                });
            }
        );
    } catch (err) {
        console.error((err as Error).message);
        res.status(500).json({ message: "Server Error" });
    }
});

// @route   POST /api/auth/login
// @desc    Auth user & get token
// @access  Public
router.post("/login", loginLimiter, loginValidation, async (req: Request, res: Response): Promise<void> => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }

    const { email, password } = matchedData(req);

    try {
        const user = await User.findOne({ email });

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
            id: user.id,
            role: user.role,
        };

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET is not defined");
        }

        jwt.sign(
            payload,
            secret,
            { expiresIn: 3600 },
            (err, token) => {
                if (err) {
                    console.error("JWT Error:", err);
                    res.status(500).json({ message: "Token generation failed" });
                    return;
                }
                res.json({
                    token,
                    user: {
                        id: user?.id,
                        name: user?.name,
                        email: user?.email,
                        role: user?.role,
                        verified: user?.verified,
                    },
                });
            }
        );
    } catch (err) {
        console.error((err as Error).message);
        res.status(500).json({ message: "Server Error" });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Invalid token payload" });
            return;
        }

        const user = await User.findById(userId).select("-password");
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json({ data: user });
    } catch (err) {
        console.error("Auth Me Error:", (err as Error).message);
        res.status(500).json({ message: "Server Error" });
    }
});

export default router;
