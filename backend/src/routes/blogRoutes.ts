import express from 'express';
import { BlogPost, BlogCategory, BlogComment, ContentQueue, IBlogPost } from '../models/Blog';
import { Product } from '../models/Product';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import AIContentService from '../services/aiContentService';
import ProductMatchingService from '../services/productMatchingService';
import seoOptimizationService from '../services/seoOptimizationService';
import blogSchedulerService from '../services/blogSchedulerService';
import RSS from 'rss';
import { body, validationResult, query } from 'express-validator';

const router = express.Router();
const aiContentService = new AIContentService();
const productMatchingService = new ProductMatchingService();

// Public Routes

// Get published blog posts with pagination and filtering
router.get('/posts', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('category').optional().isString(),
  query('tag').optional().isString(),
  query('search').optional().isString(),
  query('sort').optional().isIn(['newest', 'oldest', 'popular', 'trending'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter: any = {
      status: 'published',
      isActive: true,
      publishedAt: { $lte: new Date() }
    };
    
    if (req.query.category) {
      const category = await BlogCategory.findOne({ 
        slug: req.query.category, 
        isActive: true 
      });
      if (category) {
        filter.categories = category._id;
      }
    }
    
    if (req.query.tag) {
      filter.tags = { $in: [req.query.tag] };
    }
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      filter.$or = [
        { title: searchRegex },
        { excerpt: searchRegex },
        { content: searchRegex },
        { tags: searchRegex }
      ];
    }
    
    // Build sort query
    let sort: any = { publishedAt: -1 }; // Default: newest first
    
    switch (req.query.sort) {
      case 'oldest':
        sort = { publishedAt: 1 };
        break;
      case 'popular':
        sort = { views: -1, likes: -1 };
        break;
      case 'trending':
        // Posts with high engagement in last 7 days
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        filter.publishedAt = { $gte: weekAgo };
        sort = { views: -1, shares: -1, likes: -1 };
        break;
    }
    
    // Execute query with population
    const posts = await BlogPost.find(filter)
      .populate('author', 'firstName lastName avatar')
      .populate('categories', 'name slug color')
      .populate('relatedProducts', 'name slug price images')
      .select('-content') // Exclude full content for listing
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await BlogPost.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// Get single blog post by slug
router.get('/posts/:slug', async (req, res) => {
  try {
    const post = await BlogPost.findOne({
      slug: req.params.slug,
      status: 'published',
      isActive: true
    })
      .populate('author', 'firstName lastName avatar bio')
      .populate('categories', 'name slug color icon')
      .populate('relatedProducts', 'name slug price images description')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }
    
    // Increment view count (fire and forget)
    BlogPost.findByIdAndUpdate(post._id, { $inc: { views: 1 } }).exec();
    
    // Get related posts
    const relatedPosts = await BlogPost.find({
      _id: { $ne: post._id },
      categories: { $in: post.categories.map((c: any) => c._id) },
      status: 'published',
      isActive: true
    })
      .populate('author', 'firstName lastName')
      .populate('categories', 'name slug color')
      .select('title slug excerpt featuredImage publishedAt readingTime')
      .sort({ publishedAt: -1 })
      .limit(4)
      .lean();
    
    res.json({
      post,
      relatedPosts
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// Get blog categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await BlogCategory.find({ isActive: true })
      .select('name slug description color icon')
      .sort({ name: 1 })
      .lean();
    
    // Add post count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const postCount = await BlogPost.countDocuments({
          categories: category._id,
          status: 'published',
          isActive: true
        });
        return { ...category, postCount };
      })
    );
    
    res.json(categoriesWithCount);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get popular tags
router.get('/tags', async (req, res) => {
  try {
    const tags = await BlogPost.aggregate([
      {
        $match: {
          status: 'published',
          isActive: true,
          tags: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $project: {
          tag: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);
    
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get blog statistics for homepage
router.get('/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      BlogPost.countDocuments({ status: 'published', isActive: true }),
      BlogCategory.countDocuments({ isActive: true }),
      BlogPost.aggregate([
        { $match: { status: 'published', isActive: true } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ])
    ]);
    
    const [postCount, categoryCount, viewsResult] = stats;
    const totalViews = viewsResult[0]?.totalViews || 0;
    
    res.json({
      totalPosts: postCount,
      totalCategories: categoryCount,
      totalViews,
      averageViewsPerPost: postCount > 0 ? Math.round(totalViews / postCount) : 0
    });
  } catch (error) {
    console.error('Error fetching blog stats:', error);
    res.status(500).json({ error: 'Failed to fetch blog statistics' });
  }
});

// RSS Feed
router.get('/rss', async (req, res) => {
  try {
    const posts = await BlogPost.find({
      status: 'published',
      isActive: true
    })
      .populate('author', 'firstName lastName')
      .populate('categories', 'name')
      .sort({ publishedAt: -1 })
      .limit(20)
      .lean();
    
    const feed = new RSS({
      title: 'ICEPACA Blog - Cooling Tips & Adventure Stories',
      description: 'The latest tips on eco-friendly cooling, outdoor adventures, and sustainable living.',
      feed_url: `${process.env.FRONTEND_URL}/api/blog/rss`,
      site_url: process.env.FRONTEND_URL,
      image_url: `${process.env.FRONTEND_URL}/images/logo.png`,
      language: 'en-US',
      categories: ['Cooling Tips', 'Eco Living', 'Adventure Stories'],
      pubDate: new Date().toISOString(),
      ttl: 60
    });
    
    posts.forEach((post: any) => {
      feed.item({
        title: post.title,
        description: post.excerpt,
        url: `${process.env.FRONTEND_URL}/blog/${post.slug}`,
        guid: post._id.toString(),
        categories: post.categories.map((c: any) => c.name),
        author: `${post.author.firstName} ${post.author.lastName}`,
        date: post.publishedAt,
        enclosure: {
          url: post.featuredImage.url.startsWith('http') 
            ? post.featuredImage.url 
            : `${process.env.FRONTEND_URL}${post.featuredImage.url}`,
          type: 'image/jpeg'
        }
      });
    });
    
    res.set('Content-Type', 'application/rss+xml');
    res.send(feed.xml());
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
});

// Admin Routes (require authentication)

// Get all posts for admin (including drafts, pending, etc.)
router.get('/admin/posts', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const filter: any = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.author) {
      filter.author = req.query.author;
    }
    
    const posts = await BlogPost.find(filter)
      .populate('author', 'firstName lastName avatar')
      .populate('categories', 'name slug color')
      .select('-content')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await BlogPost.countDocuments(filter);
    
    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admin posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create new blog post
router.post('/admin/posts', [
  authenticateToken,
  requireAdmin,
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('excerpt').notEmpty().withMessage('Excerpt is required'),
  body('categories').isArray().withMessage('Categories must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const postData = {
      ...req.body,
      author: req.user.userId,
      readingTime: Math.ceil(req.body.content.length / 1000) // Rough estimate
    };
    
    const post = new BlogPost(postData);
    await post.save();
    
    await post.populate('author', 'firstName lastName');
    await post.populate('categories', 'name slug color');
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// Update blog post
router.put('/admin/posts/:id', [
  authenticateToken,
  requireAdmin,
  body('title').optional().notEmpty(),
  body('content').optional().notEmpty(),
  body('excerpt').optional().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: new Date()
      },
      { new: true }
    )
      .populate('author', 'firstName lastName')
      .populate('categories', 'name slug color');
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

// Delete blog post
router.delete('/admin/posts/:id', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

// Approve AI-generated post
router.post('/admin/posts/:id/approve', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { adminNotes } = req.body;
    
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      {
        status: 'published',
        publishedAt: new Date(),
        'aiGenerated.reviewStatus': 'approved',
        'aiGenerated.adminNotes': adminNotes
      },
      { new: true }
    ).populate('author categories');
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error approving post:', error);
    res.status(500).json({ error: 'Failed to approve post' });
  }
});

// Reject AI-generated post
router.post('/admin/posts/:id/reject', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { adminNotes } = req.body;
    
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      {
        status: 'archived',
        'aiGenerated.reviewStatus': 'rejected',
        'aiGenerated.adminNotes': adminNotes
      },
      { new: true }
    );
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error rejecting post:', error);
    res.status(500).json({ error: 'Failed to reject post' });
  }
});

// Content generation routes

// Queue content generation
router.post('/admin/content/generate', [
  authenticateToken,
  requireAdmin,
  body('topic').notEmpty().withMessage('Topic is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('scheduledFor').isISO8601().withMessage('Valid scheduled date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { topic, category, keywords = [], scheduledFor, targetWordCount = 1000 } = req.body;
    
    const queueItem = new ContentQueue({
      topic,
      category,
      keywords,
      scheduledFor: new Date(scheduledFor),
      targetWordCount
    });
    
    await queueItem.save();
    
    res.status(201).json(queueItem);
  } catch (error) {
    console.error('Error queuing content generation:', error);
    res.status(500).json({ error: 'Failed to queue content generation' });
  }
});

// Get content generation queue
router.get('/admin/content/queue', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const queueItems = await ContentQueue.find()
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(queueItems);
  } catch (error) {
    console.error('Error fetching content queue:', error);
    res.status(500).json({ error: 'Failed to fetch content queue' });
  }
});

// Trigger manual content generation (for testing)
router.post('/admin/content/generate-now', [
  authenticateToken,
  requireAdmin,
  body('topic').notEmpty().withMessage('Topic is required'),
  body('category').notEmpty().withMessage('Category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { topic, category, keywords = [] } = req.body;
    
    // Generate content immediately
    const generatedContent = await aiContentService.generateContentForTopic(topic, category, keywords);
    
    // Generate featured image
    const featuredImageUrl = await aiContentService.generateFeaturedImage(generatedContent.featuredImagePrompt);
    
    // Create blog post
    const blogPost = new BlogPost({
      title: generatedContent.title,
      excerpt: generatedContent.excerpt,
      content: generatedContent.content,
      featuredImage: {
        url: featuredImageUrl || '/images/blog-placeholder.jpg',
        alt: generatedContent.title,
        source: featuredImageUrl?.includes('openai') ? 'dalle' : 'stock',
        generationPrompt: generatedContent.featuredImagePrompt
      },
      author: req.user.userId,
      categories: [category],
      tags: keywords,
      seoData: generatedContent.seoData,
      status: 'pending_approval',
      readingTime: Math.ceil(generatedContent.content.length / 1000),
      relatedProducts: [],
      aiGenerated: {
        isAIGenerated: true,
        generationPrompt: topic,
        model: 'openai',
        confidence: generatedContent.confidence,
        reviewStatus: 'pending'
      }
    });
    
    await blogPost.save();
    await blogPost.populate('author categories');
    
    res.status(201).json({
      message: 'Content generated successfully',
      post: blogPost,
      generatedContent
    });
  } catch (error) {
    console.error('Error in manual content generation:', error);
    res.status(500).json({ error: 'Failed to generate content', details: error.message });
  }
});

// Category management routes

// Create category
router.post('/admin/categories', [
  authenticateToken,
  requireAdmin,
  body('name').notEmpty().withMessage('Name is required'),
  body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const category = new BlogCategory(req.body);
    await category.save();
    
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Get all categories for admin
router.get('/admin/categories', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const categories = await BlogCategory.find()
      .sort({ name: 1 })
      .lean();
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Like a blog post (public endpoint)
router.post('/posts/:id/like', async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ likes: post.likes });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Get product recommendations for a blog post
router.get('/posts/:slug/recommendations', async (req, res) => {
  try {
    const post = await BlogPost.findOne({ 
      slug: req.params.slug,
      status: 'published',
      isActive: true 
    })
      .populate('relatedProducts', 'name slug price images description')
      .lean();
    
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // If no related products or CRO data, generate recommendations
    if (!post.relatedProducts?.length || !post.cro?.relatedProducts?.length) {
      console.log(`Generating product recommendations for post: ${post.title}`);
      const productMatches = await productMatchingService.findRelatedProducts(post, 5);
      
      const recommendations = await Promise.all(
        productMatches.map(async (match) => {
          const product = await Product.findById(match.product._id)
            .select('name slug price images description')
            .lean();
          
          return {
            product,
            relevanceScore: match.relevanceScore,
            matchReason: match.matchReason,
            suggestedPosition: match.suggestedPosition
          };
        })
      );

      return res.json({ recommendations });
    }

    // Return existing recommendations with populated product data
    const recommendations = post.cro.relatedProducts
      .map(croProduct => {
        const product = post.relatedProducts.find(p => p._id.toString() === croProduct.productId.toString());
        if (product) {
          return {
            product,
            relevanceScore: croProduct.relevanceScore,
            matchReason: croProduct.matchReason,
            suggestedPosition: croProduct.suggestedPosition,
            clicks: croProduct.clicks,
            conversions: croProduct.conversions
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json({ recommendations });
  } catch (error) {
    console.error('Error getting product recommendations:', error);
    res.status(500).json({ error: 'Failed to get product recommendations' });
  }
});

// Track product click from blog post (for CRO analytics)
router.post('/posts/:postId/product-click/:productId', async (req, res) => {
  try {
    const { postId, productId } = req.params;
    const { position } = req.body; // 'inline', 'sidebar', 'footer'

    const post = await BlogPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Update CRO tracking
    const croProductIndex = post.cro.relatedProducts.findIndex(
      rp => rp.productId.toString() === productId
    );

    if (croProductIndex >= 0) {
      post.cro.relatedProducts[croProductIndex].clicks += 1;
      post.cro.relatedProducts[croProductIndex].lastUpdated = new Date();
    }

    post.cro.productClickThroughs += 1;
    await post.save();

    res.json({ success: true, message: 'Click tracked successfully' });
  } catch (error) {
    console.error('Error tracking product click:', error);
    res.status(500).json({ error: 'Failed to track product click' });
  }
});

// Track product conversion from blog post
router.post('/posts/:postId/product-conversion/:productId', async (req, res) => {
  try {
    const { postId, productId } = req.params;
    const { orderValue } = req.body;

    const post = await BlogPost.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Update CRO tracking
    const croProductIndex = post.cro.relatedProducts.findIndex(
      rp => rp.productId.toString() === productId
    );

    if (croProductIndex >= 0) {
      post.cro.relatedProducts[croProductIndex].conversions += 1;
      post.cro.relatedProducts[croProductIndex].lastUpdated = new Date();
    }

    post.cro.productConversions += 1;
    if (orderValue) {
      post.cro.revenueGenerated += orderValue;
    }
    
    await post.save();

    res.json({ success: true, message: 'Conversion tracked successfully' });
  } catch (error) {
    console.error('Error tracking product conversion:', error);
    res.status(500).json({ error: 'Failed to track product conversion' });
  }
});

// Admin Routes for Product Matching

// Manually update product recommendations for a blog post
router.post('/admin/posts/:id/update-recommendations', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await BlogPost.findById(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    console.log(`Manually updating product recommendations for post: ${post.title}`);
    const productMatches = await productMatchingService.findRelatedProducts(post, 5);
    
    // Update blog post with new recommendations
    const relatedProductIds = productMatches.map(match => match.product._id);
    
    post.relatedProducts = relatedProductIds;
    post.cro.relatedProducts = productMatches.map(match => ({
      productId: match.product._id,
      relevanceScore: match.relevanceScore,
      matchReason: match.matchReason,
      suggestedPosition: match.suggestedPosition,
      clicks: 0,
      conversions: 0,
      lastUpdated: new Date()
    }));

    await post.save();

    const updatedPost = await BlogPost.findById(postId)
      .populate('relatedProducts', 'name slug price images')
      .populate('author', 'firstName lastName')
      .populate('categories', 'name slug color');

    res.json({
      message: 'Product recommendations updated successfully',
      post: updatedPost,
      recommendationsCount: productMatches.length
    });
  } catch (error) {
    console.error('Error updating product recommendations:', error);
    res.status(500).json({ error: 'Failed to update product recommendations' });
  }
});

// Batch update all blog posts with product recommendations
router.post('/admin/posts/batch-update-recommendations', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    console.log('Starting batch update of product recommendations...');
    
    // Run the batch update in the background
    productMatchingService.updateAllBlogPostsWithProducts()
      .then(() => {
        console.log('Batch update of product recommendations completed');
      })
      .catch(error => {
        console.error('Batch update failed:', error);
      });

    res.json({ 
      message: 'Batch update started. This process will run in the background.',
      status: 'in_progress'
    });
  } catch (error) {
    console.error('Error starting batch update:', error);
    res.status(500).json({ error: 'Failed to start batch update' });
  }
});

// Get CRO analytics for blog posts
router.get('/admin/analytics/cro', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case '90d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } };
        break;
    }

    const analytics = await BlogPost.aggregate([
      {
        $match: {
          status: 'published',
          isActive: true,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalProductClicks: { $sum: '$cro.productClickThroughs' },
          totalConversions: { $sum: '$cro.productConversions' },
          totalRevenue: { $sum: '$cro.revenueGenerated' },
          postsWithRecommendations: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$cro.relatedProducts' }, 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    const topPerformingPosts = await BlogPost.find({
      status: 'published',
      isActive: true,
      ...dateFilter
    })
      .select('title slug cro.productClickThroughs cro.productConversions cro.revenueGenerated')
      .sort({ 'cro.productClickThroughs': -1 })
      .limit(10)
      .lean();

    const result = {
      summary: analytics[0] || {
        totalPosts: 0,
        totalProductClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        postsWithRecommendations: 0
      },
      topPerformingPosts,
      conversionRate: analytics[0] 
        ? (analytics[0].totalConversions / Math.max(analytics[0].totalProductClicks, 1) * 100)
        : 0,
      averageRevenuePerPost: analytics[0]
        ? (analytics[0].totalRevenue / Math.max(analytics[0].totalPosts, 1))
        : 0
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching CRO analytics:', error);
    res.status(500).json({ error: 'Failed to fetch CRO analytics' });
  }
});

// SEO Optimization Routes

// Analyze SEO for a specific blog post
router.get('/admin/posts/:id/seo-analysis', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const seoAnalysis = await seoOptimizationService.analyzeBlogPost(post);
    
    res.json(seoAnalysis);
  } catch (error) {
    console.error('Error analyzing SEO:', error);
    res.status(500).json({ error: 'Failed to analyze SEO' });
  }
});

// Batch SEO analysis for multiple posts
router.post('/admin/posts/batch-seo-analysis', [
  authenticateToken, 
  requireAdmin,
  body('postIds').isArray().withMessage('Post IDs must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { postIds } = req.body;
    const posts = await BlogPost.find({ _id: { $in: postIds } });
    
    const seoAnalyses = await Promise.all(
      posts.map(async (post) => ({
        postId: post._id,
        title: post.title,
        slug: post.slug,
        status: post.status,
        analysis: await seoOptimizationService.analyzeBlogPost(post)
      }))
    );
    
    res.json({
      totalAnalyzed: seoAnalyses.length,
      averageScore: seoAnalyses.reduce((sum, analysis) => sum + analysis.analysis.score, 0) / seoAnalyses.length,
      analyses: seoAnalyses
    });
  } catch (error) {
    console.error('Error in batch SEO analysis:', error);
    res.status(500).json({ error: 'Failed to perform batch SEO analysis' });
  }
});

// Get SEO recommendations for content optimization
router.get('/admin/seo/recommendations', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const posts = await BlogPost.find({ 
      status: { $in: ['published', 'pending_approval'] },
      isActive: true 
    }).limit(50);
    
    const seoAnalyses = await Promise.all(
      posts.map(async (post) => ({
        postId: post._id,
        title: post.title,
        slug: post.slug,
        analysis: await seoOptimizationService.analyzeBlogPost(post)
      }))
    );
    
    // Sort by SEO score (lowest first - needs most improvement)
    const sortedAnalyses = seoAnalyses.sort((a, b) => a.analysis.score - b.analysis.score);
    
    // Get top issues and recommendations
    const allIssues = seoAnalyses.flatMap(a => a.analysis.issues);
    const allRecommendations = seoAnalyses.flatMap(a => a.analysis.recommendations);
    
    const issueCategories = allIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const recommendationCategories = allRecommendations.reduce((acc, rec) => {
      acc[rec.category] = (acc[rec.category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    res.json({
      summary: {
        totalPosts: posts.length,
        averageScore: seoAnalyses.reduce((sum, analysis) => sum + analysis.analysis.score, 0) / seoAnalyses.length,
        postsNeedingAttention: seoAnalyses.filter(a => a.analysis.score < 70).length,
        topIssueTypes: Object.entries(issueCategories).sort(([,a], [,b]) => b - a).slice(0, 5),
        topRecommendationCategories: Object.entries(recommendationCategories).sort(([,a], [,b]) => b - a).slice(0, 5)
      },
      postsNeedingImprovement: sortedAnalyses.slice(0, 10),
      globalRecommendations: [
        {
          priority: 'high',
          category: 'content',
          title: 'Focus on ICEPACA Product Keywords',
          description: 'Ensure all posts naturally include ICEPACA-related keywords',
          affectedPosts: seoAnalyses.filter(a => 
            a.analysis.recommendations.some(r => r.title.includes('Product-Related Keywords'))
          ).length
        },
        {
          priority: 'medium',
          category: 'technical',
          title: 'Improve Internal Linking',
          description: 'Add more internal links between blog posts and product pages',
          affectedPosts: seoAnalyses.filter(a =>
            a.analysis.recommendations.some(r => r.title.includes('Internal Links'))
          ).length
        },
        {
          priority: 'medium',
          category: 'meta',
          title: 'Optimize Meta Descriptions',
          description: 'Ensure all meta descriptions are 150-160 characters with CTAs',
          affectedPosts: seoAnalyses.filter(a =>
            a.analysis.issues.some(i => i.element === 'meta-description')
          ).length
        }
      ]
    });
  } catch (error) {
    console.error('Error getting SEO recommendations:', error);
    res.status(500).json({ error: 'Failed to get SEO recommendations' });
  }
});

// Generate sitemap for SEO
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://icepaca.com';
    
    const posts = await BlogPost.find({
      status: 'published',
      isActive: true
    }).select('slug updatedAt').lean();
    
    const categories = await BlogCategory.find({
      isActive: true
    }).select('slug updatedAt').lean();
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`;
    
    // Add blog posts
    posts.forEach(post => {
      sitemap += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    <lastmod>${new Date(post.updatedAt).toISOString().split('T')[0]}</lastmod>
  </url>`;
    });
    
    // Add categories
    categories.forEach(category => {
      sitemap += `
  <url>
    <loc>${baseUrl}/blog/category/${category.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
    <lastmod>${new Date(category.updatedAt).toISOString().split('T')[0]}</lastmod>
  </url>`;
    });
    
    sitemap += `
</urlset>`;
    
    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

// Generate robots.txt
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://icepaca.com';
  
  const robotsTxt = `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/api/blog/sitemap.xml

# Crawl delay for polite crawling
Crawl-delay: 1

# Disallow admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /*?*utm_*
Disallow: /*?*ref=*
Disallow: /*?*src=*

# Allow specific social media crawlers
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

# Specific instructions for search engines
User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Bingbot
Allow: /
Crawl-delay: 1`;

  res.set('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

// Scheduling Routes

// Get scheduler statistics
router.get('/admin/scheduler/stats', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const stats = await blogSchedulerService.getSchedulerStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching scheduler stats:', error);
    res.status(500).json({ error: 'Failed to fetch scheduler stats' });
  }
});

// Get all scheduled posts
router.get('/admin/scheduler/posts', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const scheduledPosts = await blogSchedulerService.getScheduledPosts();
    res.json({ posts: scheduledPosts });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled posts' });
  }
});

