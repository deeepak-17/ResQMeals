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
            coordinates: {
                type: [Number],
                required: true,
                validate: {
                    validator: (coords: number[]) => {
                        return coords.length === 2 &&
                            coords[0] >= -180 && coords[0] <= 180 &&
                            coords[1] >= -90 && coords[1] <= 90;
                    },
                    message: "Coordinates must be [longitude, latitude] with valid ranges (-180 to 180, -90 to 90)"
                }
            }, // [longitude, latitude]
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
(FoodDonationSchema as any).pre("save", function (this: any, next: any) {
    const doc = this as unknown as IFoodDonation;
    // Only set default if expiryTime is NOT provided
    if (!doc.expiryTime && doc.preparedTime) {
        const preparedDate = new Date(doc.preparedTime);
        doc.expiryTime = new Date(preparedDate.getTime() + 4 * 60 * 60 * 1000); // +4 hours
    }
    next();
});

// Hook for findOneAndUpdate to handle expiryTime on updates
(FoodDonationSchema as any).pre("findOneAndUpdate", function (this: any, next: any) {
    const update = this.getUpdate() as any;
    if (update) {
        // If updating preparedTime (via $set or direct), recalculate expiryTime if not explicitly set
        const preparedTime = update.preparedTime || (update.$set && update.$set.preparedTime);
        const expiryTime = update.expiryTime || (update.$set && update.$set.expiryTime);

        if (preparedTime && !expiryTime) {
            const preparedDate = new Date(preparedTime);
            const newExpiry = new Date(preparedDate.getTime() + 4 * 60 * 60 * 1000);

            if (update.$set) {
                update.$set.expiryTime = newExpiry;
            } else {
                update.expiryTime = newExpiry;
            }
        }
    }
    next();
});

// Index for geospatial queries
FoodDonationSchema.index({ location: "2dsphere" });

export default mongoose.model<IFoodDonation>("FoodDonation", FoodDonationSchema);
