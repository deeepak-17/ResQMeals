import mongoose, { Schema, Document } from "mongoose";

export interface IFoodDonation extends Document {
    donorId: mongoose.Schema.Types.ObjectId;
    foodType: string;
    quantity: string;
    preparedTime: Date;
    expiryTime: Date;
    location: string;
    status: 'available' | 'claimed' | 'picked_up' | 'delivered' | 'expired';
    imageUrl?: string;
    createdAt: Date;
}

const FoodDonationSchema: Schema = new Schema({
    donorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    foodType: { type: String, required: true },
    quantity: { type: String, required: true },
    preparedTime: { type: Date, required: true },
    expiryTime: { type: Date, required: true },
    location: { type: String, required: true },
    status: {
        type: String,
        enum: ['available', 'claimed', 'picked_up', 'delivered', 'expired'],
        default: 'available'
    },
    imageUrl: { type: String },
    createdAt: { type: Date, default: Date.now }
});



export default mongoose.model<IFoodDonation>("FoodDonation", FoodDonationSchema);
