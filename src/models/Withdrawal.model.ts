import mongoose, { Document, Schema } from 'mongoose'

export interface IWithdrawal extends Document {
  driver: mongoose.Types.ObjectId
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  note?: string
  adminNote?: string
  processedBy?: mongoose.Types.ObjectId
  processedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending',
      index: true,
    },
    note: String,
    adminNote: String,
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    processedAt: Date,
  },
  { timestamps: true }
)

export const Withdrawal = mongoose.model<IWithdrawal>('Withdrawal', withdrawalSchema)
