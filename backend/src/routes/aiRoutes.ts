import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { body, validationResult, query } from 'express-validator';
import dialogflowService from '../services/dialogflowService';
import dynamicPricingService from '../services/dynamicPricingService';
import fraudDetectionService from '../services/fraudDetectionService';
import personalizationService from '../services/personalizationService';

const router = express.Router();

// Chatbot Routes

// Process chatbot message
router.post('/chatbot/message', [
  body('message').notEmpty().withMessage('Message is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('userId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, sessionId, userId, context } = req.body;

    // Process message through Dialogflow
    const response = await dialogflowService.processMessage(message, userId, context);

    // Track user interaction for personalization
    if (userId || sessionId) {
      await personalizationService.trackBehavior(sessionId, {
        type: 'page_view',
        data: {
          page: 'chatbot',
          query: message,
          intent: response.intent.name
        }
      });
    }

    res.json(response);
  } catch (error) {
    console.error('Chatbot message processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      fulfillmentText: "I'm sorry, I'm having trouble right now. Please try again or contact our support team."
    });
  }
});

// Convert speech to text
router.post('/chatbot/speech-to-text', [
  body('audioData').notEmpty().withMessage('Audio data is required'),
  body('sessionId').notEmpty().withMessage('Session ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { audioData, sessionId } = req.body;

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audioData.split(',')[1], 'base64');

    // Process speech to text
    const transcription = await dialogflowService.speechToText(audioBuffer);

    if (transcription) {
      res.json({ transcription });
    } else {
      res.status(400).json({ error: 'Could not transcribe audio' });
    }
  } catch (error) {
    console.error('Speech-to-text error:', error);
    res.status(500).json({ error: 'Failed to process speech' });
  }
});

// Dynamic Pricing Routes

// Get dynamic price for product
router.get('/pricing/product/:productId', [
  query('userId').optional().isString(),
  query('quantity').optional().isInt({ min: 1 }),
  query('sessionId').optional().isString()
], async (req, res) => {
  try {
    const { productId } = req.params;
    const { userId, quantity = 1, sessionId } = req.query;

    // Get user context for personalized pricing
    const context: any = {};
    if (sessionId) {
      context.sessionId = sessionId;
      
      // Add user segment data if available
      try {
        const analytics = await personalizationService.getUserAnalytics(sessionId as string);
        context.userSegment = analytics.segmentData.primary;
        context.loyaltyScore = analytics.engagementScore / 100;
      } catch (err) {
        // Continue without personalization data
      }
    }

    const pricing = await dynamicPricingService.calculatePrice(
      productId,
      userId as string,
      parseInt(quantity as string),
      context
    );

    res.json(pricing);
  } catch (error) {
    console.error('Dynamic pricing error:', error);
    res.status(500).json({ error: 'Failed to calculate dynamic price' });
  }
});

// Get pricing rules (admin only)
router.get('/pricing/rules', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const rules = dynamicPricingService.getPricingRules();
    res.json({ rules });
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    res.status(500).json({ error: 'Failed to fetch pricing rules' });
  }
});

// Add pricing rule (admin only)
router.post('/pricing/rules', [
  authenticateToken,
  requireAdmin,
  body('name').notEmpty().withMessage('Rule name is required'),
  body('type').isIn(['seasonal', 'demand', 'inventory', 'competitor', 'user_segment', 'time_based']).withMessage('Invalid rule type'),
  body('priority').isInt({ min: 1 }).withMessage('Priority must be a positive integer'),
  body('conditions').isArray().withMessage('Conditions must be an array'),
  body('adjustment').isObject().withMessage('Adjustment must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ruleData = req.body;
    const ruleId = dynamicPricingService.addPricingRule(ruleData);

    res.json({ ruleId, message: 'Pricing rule added successfully' });
  } catch (error) {
    console.error('Error adding pricing rule:', error);
    res.status(500).json({ error: 'Failed to add pricing rule' });
  }
});

// Get pricing analytics (admin only)
router.get('/pricing/analytics', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const analytics = await dynamicPricingService.getPricingAnalytics(parseInt(days as string));
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching pricing analytics:', error);
    res.status(500).json({ error: 'Failed to fetch pricing analytics' });
  }
});

// Fraud Detection Routes

// Analyze transaction for fraud
router.post('/fraud/analyze', [
  body('orderData').isObject().withMessage('Order data is required'),
  body('sessionData').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderData, sessionData } = req.body;

    const fraudAlert = await fraudDetectionService.detectFraud(orderData, sessionData);

    res.json(fraudAlert);
  } catch (error) {
    console.error('Fraud detection error:', error);
    res.status(500).json({ error: 'Failed to analyze transaction' });
  }
});

