import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    role: 'donor' | 'ngo' | 'volunteer' | 'admin';
    verified: boolean;
    organizationType?: 'restaurant' | 'canteen' | 'event' | 'shelter' | 'individual'; // Added based on BACKEND_STRUCTURE.md
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['donor', 'ngo', 'volunteer', 'admin'],
        default: 'donor'
    },
    verified: { type: Boolean, default: false }, // Admin/System approval status
    organizationType: {
        type: String,
        enum: ['restaurant', 'canteen', 'event', 'shelter', 'individual'],
        required: false
    },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>("User", UserSchema);
