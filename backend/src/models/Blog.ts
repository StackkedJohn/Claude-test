import mongoose, { Document, Schema } from 'mongoose';

// Blog Category Interface
interface IBlogCategory extends Document {
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  parentCategory?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Blog Post Interface
interface IBlogPost extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: {
    url: string;
    alt: string;
    caption?: string;
    source: 'dalle' | 'stock' | 'upload';
    generationPrompt?: string;
  };
  author: mongoose.Types.ObjectId;
  categories: mongoose.Types.ObjectId[];
  tags: string[];
  seoData: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    canonicalUrl?: string;
    openGraphImage?: string;
  };
  status: 'draft' | 'pending_approval' | 'scheduled' | 'published' | 'archived';
  publishedAt?: Date;
  scheduledFor?: Date;
  views: number;
  likes: number;
  shares: number;
  readingTime: number; // in minutes
  relatedProducts: mongoose.Types.ObjectId[];
  aiGenerated: {
    isAIGenerated: boolean;
    researchSources?: string[];
    generationPrompt?: string;
    model: 'openai' | 'xai' | 'manual';
    confidence: number;
    reviewStatus: 'pending' | 'approved' | 'rejected';
    adminNotes?: string;
  };
  performance: {
    ctr: number; // Click-through rate
    conversionRate: number;
    averageTimeOnPage: number;
    bounceRate: number;
  };
  cro: {
    relatedProducts: Array<{
      productId: mongoose.Types.ObjectId;
      relevanceScore: number;
      matchReason: string;
      suggestedPosition: 'inline' | 'sidebar' | 'footer';
      clicks: number;
      conversions: number;
      lastUpdated: Date;
    }>;
    productClickThroughs: number;
    productConversions: number;
    revenueGenerated: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Blog Comment Interface
interface IBlogComment extends Document {
  postId: mongoose.Types.ObjectId;
  author: {
    name: string;
    email: string;
    userId?: mongoose.Types.ObjectId;
  };
  content: string;
  parentComment?: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  likes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Research Source Interface for AI content generation
interface IResearchSource extends Document {
  url: string;
  title: string;
  content: string;
  relevanceScore: number;
  credibilityScore: number;
  publishedDate: Date;
  source: string;
  keywords: string[];
  createdAt: Date;
}

// Content Generation Queue Interface
interface IContentQueue extends Document {
  topic: string;
  category: mongoose.Types.ObjectId;
  keywords: string[];
  targetWordCount: number;
  scheduledFor: Date;
  status: 'queued' | 'researching' | 'generating' | 'reviewing' | 'approved' | 'published' | 'failed';
  researchData: {
    sources: mongoose.Types.ObjectId[];
    keyInsights: string[];
    trends: string[];
  };
  generatedContent?: {
    title: string;
    content: string;
    excerpt: string;
    seoData: any;
  };
  errorLog?: string[];
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

// Blog Category Schema
const BlogCategorySchema = new Schema<IBlogCategory>({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  color: { type: String, default: '#3B82F6' },
  icon: { type: String, default: 'folder' },
  parentCategory: { type: Schema.Types.ObjectId, ref: 'BlogCategory' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Blog Post Schema
const BlogPostSchema = new Schema<IBlogPost>({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, required: true, maxlength: 300 },
  content: { type: String, required: true },
  featuredImage: {
    url: { type: String, required: true },
    alt: { type: String, required: true },
    caption: String,
    source: { type: String, enum: ['dalle', 'stock', 'upload'], default: 'upload' },
    generationPrompt: String
  },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  categories: [{ type: Schema.Types.ObjectId, ref: 'BlogCategory' }],
  tags: [{ type: String }],
  seoData: {
    metaTitle: { type: String, required: true, maxlength: 60 },
    metaDescription: { type: String, required: true, maxlength: 160 },
    keywords: [{ type: String }],
    canonicalUrl: String,
    openGraphImage: String
  },
  status: { 
    type: String, 
    enum: ['draft', 'pending_approval', 'scheduled', 'published', 'archived'], 
    default: 'draft' 
  },
  publishedAt: Date,
  scheduledFor: Date,
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  readingTime: { type: Number, required: true },
  relatedProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  aiGenerated: {
    isAIGenerated: { type: Boolean, default: false },
    researchSources: [String],
    generationPrompt: String,
    model: { type: String, enum: ['openai', 'xai', 'manual'], default: 'manual' },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    reviewStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    adminNotes: String
  },
  performance: {
    ctr: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    averageTimeOnPage: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 }
  },
  cro: {
    relatedProducts: [{
      productId: { type: Schema.Types.ObjectId, ref: 'Product' },
      relevanceScore: { type: Number, min: 0, max: 1, required: true },
      matchReason: { type: String, required: true },
      suggestedPosition: { 
        type: String, 
        enum: ['inline', 'sidebar', 'footer'], 
        default: 'footer' 
      },
      clicks: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now }
    }],
    productClickThroughs: { type: Number, default: 0 },
    productConversions: { type: Number, default: 0 },
    revenueGenerated: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Blog Comment Schema
const BlogCommentSchema = new Schema<IBlogComment>({
  postId: { type: Schema.Types.ObjectId, ref: 'BlogPost', required: true },
  author: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  content: { type: String, required: true, maxlength: 1000 },
  parentComment: { type: Schema.Types.ObjectId, ref: 'BlogComment' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'spam'], default: 'pending' },
  likes: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Research Source Schema
const ResearchSourceSchema = new Schema<IResearchSource>({
  url: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  relevanceScore: { type: Number, min: 0, max: 1, required: true },
  credibilityScore: { type: Number, min: 0, max: 1, required: true },
  publishedDate: Date,
  source: { type: String, required: true },
  keywords: [String]
}, {
  timestamps: true
});

// Content Generation Queue Schema
const ContentQueueSchema = new Schema<IContentQueue>({
  topic: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: 'BlogCategory', required: true },
  keywords: [{ type: String }],
  targetWordCount: { type: Number, default: 1000 },
  scheduledFor: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['queued', 'researching', 'generating', 'reviewing', 'approved', 'published', 'failed'], 
    default: 'queued' 
  },
  researchData: {
    sources: [{ type: Schema.Types.ObjectId, ref: 'ResearchSource' }],
    keyInsights: [String],
    trends: [String]
  },
  generatedContent: {
    title: String,
    content: String,
    excerpt: String,
    seoData: Schema.Types.Mixed
  },
  errorLog: [String],
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 }
}, {
  timestamps: true
});

// Add indexes for performance
BlogPostSchema.index({ slug: 1 });
BlogPostSchema.index({ status: 1 });
BlogPostSchema.index({ publishedAt: -1 });
BlogPostSchema.index({ categories: 1 });
BlogPostSchema.index({ tags: 1 });
BlogPostSchema.index({ 'seoData.keywords': 1 });
BlogPostSchema.index({ createdAt: -1 });

BlogCategorySchema.index({ slug: 1 });
BlogCommentSchema.index({ postId: 1 });
ContentQueueSchema.index({ status: 1, scheduledFor: 1 });

// Add pre-save middleware for slug generation
BlogPostSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

BlogCategorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Calculate reading time based on content
BlogPostSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const wordsPerMinute = 200;
    const textLength = this.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    this.readingTime = Math.ceil(textLength / wordsPerMinute);
  }
  next();
});

// Create models
const BlogCategory = mongoose.model<IBlogCategory>('BlogCategory', BlogCategorySchema);
const BlogPost = mongoose.model<IBlogPost>('BlogPost', BlogPostSchema);
const BlogComment = mongoose.model<IBlogComment>('BlogComment', BlogCommentSchema);
const ResearchSource = mongoose.model<IResearchSource>('ResearchSource', ResearchSourceSchema);
const ContentQueue = mongoose.model<IContentQueue>('ContentQueue', ContentQueueSchema);

export {
  BlogCategory,
  BlogPost,
  BlogComment,
  ResearchSource,
  ContentQueue,
  IBlogCategory,
  IBlogPost,
  IBlogComment,
  IResearchSource,
  IContentQueue
};