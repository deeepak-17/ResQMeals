import mongoose, { Schema, Document } from "mongoose";

export interface IFoodDonation extends Document {
    donorId: mongoose.Schema.Types.ObjectId;
    foodType: string;
    quantity: string;
    preparedTime: Date;
    expiryTime: Date;
    location: {
        type: string;
        coordinates: number[];
    };
    status: "available" | "reserved" | "collected" | "expired";
    imageUrl?: string;
    // NGO workflow fields
    reservedBy?: mongoose.Schema.Types.ObjectId;
    reservedAt?: Date;
    collectedAt?: Date;
    createdAt: Date;
}

const FoodDonationSchema = new Schema<IFoodDonation>(
    {
        donorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        foodType: { type: String, required: true },
        quantity: { type: String, required: true },
        preparedTime: { type: Date, required: true },
        expiryTime: { type: Date },
        location: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], required: true }, // [longitude, latitude]
        },
        status: {
            type: String,
            enum: ["available", "reserved", "collected", "expired"],
            default: "available",
        },
        imageUrl: { type: String },
        // NGO workflow fields
        reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reservedAt: { type: Date },
        collectedAt: { type: Date },
    },
    { timestamps: true }
);

// Auto-calculate expiryTime if not provided (default +4 hours from preparedTime)
FoodDonationSchema.pre("save", function (next: any) {
    const doc = this as unknown as IFoodDonation;
    if (!doc.expiryTime && doc.preparedTime) {
        const preparedDate = new Date(doc.preparedTime);
        doc.expiryTime = new Date(preparedDate.getTime() + 4 * 60 * 60 * 1000); // +4 hours
    }
    next();
});

// Index for geospatial queries
FoodDonationSchema.index({ location: "2dsphere" });

export default mongoose.model<IFoodDonation>("FoodDonation", FoodDonationSchema);
