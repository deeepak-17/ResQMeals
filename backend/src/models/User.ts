import mongoose, { Schema, Document } from "mongoose";
import { USER_ROLES, ORGANIZATION_TYPES, UserRole, OrganizationType } from "../constants";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string; // Required for this specific model - consider using partial for responses
    role: UserRole;
    verified: boolean;
    organizationType?: OrganizationType;
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
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model<IUser>("User", UserSchema);