// Schedule a post
router.post('/admin/scheduler/posts/:id/schedule', [
  authenticateToken,
  requireAdmin,
  body('scheduledFor').isISO8601().withMessage('Valid scheduled date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { scheduledFor } = req.body;
    const scheduledDate = new Date(scheduledFor);
    
    // Ensure the scheduled date is in the future
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled date must be in the future' });
    }

    const success = await blogSchedulerService.schedulePost(req.params.id, scheduledDate);
    
    if (success) {
      res.json({ message: 'Post scheduled successfully', scheduledFor: scheduledDate });
    } else {
      res.status(500).json({ error: 'Failed to schedule post' });
    }
  } catch (error) {
    console.error('Error scheduling post:', error);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Cancel scheduled post
router.post('/admin/scheduler/posts/:id/cancel', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const success = await blogSchedulerService.cancelScheduledPost(req.params.id);
    
    if (success) {
      res.json({ message: 'Post scheduling cancelled successfully' });
    } else {
      res.status(500).json({ error: 'Failed to cancel scheduled post' });
    }
  } catch (error) {
    console.error('Error cancelling scheduled post:', error);
    res.status(500).json({ error: 'Failed to cancel scheduled post' });
  }
});

// Reschedule a post
router.post('/admin/scheduler/posts/:id/reschedule', [
  authenticateToken,
  requireAdmin,
  body('scheduledFor').isISO8601().withMessage('Valid scheduled date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { scheduledFor } = req.body;
    const scheduledDate = new Date(scheduledFor);
    
    // Ensure the scheduled date is in the future
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled date must be in the future' });
    }

    const success = await blogSchedulerService.reschedulePost(req.params.id, scheduledDate);
    
    if (success) {
      res.json({ message: 'Post rescheduled successfully', scheduledFor: scheduledDate });
    } else {
      res.status(500).json({ error: 'Failed to reschedule post' });
    }
  } catch (error) {
    console.error('Error rescheduling post:', error);
    res.status(500).json({ error: 'Failed to reschedule post' });
  }
});

export default router;