// Review fraud alert (admin only)
router.post('/fraud/alerts/:alertId/review', [
  authenticateToken,
  requireAdmin,
  body('action').isIn(['clear', 'block']).withMessage('Action must be clear or block'),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { alertId } = req.params;
    const { action, notes } = req.body;
    const reviewerId = req.user?.id;

    const success = await fraudDetectionService.reviewAlert(alertId, reviewerId, action, notes);

    if (success) {
      res.json({ message: `Alert ${action === 'clear' ? 'cleared' : 'confirmed'} successfully` });
    } else {
      res.status(404).json({ error: 'Alert not found' });
    }
  } catch (error) {
    console.error('Error reviewing fraud alert:', error);
    res.status(500).json({ error: 'Failed to review alert' });
  }
});

// Get fraud statistics (admin only)
router.get('/fraud/stats', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = await fraudDetectionService.getFraudStats(parseInt(days as string));
    res.json(stats);
  } catch (error) {
    console.error('Error fetching fraud stats:', error);
    res.status(500).json({ error: 'Failed to fetch fraud statistics' });
  }
});

// Block/unblock IPs and emails (admin only)
router.post('/fraud/blocklist', [
  authenticateToken,
  requireAdmin,
  body('type').isIn(['ip', 'email']).withMessage('Type must be ip or email'),
  body('value').notEmpty().withMessage('Value is required'),
  body('action').isIn(['add', 'remove']).withMessage('Action must be add or remove')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, value, action } = req.body;

    if (type === 'ip') {
      if (action === 'add') {
        fraudDetectionService.addSuspiciousIP(value);
      } else {
        fraudDetectionService.removeSuspiciousIP(value);
      }
    } else {
      if (action === 'add') {
        fraudDetectionService.blockEmail(value);
      } else {
        fraudDetectionService.unblockEmail(value);
      }
    }

    res.json({ message: `${type} ${action === 'add' ? 'added to' : 'removed from'} blocklist` });
  } catch (error) {
    console.error('Error updating blocklist:', error);
    res.status(500).json({ error: 'Failed to update blocklist' });
  }
});

// Personalization Routes

// Create user session
router.post('/personalization/session', [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('deviceInfo').optional().isObject(),
  body('location').optional().isObject(),
  body('utmParams').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sessionData = {
      ...req.body,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown'
    };

    const session = await personalizationService.createSession(sessionData);
    const profile = await personalizationService.createUserProfile(session.sessionId, req.body.userId);

    res.json({ session, profile });
  } catch (error) {
    console.error('Error creating personalization session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update consent preferences
router.post('/personalization/consent', [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('consent').isObject().withMessage('Consent data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId, consent } = req.body;

    await personalizationService.updateConsent(sessionId, consent);

    res.json({ message: 'Consent updated successfully' });
  } catch (error) {
    console.error('Error updating consent:', error);
    res.status(500).json({ error: 'Failed to update consent' });
  }
});

// Track user behavior
router.post('/personalization/track', [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('event').isObject().withMessage('Event data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId, event } = req.body;

    await personalizationService.trackBehavior(sessionId, event);

    res.json({ message: 'Event tracked successfully' });
  } catch (error) {
    console.error('Error tracking behavior:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get personalized homepage
router.get('/personalization/homepage/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const homepage = await personalizationService.generatePersonalizedHomepage(sessionId);

    res.json(homepage);
  } catch (error) {
    console.error('Error generating personalized homepage:', error);
    res.status(500).json({ error: 'Failed to generate personalized content' });
  }
});

// Get personalized product recommendations
router.get('/personalization/recommendations/:sessionId', [
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 10 } = req.query;

    // Get user profile
    const profile = await personalizationService.createUserProfile(sessionId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const recommendations = await personalizationService.getPersonalizedProductRecommendations(
      profile, 
      parseInt(limit as string)
    );

    res.json({ recommendations });
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get user analytics (admin only)
router.get('/personalization/analytics/:sessionId', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { sessionId } = req.params;

    const analytics = await personalizationService.getUserAnalytics(sessionId);

    res.json(analytics);
  } catch (error) {
    console.error('Error getting user analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get personalization service stats (admin only)
router.get('/personalization/stats', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const stats = personalizationService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting personalization stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Health check for AI services
router.get('/health', async (req, res) => {
  try {
    const healthChecks = await Promise.allSettled([
      dialogflowService.healthCheck(),
      // Add other service health checks as needed
    ]);

    const services = {
      dialogflow: healthChecks[0].status === 'fulfilled' && healthChecks[0].value,
      dynamicPricing: true, // Always healthy (no external dependencies)
      fraudDetection: true, // Always healthy (no external dependencies)
      personalization: true // Always healthy (no external dependencies)
    };

    const allHealthy = Object.values(services).every(status => status === true);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      services,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;