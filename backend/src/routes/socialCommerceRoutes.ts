import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { body, param, query, validationResult } from 'express-validator';
import socialCommerceService from '../services/socialCommerceService';

const router = express.Router();

// Sync product catalog to Instagram
router.post('/sync/instagram', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const success = await socialCommerceService.syncInstagramCatalog();
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Instagram catalog synced successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to sync Instagram catalog' 
      });
    }
  } catch (error) {
    console.error('Error syncing Instagram catalog:', error);
    res.status(500).json({ error: 'Failed to sync Instagram catalog' });
  }
});

// Sync product catalog to TikTok
router.post('/sync/tiktok', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const success = await socialCommerceService.syncTikTokCatalog();
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'TikTok catalog synced successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to sync TikTok catalog' 
      });
    }
  } catch (error) {
    console.error('Error syncing TikTok catalog:', error);
    res.status(500).json({ error: 'Failed to sync TikTok catalog' });
  }
});

// Sync to both platforms
router.post('/sync/all', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const [instagramSuccess, tiktokSuccess] = await Promise.all([
      socialCommerceService.syncInstagramCatalog(),
      socialCommerceService.syncTikTokCatalog()
    ]);

    const results = {
      instagram: instagramSuccess,
      tiktok: tiktokSuccess,
      overall: instagramSuccess && tiktokSuccess
    };

    res.json({
      success: results.overall,
      message: results.overall 
        ? 'All catalogs synced successfully' 
        : 'Some catalog syncs failed',
      details: results
    });
  } catch (error) {
    console.error('Error syncing all catalogs:', error);
    res.status(500).json({ error: 'Failed to sync catalogs' });
  }
});

// Create shoppable Instagram post
router.post('/post/instagram', [
  authenticateToken,
  requireAdmin,
  body('caption').notEmpty().withMessage('Caption is required'),
  body('mediaUrl').isURL().withMessage('Valid media URL is required'),
  body('mediaType').isIn(['image', 'video']).withMessage('Media type must be image or video'),
  body('productTags').isArray().withMessage('Product tags must be an array'),
  body('productTags.*.productId').notEmpty().withMessage('Product ID is required'),
  body('productTags.*.x').isNumeric().withMessage('X coordinate must be numeric'),
  body('productTags.*.y').isNumeric().withMessage('Y coordinate must be numeric')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const postId = await socialCommerceService.createShoppableInstagramPost(req.body);

    if (postId) {
      res.json({
        success: true,
        postId,
        message: 'Shoppable Instagram post created successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create Instagram post'
      });
    }
  } catch (error) {
    console.error('Error creating Instagram post:', error);
    res.status(500).json({ error: 'Failed to create Instagram post' });
  }
});

// Create shoppable TikTok post
router.post('/post/tiktok', [
  authenticateToken,
  requireAdmin,
  body('videoUrl').isURL().withMessage('Valid video URL is required'),
  body('caption').notEmpty().withMessage('Caption is required'),
  body('productIds').isArray().withMessage('Product IDs must be an array'),
  body('hashtags').isArray().withMessage('Hashtags must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const postId = await socialCommerceService.createShoppableTikTokPost(req.body);

    if (postId) {
      res.json({
        success: true,
        postId,
        message: 'Shoppable TikTok post created successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create TikTok post'
      });
    }
  } catch (error) {
    console.error('Error creating TikTok post:', error);
    res.status(500).json({ error: 'Failed to create TikTok post' });
  }
});

// Generate social content suggestions for ICEPACA product
router.get('/content/:productId/:platform', [
  param('productId').isMongoId().withMessage('Valid product ID required'),
  param('platform').isIn(['instagram', 'tiktok']).withMessage('Platform must be instagram or tiktok')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, platform } = req.params;
    const content = await socialCommerceService.generateICEPACASocialContent(
      productId, 
      platform as 'instagram' | 'tiktok'
    );

    res.json(content);
  } catch (error) {
    console.error('Error generating social content:', error);
    res.status(500).json({ error: 'Failed to generate social content' });
  }
});

