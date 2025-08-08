// Product review model with photo uploads and moderation
import mongoose, { Document, Schema } from 'mongoose';

export interface IReviewImage {
  url: string;
  publicId: string; // Cloudinary public ID for deletion
  altText?: string;
  caption?: string;
}

export interface IReview extends Document {
  // Core Review Data
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId; // Link to verified purchase
  
  // Review Content
  rating: number; // 1-5 stars
  title: string;
  content: string;
  images: IReviewImage[];
  
  // Adventure Context (specific to ICEPACA)
  useCase?: 'camping' | 'fishing' | 'lunch' | 'picnic' | 'marine' | 'sports' | 'medical' | 'other';
  duration?: string; // How long it kept things cold
  location?: string; // Where they used it
  
  // Moderation
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderatorId?: mongoose.Types.ObjectId;
  moderatorNotes?: string;
  moderatedAt?: Date;
  
  // Spam Detection
  spamScore: number; // 0-100, higher = more likely spam
  spamFlags: string[]; // Reasons for flagging
  
  // Engagement
  helpfulVotes: number;
  helpfulBy: mongoose.Types.ObjectId[]; // Users who marked as helpful
  flaggedBy: mongoose.Types.ObjectId[]; // Users who flagged as inappropriate
  
  // Verification
  verifiedPurchase: boolean;
  purchaseDate?: Date;
  
  // Metadata
  featured: boolean; // Featured on homepage/marketing
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getAverageUseDuration(): string;
  isFromVerifiedBuyer(): boolean;
}

const ReviewImageSchema = new Schema<IReviewImage>({
  url: { 
    type: String, 
    required: true,
    maxlength: 500 
  },
  publicId: { 
    type: String, 
    required: true,
    maxlength: 200 
  },
  altText: { 
    type: String,
    maxlength: 200 
  },
  caption: { 
    type: String,
    maxlength: 500 
  }
});

const ReviewSchema = new Schema<IReview>({
  // Core Review Data
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    index: true
  },
  
  // Review Content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    minlength: 5
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
    minlength: 10
  },
  images: [ReviewImageSchema],
  
  // Adventure Context
  useCase: {
    type: String,
    enum: ['camping', 'fishing', 'lunch', 'picnic', 'marine', 'sports', 'medical', 'other'],
    index: true
  },
  duration: {
    type: String,
    maxlength: 100
  },
  location: {
    type: String,
    maxlength: 100
  },
  
  // Moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'pending',
    index: true
  },
  moderatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatorNotes: {
    type: String,
    maxlength: 1000
  },
  moderatedAt: {
    type: Date
  },
  
  // Spam Detection
  spamScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  spamFlags: [{
    type: String,
    enum: [
      'suspicious_language',
      'duplicate_content',
      'fake_profile',
      'promotional_content',
      'off_topic',
      'excessive_caps',
      'suspicious_timing',
      'multiple_reviews_same_user'
    ]
  }],
  
  // Engagement
  helpfulVotes: {
    type: Number,
    default: 0,
    min: 0
  },
  helpfulBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  flaggedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Verification
  verifiedPurchase: {
    type: Boolean,
    default: false
  },
  purchaseDate: {
    type: Date
  },
  
  // Metadata
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1, status: 1 });
ReviewSchema.index({ verifiedPurchase: 1, status: 1 });
ReviewSchema.index({ featured: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ useCase: 1, status: 1 });

// Compound index to prevent duplicate reviews per user per product
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

// Virtual for helpful ratio
ReviewSchema.virtual('helpfulRatio').get(function() {
  const total = this.helpfulVotes + this.flaggedBy.length;
  return total > 0 ? this.helpfulVotes / total : 0;
});

// Virtual for review age in days
ReviewSchema.virtual('reviewAge').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to get average use duration
ReviewSchema.methods.getAverageUseDuration = function(): string {
  if (!this.duration) return 'Not specified';
  
  // Parse common duration patterns
  const duration = this.duration.toLowerCase();
  if (duration.includes('all day') || duration.includes('8') || duration.includes('10')) {
    return '8-10 hours';
  } else if (duration.includes('half day') || duration.includes('4') || duration.includes('6')) {
    return '4-6 hours';
  } else if (duration.includes('hour')) {
    return 'Several hours';
  }
  
  return this.duration;
};

// Method to check if from verified buyer
ReviewSchema.methods.isFromVerifiedBuyer = function(): boolean {
  return this.verifiedPurchase && !!this.orderId;
};

// Static method to get product rating summary
ReviewSchema.statics.getProductRatingSummary = async function(productId: string) {
  const pipeline = [
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        status: 'approved'
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingBreakdown: {
          $push: '$rating'
        },
        verifiedReviews: {
          $sum: { $cond: ['$verifiedPurchase', 1, 0] }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  
  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      verifiedReviews: 0
    };
  }

  const data = result[0];
  
  // Calculate rating breakdown
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  data.ratingBreakdown.forEach((rating: number) => {
    breakdown[rating as keyof typeof breakdown]++;
  });

  return {
    averageRating: Math.round(data.averageRating * 10) / 10, // Round to 1 decimal
    totalReviews: data.totalReviews,
    ratingBreakdown: breakdown,
    verifiedReviews: data.verifiedReviews
  };
};

// Static method for spam detection
ReviewSchema.statics.calculateSpamScore = function(reviewData: any): { score: number, flags: string[] } {
  let spamScore = 0;
  const flags: string[] = [];

  // Check for excessive caps
  const capsRatio = (reviewData.content.match(/[A-Z]/g) || []).length / reviewData.content.length;
  if (capsRatio > 0.3) {
    spamScore += 25;
    flags.push('excessive_caps');
  }

  // Check for promotional content
  const promoKeywords = ['buy', 'discount', 'sale', 'cheap', 'deal', 'offer', 'promo'];
  const hasPromo = promoKeywords.some(keyword => 
    reviewData.content.toLowerCase().includes(keyword)
  );
  if (hasPromo) {
    spamScore += 30;
    flags.push('promotional_content');
  }

  // Check for suspicious language patterns
  const suspiciousPatterns = [
    /amazing{2,}/i,
    /best ever/i,
    /life changing/i,
    /miracle/i
  ];
  const hasSuspiciousLanguage = suspiciousPatterns.some(pattern => 
    pattern.test(reviewData.content)
  );
  if (hasSuspiciousLanguage) {
    spamScore += 20;
    flags.push('suspicious_language');
  }

  // Check review length (too short might be spam)
  if (reviewData.content.length < 20) {
    spamScore += 15;
    flags.push('suspicious_timing');
  }

  return { score: Math.min(spamScore, 100), flags };
};

// Static method to get featured reviews
ReviewSchema.statics.getFeaturedReviews = async function(limit = 6) {
  return this.find({
    status: 'approved',
    featured: true
  })
  .populate('userId', 'firstName lastName avatar')
  .populate('productId', 'name images')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Pre-save middleware for spam detection
ReviewSchema.pre('save', function(next) {
  if (this.isNew && this.status === 'pending') {
    const spamAnalysis = (ReviewSchema.statics as any).calculateSpamScore({
      content: this.content,
      title: this.title
    });
    
    this.spamScore = spamAnalysis.score;
    this.spamFlags = spamAnalysis.flags;
    
    // Auto-flag high spam score reviews
    if (spamAnalysis.score > 70) {
      this.status = 'flagged';
    }
  }
  next();
});

export const Review = mongoose.model<IReview>('Review', ReviewSchema);