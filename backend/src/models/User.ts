// User model with authentication, profile, and preference management
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAddress {
  id: string;
  label: string; // 'Home', 'Work', 'Vacation House', etc.
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface IUser extends Document {
  // Authentication
  email: string;
  password?: string; // Optional for social login users
  emailVerified: boolean;
  emailVerificationToken?: string;
  
  // Social Login
  googleId?: string;
  facebookId?: string;
  
  // Two-Factor Authentication
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
  
  // Profile
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  dateOfBirth?: Date;
  
  // Preferences
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
    orderUpdates: boolean;
    newsletter: boolean;
    language: string;
    currency: string;
  };
  
  // Addresses
  addresses: IAddress[];
  
  // Wishlist
  wishlist: Array<{
    productId: mongoose.Types.ObjectId;
    addedAt: Date;
    notes?: string;
  }>;
  
  // Account Status
  isActive: boolean;
  isVerified: boolean;
  role: 'customer' | 'admin' | 'moderator';
  
  // Analytics
  lastLoginAt?: Date;
  loginCount: number;
  registrationSource: 'email' | 'google' | 'facebook' | 'guest';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  getFullName(): string;
  getDefaultAddress(): IAddress | null;
  addToWishlist(productId: string, notes?: string): Promise<void>;
  removeFromWishlist(productId: string): Promise<void>;
}

const AddressSchema = new Schema<IAddress>({
  id: { type: String, required: true },
  label: { type: String, required: true, maxlength: 50 },
  firstName: { type: String, required: true, maxlength: 50 },
  lastName: { type: String, required: true, maxlength: 50 },
  company: { type: String, maxlength: 100 },
  address1: { type: String, required: true, maxlength: 200 },
  address2: { type: String, maxlength: 200 },
  city: { type: String, required: true, maxlength: 100 },
  state: { type: String, required: true, maxlength: 50 },
  zipCode: { type: String, required: true, maxlength: 20 },
  country: { type: String, required: true, default: 'US' },
  phone: { type: String, maxlength: 20 },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new Schema<IUser>({
  // Authentication
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 255,
    index: true
  },
  password: {
    type: String,
    minlength: 6,
    maxlength: 255
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false // Don't include in queries by default
  },
  
  // Social Login
  googleId: {
    type: String,
    sparse: true, // Allows multiple null values but unique non-null values
    index: true
  },
  facebookId: {
    type: String,
    sparse: true,
    index: true
  },
  
  // Two-Factor Authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  backupCodes: {
    type: [String],
    select: false
  },
  
  // Profile
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
    maxlength: 500
  },
  phone: {
    type: String,
    maxlength: 20
  },
  dateOfBirth: {
    type: Date
  },
  
  // Preferences
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    marketingEmails: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'USD' }
  },
  
  // Addresses
  addresses: [AddressSchema],
  
  // Wishlist
  wishlist: [{
    productId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Product',
      required: true 
    },
    addedAt: { type: Date, default: Date.now },
    notes: { type: String, maxlength: 500 }
  }],
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'moderator'],
    default: 'customer'
  },
  
  // Analytics
  lastLoginAt: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  registrationSource: {
    type: String,
    enum: ['email', 'google', 'facebook', 'guest'],
    default: 'email'
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorSecret;
      delete ret.backupCodes;
      delete ret.emailVerificationToken;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ facebookId: 1 });
UserSchema.index({ 'wishlist.productId': 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastLoginAt: -1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for wishlist count
UserSchema.virtual('wishlistCount').get(function() {
  return this.wishlist?.length || 0;
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate email verification token
UserSchema.methods.generateEmailVerificationToken = function(): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  return token;
};

// Method to get full name
UserSchema.methods.getFullName = function(): string {
  return `${this.firstName} ${this.lastName}`;
};

// Method to get default address
UserSchema.methods.getDefaultAddress = function(): IAddress | null {
  const defaultAddress = this.addresses.find((addr: IAddress) => addr.isDefault);
  return defaultAddress || (this.addresses.length > 0 ? this.addresses[0] : null);
};

// Method to add to wishlist
UserSchema.methods.addToWishlist = async function(productId: string, notes?: string): Promise<void> {
  // Check if product is already in wishlist
  const existingIndex = this.wishlist.findIndex(
    (item: any) => item.productId.toString() === productId
  );

  if (existingIndex === -1) {
    this.wishlist.push({
      productId,
      addedAt: new Date(),
      notes: notes || ''
    });
    await this.save();
  }
};

// Method to remove from wishlist
UserSchema.methods.removeFromWishlist = async function(productId: string): Promise<void> {
  this.wishlist = this.wishlist.filter(
    (item: any) => item.productId.toString() !== productId
  );
  await this.save();
};

// Static method to find by email
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by social ID
UserSchema.statics.findBySocialId = function(provider: string, socialId: string) {
  const field = provider === 'google' ? 'googleId' : 'facebookId';
  return this.findOne({ [field]: socialId });
};

// Static method to get user analytics
UserSchema.statics.getUserAnalytics = async function(startDate: Date, endDate: Date) {
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        verifiedUsers: {
          $sum: { $cond: ['$emailVerified', 1, 0] }
        },
        socialUsers: {
          $sum: {
            $cond: [
              { $or: ['$googleId', '$facebookId'] },
              1, 0
            ]
          }
        },
        twoFactorUsers: {
          $sum: { $cond: ['$twoFactorEnabled', 1, 0] }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalUsers: 0,
    verifiedUsers: 0,
    socialUsers: 0,
    twoFactorUsers: 0
  };
};

export const User = mongoose.model<IUser>('User', UserSchema);