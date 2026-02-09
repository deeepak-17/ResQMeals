import { body, ValidationChain } from "express-validator";
import { USER_ROLES, ORGANIZATION_TYPES } from "../constants";

// Validation rules for user registration
export const registerValidation: ValidationChain[] = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required")
        .isLength({ min: 2, max: 100 })
        .withMessage("Name must be between 2 and 100 characters"),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address")
        .normalizeEmail(),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
        .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"),

    body("role")
        .notEmpty()
        .withMessage("Role is required")
        .isIn(USER_ROLES)
        .withMessage(`Role must be one of: ${USER_ROLES.join(", ")}`),

    body("organizationType")
        .optional()
        .isIn(ORGANIZATION_TYPES)
        .withMessage(`Organization type must be one of: ${ORGANIZATION_TYPES.join(", ")}`)
];

// Validation rules for user login
export const loginValidation: ValidationChain[] = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Please provide a valid email address")
        .normalizeEmail(),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
];
