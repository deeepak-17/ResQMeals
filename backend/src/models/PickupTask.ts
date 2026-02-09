import mongoose, { Schema, Document } from 'mongoose';

export enum TaskStatus {
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  PICKED = 'picked',
  DELIVERED = 'delivered',
  DECLINED = 'declined',
}

export interface IPickupTask extends Document {
  donationId: mongoose.Types.ObjectId;
  volunteerId: mongoose.Types.ObjectId;
  status: TaskStatus;
  assignedAt: Date;
  pickedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PickupTaskSchema: Schema = new Schema(
  {
    donationId: { type: Schema.Types.ObjectId, ref: 'FoodDonation', required: true },
    volunteerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.ASSIGNED,
    },
    assignedAt: { type: Date, default: Date.now },
    pickedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IPickupTask>('PickupTask', PickupTaskSchema);
