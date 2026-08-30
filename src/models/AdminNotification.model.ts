import mongoose, { Document, Schema } from 'mongoose'

export type AdminNotificationType =
  | 'offer_accepted'
  | 'offer_rejected'
  | 'general'

export interface IAdminNotification extends Document {
  type: AdminNotificationType
  title: string
  message: string
  booking?: mongoose.Types.ObjectId
  driver?: mongoose.Types.ObjectId
  driverName?: string
  jobId?: string
  jobName?: string
  orderCode?: string
  offeredPrice?: number
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const adminNotificationSchema = new Schema<IAdminNotification>(
  {
    type: {
      type: String,
      enum: ['offer_accepted', 'offer_rejected', 'general'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    driverName: String,
    jobId: String,
    jobName: String,
    orderCode: String,
    offeredPrice: Number,
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

adminNotificationSchema.index({ createdAt: -1 })
adminNotificationSchema.index({ isRead: 1, createdAt: -1 })

export const AdminNotification = mongoose.model<IAdminNotification>(
  'AdminNotification',
  adminNotificationSchema
)
