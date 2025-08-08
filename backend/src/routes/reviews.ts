// Product review routes with photo uploads and moderation
import express, { Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Review } from '../models/Review';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { authenticateToken, requireModerator, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 images
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get reviews for a product
router.get('/product/:productId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = req.query.sortBy as string || 'newest';
    const filterBy = req.query.filterBy as string; // 'verified', 'rating_5', etc.
    
    const skip = (page - 1) * limit;

    // Build query
    let query: any = { 
      productId, 
      status: 'approved' 
    };

    // Apply filters
    if (filterBy) {
      switch (filterBy) {
        case 'verified':
          query.verifiedPurchase = true;
          break;
        case 'rating_5':
          query.rating = 5;
          break;
        case 'rating_4':
          query.rating = 4;
          break;
        case 'rating_3':
          query.rating = 3;
          break;
        case 'rating_2':
          query.rating = 2;
          break;
        case 'rating_1':
          query.rating = 1;
          break;
        case 'with_photos':
          query['images.0'] = { $exists: true };
          break;
      }
    }

    // Build sort
    let sort: any = {};
    switch (sortBy) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'rating_high':
        sort = { rating: -1, createdAt: -1 };
        break;
      case 'rating_low':
        sort = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sort = { helpfulVotes: -1, createdAt: -1 };
        break;
    }

    const reviews = await Review.find(query)
      .populate('userId', 'firstName lastName avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments(query);

    // Get review summary for the product
    const summary = await Review.getProductRatingSummary(productId);

    res.json({
      success: true,
      reviews,
      summary,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: page * limit < totalReviews,
        hasPrev: page > 1
      }
    });

  } catch (error: any) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
});

// Submit a new review
router.post('/', authenticateToken, upload.array('images', 5), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { 
      productId, 
      rating, 
      title, 
      content, 
      useCase, 
      duration, 
      location 
    } = req.body;

    // Validation
    if (!productId || !rating || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, rating, title, and content are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Check if this is a verified purchase
    const user = await User.findById(userId);
    const order = user ? await Order.findOne({
      'customer.email': user.email,
      'items.productId': productId,
      status: { $in: ['delivered', 'shipped'] }
    }) : null;

    const verifiedPurchase = !!order;

    // Upload images to Cloudinary
    const uploadedImages = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        try {
          const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                folder: 'icepaca/reviews',
                transformation: [
                  { width: 800, height: 600, crop: 'limit', quality: 'auto' }
                ]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            ).end(file.buffer);
          });

          const cloudinaryResult = result as any;
          uploadedImages.push({
            url: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            altText: `Review image for ${title}`
          });
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
        }
      }
    }

    // Create review
    const review = new Review({
      productId,
      userId,
      rating: parseInt(rating),
      title: title.trim(),
      content: content.trim(),
      images: uploadedImages,
      useCase,
      duration,
      location,
      verifiedPurchase,
      purchaseDate: order?.orderDate
    });

    await review.save();

    // Populate user info for response
    await review.populate('userId', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      review,
      message: 'Review submitted successfully'
    });

  } catch (error: any) {
    console.error('Submit review error:', error);
    
    // Clean up uploaded images on error
    if (req.files && Array.isArray(req.files)) {
      // Note: In a production app, you might want to implement cleanup
      // for already uploaded images in case of partial failure
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit review'
    });
  }
});

// Update a review (only by review owner)
router.put('/:reviewId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { reviewId } = req.params;
    const { rating, title, content, useCase, duration, location } = req.body;

    const review = await Review.findOne({ _id: reviewId, userId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you do not have permission to edit it'
      });
    }

    // Can only edit if review is not yet approved or is approved but recent
    const daysSinceCreated = Math.floor(
      (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (review.status === 'approved' && daysSinceCreated > 7) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit approved reviews older than 7 days'
      });
    }

    // Update fields
    if (rating) review.rating = parseInt(rating);
    if (title) review.title = title.trim();
    if (content) review.content = content.trim();
    if (useCase) review.useCase = useCase;
    if (duration) review.duration = duration;
    if (location) review.location = location;

    // Reset to pending if it was previously approved
    if (review.status === 'approved') {
      review.status = 'pending';
    }

    await review.save();
    await review.populate('userId', 'firstName lastName avatar');

    res.json({
      success: true,
      review,
      message: 'Review updated successfully'
    });

  } catch (error: any) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review'
    });
  }
});

