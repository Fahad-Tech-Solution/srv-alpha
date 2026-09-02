import mongoose, { Document, Schema, SchemaTypes } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  email: string
  password: string
  name: string
  username?: string
  role: 'customer' | 'driver' | 'admin'
  phone?: string
  address?: string
  businessName?: string
  isActive: boolean
  // Driver-specific fields
  drivingLicence?: string
  goodsInTransitInsurance?: string
  publicLiability?: string
  proofOfAddress?: string
  // Vehicle details
  vehiclePhoto?: string
  vehicleRegistration?: string
  vehicleCategory?: 'small-van' | 'medium-van' | 'large-van' | 'truck'
  vehicleMake?: string
  vehicleModel?: string
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
  vehicleFuelType?: 'petrol' | 'diesel' | 'lpg' | 'hybrid' | 'electric' // in kg
  // Bank details
  bankDetails?: {
    accountName?: string
    accountNumber?: string
    sortCode?: string
    bankName?: string
    bankStatement?: string // URL to uploaded document
  }
  // Pricing rules acceptance
  pricingRulesAccepted?: boolean
  pricingRulesAcceptedAt?: Date
  // Notes/log section for admin
  notes?: {
    text: string
    createdBy: mongoose.Types.ObjectId
    createdAt: Date
    type?: 'call' | 'issue' | 'general'
  }[]
  // Paid-booking onboarding invite
  firstAccessToken?: string
  firstAccessExpires?: Date
  // Driver application workflow
  applicationStatus?: 'pending' | 'approved' | 'rejected'
  applicationSubmittedAt?: Date
  applicationReviewedAt?: Date
  applicationReviewNote?: string
  introductionVideoUrl?: string
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['customer', 'driver', 'admin'],
      default: 'customer',
    },
    phone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    firstAccessToken: {
      type: String,
      select: false,
    },
    firstAccessExpires: {
      type: Date,
      select: false,
    },
    applicationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
    },
    applicationSubmittedAt: Date,
    applicationReviewedAt: Date,
    applicationReviewNote: {
      type: String,
      trim: true,
    },
    introductionVideoUrl: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    address: {
      type: String,
      trim: true,
    },
    businessName: {
      type: String,
      trim: true,
    },
    // Driver-specific fields
    drivingLicence: {
      type: String,
      trim: true,
    },
    goodsInTransitInsurance: {
      type: String,
      trim: true,
    },
    publicLiability: {
      type: String,
      trim: true,
    },
    proofOfAddress: {
      type: String,
      trim: true,
    },
    // Vehicle details
    vehiclePhoto: {
      type: String,
      trim: true,
    },
    vehicleRegistration: {
      type: String,
      trim: true,
    },
    vehicleCategory: {
      type: String,
      enum: ['small-van', 'medium-van', 'large-van', 'truck'],
      trim: true,
    },
    vehicleMake: {
      type: String,
      trim: true,
    },
    vehicleModel: {
      type: String,
      trim: true,
    },
    vehicleSeats: {
      type: Number,
    },
    vehicleBaseLocation: {
      type: String,
      trim: true,
    },
    vehicleRegistrationDocumentType: {
      type: String,
      enum: ['logbook', 'mot', 'v5'],
      trim: true,
    },
    vehicleRegistrationDocument: {
      type: String,
      trim: true,
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
    // Bank details
    bankDetails: {
      accountName: String,
      accountNumber: String,
      sortCode: String,
      bankName: String,
      bankStatement: String, // URL to uploaded document
    },
    // Pricing rules acceptance
    pricingRulesAccepted: {
      type: Boolean,
      default: false,
    },
    pricingRulesAcceptedAt: Date,
    // Notes/log section
    notes: [{
      text: {
        type: String,
        required: true,
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      type: {
        type: String,
        enum: ['call', 'issue', 'general'],
        default: 'general',
      },
    }],
  },
  {
    timestamps: true,
  }
)

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error as Error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

export const User = mongoose.model<IUser>('User', userSchema)

