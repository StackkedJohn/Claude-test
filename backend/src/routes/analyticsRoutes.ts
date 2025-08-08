import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { body, query, validationResult } from 'express-validator';
import analyticsService from '../services/analyticsService';

const router = express.Router();

// Get GTM configuration (public endpoint for frontend)
router.get('/config/gtm', async (req, res) => {
  try {
    const config = analyticsService.getGTMConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting GTM config:', error);
    res.status(500).json({ error: 'Failed to get GTM configuration' });
  }
});

// Get GA4 configuration (public endpoint for frontend)
router.get('/config/ga4', async (req, res) => {
  try {
    const config = analyticsService.getGA4Config();
    res.json(config);
  } catch (error) {
    console.error('Error getting GA4 config:', error);
    res.status(500).json({ error: 'Failed to get GA4 configuration' });
  }
});

// Track events from frontend
router.post('/track/event', [
  body('eventName').notEmpty().withMessage('Event name is required'),
  body('parameters').isObject().withMessage('Parameters must be an object'),
  body('userId').optional().isString(),
  body('sessionId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { eventName, parameters, userId, sessionId, customDimensions } = req.body;

    const success = await analyticsService.trackEvent({
      eventName,
      parameters,
      userId,
      sessionId,
      customDimensions
    });

    res.json({ success });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Track product view
router.post('/track/product-view', [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('productName').notEmpty().withMessage('Product name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('userId').optional().isString(),
  body('sessionId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const success = await analyticsService.trackProductView(req.body);
    res.json({ success });
  } catch (error) {
    console.error('Error tracking product view:', error);
    res.status(500).json({ error: 'Failed to track product view' });
  }
});

// Track add to cart
router.post('/track/add-to-cart', [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('productName').notEmpty().withMessage('Product name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('userId').optional().isString(),
  body('sessionId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const success = await analyticsService.trackAddToCart(req.body);
    res.json({ success });
  } catch (error) {
    console.error('Error tracking add to cart:', error);
    res.status(500).json({ error: 'Failed to track add to cart' });
  }
});

// Track purchase
router.post('/track/purchase', [
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
  body('value').isNumeric().withMessage('Value must be a number'),
  body('currency').notEmpty().withMessage('Currency is required'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.itemId').notEmpty().withMessage('Item ID is required'),
  body('items.*.itemName').notEmpty().withMessage('Item name is required'),
  body('items.*.category').notEmpty().withMessage('Item category is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be positive'),
  body('items.*.price').isNumeric().withMessage('Item price must be numeric'),
  body('userId').optional().isString(),
  body('sessionId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const success = await analyticsService.trackPurchase(req.body);
    res.json({ success });
  } catch (error) {
    console.error('Error tracking purchase:', error);
    res.status(500).json({ error: 'Failed to track purchase' });
  }
});

// Track AI feature usage
router.post('/track/ai-feature', [
  body('feature').isIn(['chatbot', 'ar_preview', 'dynamic_pricing', 'fraud_detection'])
    .withMessage('Feature must be one of: chatbot, ar_preview, dynamic_pricing, fraud_detection'),
  body('action').notEmpty().withMessage('Action is required'),
  body('productId').optional().isString(),
  body('userId').optional().isString(),
  body('sessionId').optional().isString(),
  body('metadata').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const success = await analyticsService.trackAIFeatureUsage(req.body);
    res.json({ success });
  } catch (error) {
    console.error('Error tracking AI feature usage:', error);
    res.status(500).json({ error: 'Failed to track AI feature usage' });
  }
});

// Track user flow step
router.post('/track/user-flow', [
  body('stepName').notEmpty().withMessage('Step name is required'),
  body('page').notEmpty().withMessage('Page is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('userId').optional().isString(),
  body('exitRate').optional().isNumeric(),
  body('conversionRate').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const success = await analyticsService.trackUserFlow({
      ...req.body,
      timestamp: new Date()
    });

    res.json({ success });
  } catch (error) {
    console.error('Error tracking user flow:', error);
    res.status(500).json({ error: 'Failed to track user flow' });
  }
});

// Track heatmap data
router.post('/track/heatmap', [
  body('page').notEmpty().withMessage('Page is required'),
  body('element').notEmpty().withMessage('Element is required'),
  body('x').isNumeric().withMessage('X coordinate must be numeric'),
  body('y').isNumeric().withMessage('Y coordinate must be numeric'),
  body('clicks').isInt({ min: 1 }).withMessage('Clicks must be a positive integer'),
  body('scrollDepth').optional().isNumeric(),
  body('timeOnElement').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const success = await analyticsService.trackHeatmapData(req.body);
    res.json({ success });
  } catch (error) {
    console.error('Error tracking heatmap data:', error);
    res.status(500).json({ error: 'Failed to track heatmap data' });
  }
});

// Get analytics report (admin only)
router.get('/report', [
  authenticateToken,
  requireAdmin,
  query('startDate').notEmpty().withMessage('Start date is required'),
  query('endDate').notEmpty().withMessage('End date is required'),
  query('metrics').notEmpty().withMessage('Metrics are required'),
  query('dimensions').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, metrics, dimensions, filters } = req.query;

    const reportParams = {
      startDate: startDate as string,
      endDate: endDate as string,
      metrics: (metrics as string).split(','),
      dimensions: dimensions ? (dimensions as string).split(',') : undefined,
      filters: filters ? JSON.parse(filters as string) : undefined
    };

    const report = await analyticsService.getAnalyticsReport(reportParams);
    res.json(report);
  } catch (error) {
    console.error('Error getting analytics report:', error);
    res.status(500).json({ error: 'Failed to get analytics report' });
  }
});

// Get real-time analytics data (admin only)
router.get('/realtime', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const realtimeData = await analyticsService.getRealTimeData();
    res.json(realtimeData);
  } catch (error) {
    console.error('Error getting real-time data:', error);
    res.status(500).json({ error: 'Failed to get real-time analytics data' });
  }
});