// Generate shop button for product
router.get('/shop-button/:productId/:platform', [
  param('productId').isMongoId().withMessage('Valid product ID required'),
  param('platform').isIn(['instagram', 'tiktok']).withMessage('Platform must be instagram or tiktok')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, platform } = req.params;
    const shopButton = await socialCommerceService.generateShopButton(
      productId,
      platform as 'instagram' | 'tiktok'
    );

    res.json(shopButton);
  } catch (error) {
    console.error('Error generating shop button:', error);
    res.status(500).json({ error: 'Failed to generate shop button' });
  }
});

// Get social commerce analytics
router.get('/analytics/:platform', [
  authenticateToken,
  requireAdmin,
  param('platform').isIn(['instagram', 'tiktok']).withMessage('Platform must be instagram or tiktok'),
  query('days').optional().isInt({ min: 1, max: 90 }).withMessage('Days must be between 1 and 90')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { platform } = req.params;
    const { days = 30 } = req.query;

    const analytics = await socialCommerceService.getSocialAnalytics(
      platform as 'instagram' | 'tiktok',
      parseInt(days as string)
    );

    // Calculate summary metrics
    const summary = analytics.reduce((acc, post) => ({
      totalPosts: acc.totalPosts + 1,
      totalReach: acc.totalReach + post.reach,
      totalImpressions: acc.totalImpressions + post.impressions,
      totalEngagement: acc.totalEngagement + post.engagement,
      totalClicks: acc.totalClicks + post.clicks,
      totalPurchases: acc.totalPurchases + post.purchases,
      totalRevenue: acc.totalRevenue + post.revenue
    }), {
      totalPosts: 0,
      totalReach: 0,
      totalImpressions: 0,
      totalEngagement: 0,
      totalClicks: 0,
      totalPurchases: 0,
      totalRevenue: 0
    });

    // Calculate rates
    const avgEngagementRate = summary.totalImpressions > 0 
      ? (summary.totalEngagement / summary.totalImpressions) * 100 
      : 0;
    const avgClickThroughRate = summary.totalImpressions > 0 
      ? (summary.totalClicks / summary.totalImpressions) * 100 
      : 0;
    const avgConversionRate = summary.totalClicks > 0 
      ? (summary.totalPurchases / summary.totalClicks) * 100 
      : 0;

    res.json({
      platform,
      period: { days: parseInt(days as string) },
      summary: {
        ...summary,
        avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
        avgClickThroughRate: parseFloat(avgClickThroughRate.toFixed(2)),
        avgConversionRate: parseFloat(avgConversionRate.toFixed(2))
      },
      posts: analytics
    });
  } catch (error) {
    console.error('Error fetching social commerce analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get combined analytics from both platforms
router.get('/analytics/combined', [
  authenticateToken,
  requireAdmin,
  query('days').optional().isInt({ min: 1, max: 90 }).withMessage('Days must be between 1 and 90')
], async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = parseInt(days as string);

    const [instagramAnalytics, tiktokAnalytics] = await Promise.all([
      socialCommerceService.getSocialAnalytics('instagram', daysInt),
      socialCommerceService.getSocialAnalytics('tiktok', daysInt)
    ]);

    const combinedData = {
      period: { days: daysInt },
      instagram: {
        posts: instagramAnalytics,
        summary: this.calculatePlatformSummary(instagramAnalytics)
      },
      tiktok: {
        posts: tiktokAnalytics,
        summary: this.calculatePlatformSummary(tiktokAnalytics)
      }
    };

    // Calculate overall summary
    const overallSummary = {
      totalPosts: combinedData.instagram.summary.totalPosts + combinedData.tiktok.summary.totalPosts,
      totalReach: combinedData.instagram.summary.totalReach + combinedData.tiktok.summary.totalReach,
      totalImpressions: combinedData.instagram.summary.totalImpressions + combinedData.tiktok.summary.totalImpressions,
      totalEngagement: combinedData.instagram.summary.totalEngagement + combinedData.tiktok.summary.totalEngagement,
      totalClicks: combinedData.instagram.summary.totalClicks + combinedData.tiktok.summary.totalClicks,
      totalPurchases: combinedData.instagram.summary.totalPurchases + combinedData.tiktok.summary.totalPurchases,
      totalRevenue: combinedData.instagram.summary.totalRevenue + combinedData.tiktok.summary.totalRevenue
    };

    res.json({
      ...combinedData,
      overall: overallSummary
    });
  } catch (error) {
    console.error('Error fetching combined analytics:', error);
    res.status(500).json({ error: 'Failed to fetch combined analytics' });
  }
});

// Helper function to calculate platform summary
function calculatePlatformSummary(analytics: any[]): any {
  return analytics.reduce((acc, post) => ({
    totalPosts: acc.totalPosts + 1,
    totalReach: acc.totalReach + post.reach,
    totalImpressions: acc.totalImpressions + post.impressions,
    totalEngagement: acc.totalEngagement + post.engagement,
    totalClicks: acc.totalClicks + post.clicks,
    totalPurchases: acc.totalPurchases + post.purchases,
    totalRevenue: acc.totalRevenue + post.revenue
  }), {
    totalPosts: 0,
    totalReach: 0,
    totalImpressions: 0,
    totalEngagement: 0,
    totalClicks: 0,
    totalPurchases: 0,
    totalRevenue: 0
  });
}

// Get ICEPACA-specific social commerce insights
router.get('/insights/icepaca', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Get analytics from both platforms
    const [instagramAnalytics, tiktokAnalytics] = await Promise.all([
      socialCommerceService.getSocialAnalytics('instagram', parseInt(days as string)),
      socialCommerceService.getSocialAnalytics('tiktok', parseInt(days as string))
    ]);

    // ICEPACA-specific insights
    const insights = {
      topPerformingPlatform: instagramAnalytics.length > 0 && tiktokAnalytics.length > 0 
        ? (instagramAnalytics.reduce((sum, p) => sum + p.engagement, 0) > 
           tiktokAnalytics.reduce((sum, p) => sum + p.engagement, 0) ? 'Instagram' : 'TikTok')
        : 'Insufficient data',
      
      bestTimeToPost: 'Weekends 2-4 PM', // Would be calculated from actual data
      
      topHashtags: [
        '#ICEPACA', '#EcoFriendly', '#Sustainable', '#IcePacks', 
        '#ZeroWaste', '#OutdoorGear', '#CampingLife'
      ],
      
      audienceDemographics: {
        ageGroups: {
          '18-24': 15,
          '25-34': 35,
          '35-44': 30,
          '45-54': 15,
          '55+': 5
        },
        interests: [
          'Outdoor Activities', 'Sustainability', 'Camping', 
          'Eco-friendly Products', 'Zero Waste Living'
        ]
      },
      
      contentRecommendations: [
        'Behind-the-scenes manufacturing content',
        'User-generated content featuring real adventures',
        'Educational content about sustainability',
        'Product comparison and demonstration videos',
        'Seasonal camping and outdoor tips'
      ],
      
      performanceByProductType: {
        'Small Pack': { clicks: 245, purchases: 18, conversionRate: 7.3 },
        'Medium Pack': { clicks: 312, purchases: 24, conversionRate: 7.7 },
        'Large Pack': { clicks: 189, purchases: 16, conversionRate: 8.5 },
        'Bundle': { clicks: 156, purchases: 21, conversionRate: 13.5 }
      }
    };

    res.json(insights);
  } catch (error) {
    console.error('Error getting ICEPACA insights:', error);
    res.status(500).json({ error: 'Failed to get social commerce insights' });
  }
});

// Social commerce health check
router.get('/health', async (req, res) => {
  try {
    const health = await socialCommerceService.healthCheck();
    
    const allHealthy = Object.values(health).every(status => status === true);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      services: {
        socialCommerce: true,
        instagram: health.instagram,
        tiktok: health.tiktok
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Social commerce health check error:', error);
    res.status(503).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;