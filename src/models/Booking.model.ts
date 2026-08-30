import mongoose, { Document, Schema } from 'mongoose'

export interface IBooking extends Document {
  customer: mongoose.Types.ObjectId
  driver?: mongoose.Types.ObjectId
  status: 'pending' | 'offered' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'disputed'
  
  // Pickup details
  pickupAddress: string
  pickupCity: string
  pickupState?: string
  pickupZipCode: string
  pickupDate: Date
  pickupTime: string
  
  // Delivery details
  deliveryAddress: string
  deliveryCity: string
  deliveryState?: string
  deliveryZipCode: string
  
  // Service details
  serviceType: 'local' | 'long-distance' | 'interstate'
  vehicleType: 'small-van' | 'medium-van' | 'large-van' | 'truck'
  items?: {
    name: string
    quantity: number
    description?: string
  }[]
  
  // Pricing
  estimatedPrice: number
  finalPrice?: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  paymentMethod?: string
  paymentReference?: string
  amountPaid?: number
  paymentDate?: Date
  idempotencyKey?: string
  sourceSystem?: string
  eventVersion?: string
  
  // Order details
  orderCode?: string
  miles?: number
  durationRequired?: string
  collectionStairs?: string
  deliveryStairs?: string
  helpersLabel?: string
  vanSize?: string
  manRequired?: string
  hours?: number
  men?: number
  vans?: number
  
  // Additional info
  specialInstructions?: string
  contactPhone: string
  contactEmail: string
  
  // Driver job completion
  completionPictures?: string[]
  driverNotes?: string
  
  // Additional work payment
  additionalWorkPayment?: number
  additionalWorkDescription?: string
  
  // Notes/log section for admin
  notes?: {
    text: string
    createdBy: mongoose.Types.ObjectId
    createdAt: Date
    type?: 'call' | 'issue' | 'general'
  }[]
  
  // Dispute
  isDisputed?: boolean
  disputeReason?: string
  disputeResolved?: boolean
  
  // Job offers to drivers
  offeredToDrivers?: mongoose.Types.ObjectId[]
  driverOffers?: {
    driver: mongoose.Types.ObjectId
    offeredPrice: number
    status: 'pending' | 'accepted' | 'rejected' | 'superseded' | 'expired'
    offeredAt: Date
    respondedAt?: Date
  }[]
  offerExpiresAt?: Date

  assignedAt?: Date
  assignedBy?: mongoose.Types.ObjectId
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

const bookingSchema = new Schema<IBooking>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer is required'],
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'offered', 'confirmed', 'in-progress', 'completed', 'cancelled', 'disputed'],
      default: 'pending',
    },
    pickupAddress: {
      type: String,
      required: [true, 'Pickup address is required'],
    },
    pickupCity: {
      type: String,
      required: [true, 'Pickup city is required'],
    },
    pickupState: {
      type: String,
    },
    pickupZipCode: {
      type: String,
      required: [true, 'Pickup zip code is required'],
    },
    pickupDate: {
      type: Date,
      required: [true, 'Pickup date is required'],
    },
    pickupTime: {
      type: String,
      required: [true, 'Pickup time is required'],
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Delivery address is required'],
    },
    deliveryCity: {
      type: String,
      required: [true, 'Delivery city is required'],
    },
    deliveryState: {
      type: String,
    },
    deliveryZipCode: {
      type: String,
      required: [true, 'Delivery zip code is required'],
    },
    serviceType: {
      type: String,
      enum: ['local', 'long-distance', 'interstate'],
      required: [true, 'Service type is required'],
    },
    vehicleType: {
      type: String,
      enum: ['small-van', 'medium-van', 'large-van', 'truck'],
      required: [true, 'Vehicle type is required'],
    },
    items: [
      {
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        description: String,
      },
    ],
    estimatedPrice: {
      type: Number,
      required: [true, 'Estimated price is required'],
      min: 0,
    },
    finalPrice: {
      type: Number,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    paymentMethod: String,
    paymentReference: String,
    amountPaid: {
      type: Number,
      min: 0,
    },
    paymentDate: Date,
    idempotencyKey: String,
    sourceSystem: String,
    eventVersion: String,
    orderCode: String,
    miles: Number,
    durationRequired: String,
    collectionStairs: String,
    deliveryStairs: String,
    helpersLabel: String,
    vanSize: String,
    manRequired: String,
    hours: {
      type: Number,
      min: 1,
    },
    men: {
      type: Number,
      min: 1,
    },
    vans: {
      type: Number,
      min: 1,
      default: 1,
    },
    specialInstructions: String,
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
    },
    completionPictures: [String],
    driverNotes: String,
    additionalWorkPayment: {
      type: Number,
      min: 0,
    },
    additionalWorkDescription: String,
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
    isDisputed: {
      type: Boolean,
      default: false,
    },
    disputeReason: String,
    disputeResolved: {
      type: Boolean,
      default: false,
    },
    offeredToDrivers: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    driverOffers: [{
      driver: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      offeredPrice: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'superseded', 'expired'],
        default: 'pending',
      },
      offeredAt: {
        type: Date,
        default: Date.now,
      },
      respondedAt: Date,
    }],
    offerExpiresAt: Date,
    assignedAt: Date,
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    completedAt: Date,
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
bookingSchema.index({ customer: 1, createdAt: -1 })
bookingSchema.index({ driver: 1, status: 1 })
bookingSchema.index({ status: 1 })
bookingSchema.index({ orderCode: 1 }, { sparse: true, unique: true })
bookingSchema.index({ paymentReference: 1 }, { sparse: true, unique: true })
bookingSchema.index({ idempotencyKey: 1 }, { sparse: true, unique: true })

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema)

