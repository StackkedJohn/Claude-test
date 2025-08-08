import express, { Request, Response } from 'express';
import Product, { IProduct } from '../models/Product';
import { Review } from '../models/Review';
import AdminAlert from '../models/AdminAlert';

const router = express.Router();

// Get all products with filtering and sorting
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      inStock,
      tags,
      sort = 'name',
      order = 'asc',
      page = 1,
      limit = 20
    } = req.query;

    const filter: any = { isActive: true };

    if (category) filter.category = category;
    if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };
    if (inStock === 'true') filter['stock.inStock'] = true;
    if (tags) filter.tags = { $in: (tags as string).split(',') };

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj: any = {};
    sortObj[sort as string] = sortOrder;

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching products' });
  }
});

// Get product by ID with social proof
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('recommendations.relatedProducts')
      .populate('recommendations.bundlesWith');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get review summary and social proof
    const reviewSummary = await Review.getProductRatingSummary(req.params.id);
    
    // Get featured reviews with photos for social proof
    const featuredReviews = await Review.find({
      productId: req.params.id,
      status: 'approved',
      $or: [
        { featured: true },
        { 'images.0': { $exists: true } }, // Reviews with photos
        { helpfulVotes: { $gte: 5 } }, // Highly rated reviews
        { verifiedPurchase: true } // Verified purchases
      ]
    })
    .populate('userId', 'firstName lastName')
    .sort({ featured: -1, helpfulVotes: -1, createdAt: -1 })
    .limit(6);

    // Get adventure testimonials specific to this product
    const adventureTestimonials = featuredReviews
      .filter(review => review.useCase && review.location)
      .slice(0, 3)
      .map(review => ({
        id: review._id,
        testimonial: review.content,
        author: `${(review.userId as any).firstName} ${(review.userId as any).lastName?.charAt(0)}.`,
        useCase: review.useCase,
        location: review.location,
        duration: review.duration,
        rating: review.rating,
        verified: review.verifiedPurchase
      }));

    // Get social proof stats
    const socialProof = {
      rating: {
        average: reviewSummary.averageRating,
        count: reviewSummary.totalReviews,
        breakdown: reviewSummary.ratingBreakdown,
        verifiedCount: reviewSummary.verifiedReviews
      },
      reviews: {
        featured: featuredReviews.map(review => ({
          id: review._id,
          title: review.title,
          content: review.content.substring(0, 150) + (review.content.length > 150 ? '...' : ''),
          rating: review.rating,
          author: `${(review.userId as any).firstName} ${(review.userId as any).lastName?.charAt(0)}.`,
          verified: review.verifiedPurchase,
          helpful: review.helpfulVotes,
          images: review.images.slice(0, 2), // Max 2 images for preview
          useCase: review.useCase,
          createdAt: review.createdAt
        })),
        hasMore: reviewSummary.totalReviews > 6
      },
      testimonials: adventureTestimonials,
      trustBadges: [
        {
          icon: 'verified-purchase',
          text: `${reviewSummary.verifiedReviews} verified purchases`,
          show: reviewSummary.verifiedReviews > 0
        },
        {
          icon: 'high-rating',
          text: `${Math.round(reviewSummary.averageRating * 10) / 10}/5 stars`,
          show: reviewSummary.averageRating >= 4.0
        },
        {
          icon: 'review-count',
          text: `${reviewSummary.totalReviews}+ reviews`,
          show: reviewSummary.totalReviews >= 10
        },
        {
          icon: 'adventure-tested',
          text: 'Adventure tested',
          show: adventureTestimonials.length > 0
        }
      ].filter(badge => badge.show)
    };

    res.json({
      ...product.toObject(),
      socialProof
    });
  } catch (error) {
    console.error('Error fetching product with social proof:', error);
    res.status(500).json({ error: 'Error fetching product' });
  }
});

// Search products
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    const searchRegex = new RegExp(query, 'i');

    const products = await Product.find({
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { 'specifications.material': searchRegex }
      ]
    })
    .limit(Number(limit))
    .sort({ name: 1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error searching products' });
  }
});

// Get product recommendations
router.get('/:id/recommendations', async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get related products
    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      isActive: true,
      $or: [
        { category: product.category },
        { tags: { $in: product.tags } }
      ]
    }).limit(4);

    // Get bundle recommendations (products that complement this one)
    const bundleRecommendations = await Product.find({
      _id: { $ne: product._id },
      isActive: true,
      'bundle.isBundle': false,
      $or: [
        { 'recommendations.bundlesWith': product._id },
        { tags: { $in: ['bundle-complement', 'accessory'] } }
      ]
    }).limit(3);

    res.json({
      related: relatedProducts,
      bundles: bundleRecommendations
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching recommendations' });
  }
});

// Check stock availability
router.post('/check-stock', async (req: Request, res: Response) => {
  try {
    const { items } = req.body; // Array of { productId, quantity }

    const stockCheck = await Promise.all(
      items.map(async (item: any) => {
        const product = await Product.findById(item.productId);
        
        if (!product) {
          return { productId: item.productId, available: false, error: 'Product not found' };
        }

        const availableStock = product.stock.quantity - product.stock.reserved;
        const isAvailable = availableStock >= item.quantity;

        return {
          productId: item.productId,
          requested: item.quantity,
          available: availableStock,
          inStock: isAvailable,
          stockStatus: product.stockStatus
        };
      })
    );

    res.json({ stockCheck });
  } catch (error) {
    res.status(500).json({ error: 'Error checking stock' });
  }
});

// Reserve stock for cart
router.post('/reserve-stock', async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const success = product.reserveStock(quantity);
    
    if (success) {
      await product.save();
      res.json({ success: true, message: 'Stock reserved' });
    } else {
      res.status(400).json({ error: 'Insufficient stock' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error reserving stock' });
  }
});

// Release reserved stock
router.post('/release-stock', async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.releaseStock(quantity);
    await product.save();

    res.json({ success: true, message: 'Stock released' });
  } catch (error) {
    res.status(500).json({ error: 'Error releasing stock' });
  }
});

// Complete purchase (reduce actual stock)
router.post('/complete-purchase', async (req: Request, res: Response) => {
  try {
    const { items } = req.body; // Array of { productId, quantity }

    const results = await Promise.all(
      items.map(async (item: any) => {
        const product = await Product.findById(item.productId);
        
        if (!product) {
          return { productId: item.productId, success: false, error: 'Product not found' };
        }

        const success = product.completePurchase(item.quantity);
        
        if (success) {
          await product.save();
          
          // Check if stock is low and create admin alert
          if (product.isLowStock()) {
            await AdminAlert.create({
              type: 'low-stock',
              title: `Low Stock Alert: ${product.name}`,
              message: `Product "${product.name}" is running low on stock. Current quantity: ${product.stock.quantity}`,
              productId: product._id,
              severity: product.stock.quantity <= 5 ? 'high' : 'medium'
            });
          }

          // Check if out of stock
          if (product.stock.quantity === 0) {
            await AdminAlert.create({
              type: 'out-of-stock',
              title: `Out of Stock: ${product.name}`,
              message: `Product "${product.name}" is now out of stock.`,
              productId: product._id,
              severity: 'high'
            });
          }

          return { productId: item.productId, success: true };
        } else {
          return { productId: item.productId, success: false, error: 'Insufficient stock' };
        }
      })
    );

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Error completing purchase' });
  }
});

export default router;