// Get conversion goals (admin only)
router.get('/conversion-goals', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const goals = analyticsService.getDefaultConversionGoals();
    res.json({ goals });
  } catch (error) {
    console.error('Error getting conversion goals:', error);
    res.status(500).json({ error: 'Failed to get conversion goals' });
  }
});

// Track conversion goal achievement
router.post('/track/conversion', [
  authenticateToken, // Optional authentication for conversions
  body('goalId').notEmpty().withMessage('Goal ID is required'),
  body('eventData').isObject().withMessage('Event data must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { goalId, eventData } = req.body;
    const goals = analyticsService.getDefaultConversionGoals();
    const goal = goals.find(g => g.id === goalId);

    if (!goal) {
      return res.status(404).json({ error: 'Conversion goal not found' });
    }

    const success = await analyticsService.trackConversionGoal(goal, eventData);
    res.json({ success, goal: goal.name });
  } catch (error) {
    console.error('Error tracking conversion:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// Get ICEPACA-specific analytics dashboard data (admin only)
router.get('/dashboard/icepaca', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - (parseInt(days as string) * 24 * 60 * 60 * 1000))
      .toISOString().split('T')[0];

    // Get multiple reports for ICEPACA dashboard
    const [
      overviewReport,
      productReport,
      aiFeatureReport,
      conversionReport
    ] = await Promise.all([
      analyticsService.getAnalyticsReport({
        startDate,
        endDate,
        metrics: ['sessions', 'pageviews', 'bounceRate', 'averageSessionDuration'],
        dimensions: ['date']
      }),
      analyticsService.getAnalyticsReport({
        startDate,
        endDate,
        metrics: ['sessions', 'pageviews'],
        dimensions: ['pagePath'],
        filters: [{ dimension: 'pagePath', operator: 'contains', value: '/products/' }]
      }),
      analyticsService.getAnalyticsReport({
        startDate,
        endDate,
        metrics: ['eventCount'],
        dimensions: ['customEvent:ai_feature_type']
      }),
      analyticsService.getAnalyticsReport({
        startDate,
        endDate,
        metrics: ['conversions', 'conversionRate'],
        dimensions: ['conversionGoalId']
      })
    ]);

    const dashboardData = {
      overview: overviewReport,
      products: productReport,
      aiFeatures: aiFeatureReport,
      conversions: conversionReport,
      period: {
        startDate,
        endDate,
        days: parseInt(days as string)
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error getting ICEPACA dashboard data:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Analytics health check
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await analyticsService.healthCheck();
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      services: {
        analytics: isHealthy,
        ga4: isHealthy,
        gtm: true // GTM is client-side, so always "healthy" from server perspective
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics health check error:', error);
    res.status(503).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;