import mongoose, { Schema, Document } from "mongoose";
import { USER_ROLES, ORGANIZATION_TYPES, UserRole, OrganizationType } from "../constants";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string; // Required for this specific model - consider using partial for responses
    role: UserRole;
    verified: boolean;
    organizationType?: OrganizationType;
    verificationDocument?: string;  // Path to uploaded document
    documentType?: 'registration_cert' | 'tax_exemption' | 'ngo_license';
    location?: {
        type: string;
        coordinates: number[]; // [lng, lat]
        address?: string;
    };
    isAvailable: boolean;
    sustainabilityCredits: number;
    totalDeliveries: number;
    totalDistance: number;
    // User Story 5.4: Volunteer Reliability Scoring
    reliabilityScore: number;
    completedTasks: number;
    totalAssignedTasks: number;
    averageRating: number;
    totalRatings: number;
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: USER_ROLES,
        default: "donor",
    },
    verified: {
        type: Boolean,
        default: false,
    },
    organizationType: {
        type: String,
        enum: ORGANIZATION_TYPES,
        required: function (this: IUser) {
            return this.role === 'donor';
        }
    },
    verificationDocument: {
        type: String
    },
    documentType: {
        type: String,
        enum: ['registration_cert', 'tax_exemption', 'ngo_license']
    },
    location: {
        type: { type: String, enum: ["Point"] },
        coordinates: { type: [Number] }, // [longitude, latitude]
        address: { type: String }
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
    sustainabilityCredits: {
        type: Number,
        default: 0,
    },
    totalDeliveries: {
        type: Number,
        default: 0,
    },
    totalDistance: {
        type: Number,
        default: 0,
    },
    // User Story 5.4: Volunteer Reliability Scoring
    reliabilityScore: {
        type: Number,
        default: 100, // Start with 100% reliability
    },
    completedTasks: {
        type: Number,
        default: 0,
    },
    totalAssignedTasks: {
        type: Number,
        default: 0,
    },
    averageRating: {
        type: Number,
        default: 5, // Start with a 5-star rating maybe? Or 0. Let's do 5 for "Top Rated" feel initially, or 0.
    },
    totalRatings: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Index for geospatial queries
UserSchema.index({ location: "2dsphere" });

export default mongoose.model<IUser>("User", UserSchema);
