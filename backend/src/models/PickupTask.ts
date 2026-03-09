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
  },
  { timestamps: true }
);

export default mongoose.model<IPickupTask>('PickupTask', PickupTaskSchema);
