import mongoose, { Document, Schema } from 'mongoose'

export interface IVehicle extends Document {
  driver: mongoose.Types.ObjectId
  vehiclePhoto?: string
  vehicleRegistration: string
  vehicleCategory: 'small-van' | 'medium-van' | 'large-van' | 'truck'
  vehicleMake: string
  vehicleModel: string
  vehicleSeats?: number
  vehicleBaseLocation?: string
  vehicleRegistrationDocumentType?: 'logbook' | 'mot' | 'v5'
  vehicleRegistrationDocument?: string
  vehicleType?: string
  vehicleTotalPayload?: {
    value?: number
    unit?: 'kg' | 'tonnes'
  }
  vehicleLoadingCapacity?: {
    value?: number
    unit?: 'm³' | 'ft³'
  }
  vehicleMaxLength?: {
    value?: number
    unit?: 'm' | 'ft'
  }
  vehicleMotorbikeCapacity?: number
  vehicleTailLift?: boolean
  vehicleTrailer?: boolean
  vehiclePayload?: {
    value?: number
    unit?: 'kg' | 'tonnes'
  }
  vehicleFuelType?: 'petrol' | 'diesel' | 'lpg' | 'hybrid' | 'electric'
  createdAt: Date
  updatedAt: Date
}

const vehicleSchema = new Schema<IVehicle>(
  {
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehiclePhoto: {
      type: String,
    },
    vehicleRegistration: {
      type: String,
      required: [true, 'Vehicle registration is required'],
      trim: true,
      uppercase: true,
    },
    vehicleCategory: {
      type: String,
      enum: ['small-van', 'medium-van', 'large-van', 'truck'],
      required: [true, 'Vehicle category is required'],
    },
    vehicleMake: {
      type: String,
      required: [true, 'Vehicle make is required'],
      trim: true,
    },
    vehicleModel: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
    },
    vehicleSeats: {
      type: Number,
      default: 1,
    },
    vehicleBaseLocation: {
      type: String,
      trim: true,
    },
    vehicleRegistrationDocumentType: {
      type: String,
      enum: ['logbook', 'mot', 'v5'],
    },
    vehicleRegistrationDocument: {
      type: String,
    },
    vehicleType: {
      type: String,
      trim: true,
    },
    vehicleTotalPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    vehicleLoadingCapacity: {
      type: mongoose.Schema.Types.Mixed,
    },
    vehicleMaxLength: {
      type: mongoose.Schema.Types.Mixed,
    },
    vehicleMotorbikeCapacity: {
      type: Number,
      default: 0,
    },
    vehicleTailLift: {
      type: Boolean,
      default: false,
    },
    vehicleTrailer: {
      type: Boolean,
      default: false,
    },
    vehiclePayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    vehicleFuelType: {
      type: String,
      enum: ['petrol', 'diesel', 'lpg', 'hybrid', 'electric'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
vehicleSchema.index({ driver: 1, vehicleRegistration: 1 })

export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema)