// Delete a review (only by review owner or moderator)
router.delete('/:reviewId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const { reviewId } = req.params;

    let query: any = { _id: reviewId };
    
    // Regular users can only delete their own reviews
    if (userRole !== 'admin' && userRole !== 'moderator') {
      query.userId = userId;
    }

    const review = await Review.findOne(query);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you do not have permission to delete it'
      });
    }

    // Delete images from Cloudinary
    for (const image of review.images) {
      try {
        await cloudinary.uploader.destroy(image.publicId);
      } catch (deleteError) {
        console.error('Error deleting image:', deleteError);
      }
    }

    await Review.deleteOne({ _id: reviewId });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review'
    });
  }
});

// Mark review as helpful
router.post('/:reviewId/helpful', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user already marked as helpful
    const alreadyMarked = review.helpfulBy.includes(userId as any);
    
    if (alreadyMarked) {
      // Remove helpful vote
      review.helpfulBy = review.helpfulBy.filter(id => id.toString() !== userId);
      review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
    } else {
      // Add helpful vote
      review.helpfulBy.push(userId as any);
      review.helpfulVotes += 1;
      
      // Remove from flagged if previously flagged by this user
      review.flaggedBy = review.flaggedBy.filter(id => id.toString() !== userId);
    }

    await review.save();

    res.json({
      success: true,
      helpful: !alreadyMarked,
      helpfulVotes: review.helpfulVotes,
      message: alreadyMarked ? 'Helpful vote removed' : 'Review marked as helpful'
    });

  } catch (error: any) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update helpful status'
    });
  }
});

// Flag review as inappropriate
router.post('/:reviewId/flag', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user already flagged this review
    const alreadyFlagged = review.flaggedBy.includes(userId as any);
    
    if (!alreadyFlagged) {
      review.flaggedBy.push(userId as any);
      
      // Remove from helpful if previously marked helpful
      review.helpfulBy = review.helpfulBy.filter(id => id.toString() !== userId);
      review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
      
      // Auto-flag review if multiple users flag it
      if (review.flaggedBy.length >= 3 && review.status !== 'flagged') {
        review.status = 'flagged';
      }
      
      await review.save();
    }

    res.json({
      success: true,
      message: 'Review flagged for moderation'
    });

  } catch (error: any) {
    console.error('Flag review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to flag review'
    });
  }
});

// Get user's reviews
router.get('/user/my-reviews', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ userId })
      .populate('productId', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments({ userId });

    res.json({
      success: true,
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: page * limit < totalReviews,
        hasPrev: page > 1
      }
    });

  } catch (error: any) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your reviews'
    });
  }
});

// Get featured reviews (for homepage/marketing)
router.get('/featured', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    
    const reviews = await Review.getFeaturedReviews(limit);

    res.json({
      success: true,
      reviews
    });

  } catch (error: any) {
    console.error('Get featured reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured reviews'
    });
  }
});

// MODERATION ROUTES (Admin/Moderator only)

// Get reviews pending moderation
router.get('/moderation/pending', requireModerator, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string || 'pending';
    const skip = (page - 1) * limit;

    const query = { status };

    const reviews = await Review.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('productId', 'name')
      .sort({ spamScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalReviews = await Review.countDocuments(query);

    res.json({
      success: true,
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews,
        hasNext: page * limit < totalReviews,
        hasPrev: page > 1
      }
    });

  } catch (error: any) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending reviews'
    });
  }
});

// Moderate review (approve/reject)
router.post('/:reviewId/moderate', requireModerator, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const { action, notes } = req.body; // 'approve', 'reject', 'flag'
    const moderatorId = req.user?.userId;

    if (!['approve', 'reject', 'flag'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be approve, reject, or flag'
      });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged';
    review.moderatorId = moderatorId as any;
    review.moderatorNotes = notes;
    review.moderatedAt = new Date();

    await review.save();

    res.json({
      success: true,
      review,
      message: `Review ${action}d successfully`
    });

  } catch (error: any) {
    console.error('Moderate review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate review'
    });
  }
});

// Toggle review featured status
router.post('/:reviewId/featured', requireModerator, async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved reviews can be featured'
      });
    }

    review.featured = !review.featured;
    await review.save();

    res.json({
      success: true,
      featured: review.featured,
      message: review.featured ? 'Review featured' : 'Review unfeatured'
    });

  } catch (error: any) {
    console.error('Toggle featured error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle featured status'
    });
  }
});

export default router;