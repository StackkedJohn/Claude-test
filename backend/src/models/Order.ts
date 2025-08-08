import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface IOrderTotals {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
}

export interface IOrderPayment {
  method: string; // 'stripe', 'apple_pay', 'google_pay', etc.
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  completedAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
}

export interface IOrderCustomer {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface IOrderShipping {
  firstName?: string;
  lastName?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer: IOrderCustomer;
  shipping: IOrderShipping;
  items: IOrderItem[];
  payment: IOrderPayment;
  totals: IOrderTotals;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'failed';
  orderDate: Date;
  shippedDate?: Date;
  deliveredDate?: Date;
  trackingNumber?: string;
  trackingStatus?: string;
  shippingCarrier?: string;
  shippingMethod?: string;
  carbonFootprint?: {
    co2Grams: number;
    offsetCost: number;
    ecoFriendly: boolean;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customer: {
    email: { type: String, required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String }
  },
  shipping: {
    firstName: { type: String },
    lastName: { type: String },
    address1: { type: String, required: true },
    address2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'US' },
    phone: { type: String }
  },
  items: [{
    productId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 }
  }],
  payment: {
    method: { 
      type: String, 
      required: true,
      enum: ['stripe', 'apple_pay', 'google_pay', 'klarna', 'affirm']
    },
    stripePaymentIntentId: { type: String, index: true },
    stripeCustomerId: { type: String },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'usd' },
    status: { 
      type: String, 
      required: true,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    completedAt: { type: Date },
    refundedAt: { type: Date },
    refundAmount: { type: Number, min: 0 }
  },
  totals: {
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 }
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed'],
    default: 'pending',
    index: true
  },
  orderDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  shippedDate: { type: Date },
  deliveredDate: { type: Date },
  trackingNumber: { type: String, index: true },
  trackingStatus: { type: String },
  shippingCarrier: { type: String },
  shippingMethod: { type: String },
  carbonFootprint: {
    co2Grams: { type: Number },
    offsetCost: { type: Number },
    ecoFriendly: { type: Boolean }
  },
  notes: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
OrderSchema.index({ 'customer.email': 1, orderDate: -1 });
OrderSchema.index({ status: 1, orderDate: -1 });
OrderSchema.index({ 'payment.stripePaymentIntentId': 1 });
OrderSchema.index({ orderNumber: 1 });

// Virtual for customer full name
OrderSchema.virtual('customer.fullName').get(function() {
  return `${this.customer.firstName} ${this.customer.lastName}`;
});

// Virtual for shipping full name
OrderSchema.virtual('shipping.fullName').get(function() {
  const firstName = this.shipping.firstName || this.customer.firstName;
  const lastName = this.shipping.lastName || this.customer.lastName;
  return `${firstName} ${lastName}`;
});

// Virtual for formatted order date
OrderSchema.virtual('formattedOrderDate').get(function() {
  return this.orderDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for order age in days
OrderSchema.virtual('daysSinceOrder').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.orderDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Methods
OrderSchema.methods.markAsShipped = function(trackingNumber?: string) {
  this.status = 'shipped';
  this.shippedDate = new Date();
  if (trackingNumber) {
    this.trackingNumber = trackingNumber;
  }
  return this.save();
};

OrderSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.deliveredDate = new Date();
  return this.save();
};

OrderSchema.methods.cancel = function(reason?: string) {
  this.status = 'cancelled';
  if (reason) {
    this.notes = this.notes ? `${this.notes}\n\nCancellation: ${reason}` : `Cancelled: ${reason}`;
  }
  return this.save();
};

// Static methods for analytics
OrderSchema.statics.getOrderStats = async function(startDate: Date, endDate: Date) {
  const pipeline = [
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled', 'failed'] }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totals.total' },
        averageOrderValue: { $avg: '$totals.total' },
        totalItemsSold: { 
          $sum: { 
            $sum: '$items.quantity' 
          } 
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    totalItemsSold: 0
  };
};

OrderSchema.statics.getTopProducts = async function(startDate: Date, endDate: Date, limit = 10) {
  const pipeline = [
    {
      $match: {
        orderDate: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled', 'failed'] }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        productName: { $first: '$items.name' },
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.total' }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit }
  ];

  return await this.aggregate(pipeline);
};

// Pre-save middleware
OrderSchema.pre('save', function(next) {
  // Validate totals match
  const calculatedTotal = this.totals.subtotal + this.totals.tax + this.totals.shipping - this.totals.discount;
  const tolerance = 0.01; // Allow for small rounding differences
  
  if (Math.abs(calculatedTotal - this.totals.total) > tolerance) {
    next(new Error(`Order total mismatch: calculated ${calculatedTotal}, provided ${this.totals.total}`));
    return;
  }

  // Validate payment amount matches total
  if (Math.abs(this.payment.amount - this.totals.total) > tolerance) {
    next(new Error(`Payment amount mismatch: payment ${this.payment.amount}, order total ${this.totals.total}`));
    return;
  }

  next();
});

export const Order = mongoose.model<IOrder>('Order', OrderSchema);