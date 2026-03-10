import mongoose, { Schema, Document } from 'mongoose';

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  PICKED = 'picked',
  DELIVERED = 'delivered',
  DECLINED = 'declined',
}

export interface IPickupTask extends Document {
  donationId: mongoose.Types.ObjectId;
  volunteerId?: mongoose.Types.ObjectId;
  ngoId: mongoose.Types.ObjectId;
  status: TaskStatus;
  assignedAt?: Date;
  pickedAt?: Date;
  deliveredAt?: Date;
  feedback?: string;
  rating?: number;
  priority?: 'Normal' | 'High';
  // Volunteer Epic fields
  pickupWindowStart?: Date;
  pickupWindowEnd?: Date;
  liveLocation?: {
    coordinates: number[]; // [lng, lat]
    updatedAt: Date;
  };
  isEmergency?: boolean;
  emergencyAt?: Date;
  missedPickup?: boolean;
  // User Story 5.3: Chain-of-Custody Tracking
  history: Array<{
    status: TaskStatus;
    timestamp: Date;
    updatedBy?: mongoose.Types.ObjectId;
    location?: { coordinates: number[] };
    note?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const PickupTaskSchema: Schema = new Schema(
  {
    donationId: { type: Schema.Types.ObjectId, ref: 'FoodDonation', required: true },
    volunteerId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    ngoId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.ASSIGNED,
    },
    assignedAt: { type: Date },
    pickedAt: { type: Date },
    deliveredAt: { type: Date },
    feedback: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    priority: { type: String, enum: ['Normal', 'High'], default: 'Normal' },
    // Volunteer Epic fields
    pickupWindowStart: { type: Date },
    pickupWindowEnd: { type: Date },
    liveLocation: {
      coordinates: { type: [Number] },
      updatedAt: { type: Date }
    },
    isEmergency: { type: Boolean, default: false },
    emergencyAt: { type: Date },
    missedPickup: { type: Boolean, default: false },
    // User Story 5.3: Chain-of-Custody Tracking
    history: [
      {
        status: { type: String, enum: Object.values(TaskStatus) },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        location: { coordinates: [Number] },
        note: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IPickupTask>('PickupTask', PickupTaskSchema);
