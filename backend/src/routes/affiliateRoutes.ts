import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { body, param, query, validationResult } from 'express-validator';
import affiliateService from '../services/affiliateService';

const router = express.Router();

// Submit affiliate application (public route)
router.post('/apply', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('website').optional().isURL().withMessage('Valid website URL required'),
  body('socialMedia').isObject().withMessage('Social media object is required'),
  body('audienceSize').isInt({ min: 0 }).withMessage('Audience size must be a positive integer'),
  body('niche').notEmpty().withMessage('Niche is required'),
  body('promotionMethods').isArray().withMessage('Promotion methods must be an array'),
  body('reasonForJoining').notEmpty().withMessage('Reason for joining is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const applicationData = {
      ...req.body,
      userId: req.user?.id // Will be undefined for non-authenticated users
    };

    const applicationId = await affiliateService.submitApplication(applicationData);

    res.status(201).json({
      success: true,
      applicationId,
      message: 'Application submitted successfully. We\'ll review it within 3-5 business days.'
    });
  } catch (error) {
    console.error('Error submitting affiliate application:', error);
    res.status(500).json({ error: 'Failed to submit affiliate application' });
  }
});

// Review affiliate application (admin only)
router.post('/applications/:applicationId/review', [
  authenticateToken,
  requireAdmin,
  param('applicationId').notEmpty().withMessage('Application ID is required'),
  body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected'),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { applicationId } = req.params;
    const { decision, notes } = req.body;

    const success = await affiliateService.reviewApplication(applicationId, decision, notes);

    if (success) {
      res.json({
        success: true,
        message: `Application ${decision} successfully`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to review application'
      });
    }
  } catch (error) {
    console.error('Error reviewing affiliate application:', error);
    res.status(500).json({ error: 'Failed to review application' });
  }
});

// Generate affiliate link (authenticated affiliates only)
router.post('/links', [
  authenticateToken,
  body('productId').optional().isString(),
  body('campaignId').optional().isString(),
  body('customName').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // In production, get affiliateId from user's affiliate profile
    const affiliateId = 'ICEABCD123'; // Mock affiliate ID
    const { productId, campaignId, customName } = req.body;

    const link = await affiliateService.generateAffiliateLink(
      affiliateId,
      productId,
      campaignId,
      customName
    );

    res.json({
      success: true,
      link: {
        id: link.id,
        affiliateUrl: link.affiliateUrl,
        shortCode: link.shortCode,
        customName: link.customName
      }
    });
  } catch (error) {
    console.error('Error generating affiliate link:', error);
    res.status(500).json({ error: 'Failed to generate affiliate link' });
  }
});

// Track affiliate link click (public route)
router.get('/click/:shortCode', [
  param('shortCode').notEmpty().withMessage('Short code is required')
], async (req, res) => {
  try {
    const { shortCode } = req.params;
    const userAgent = req.get('User-Agent') || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    // Track the click
    await affiliateService.trackClick(shortCode, userAgent, ipAddress);

    // In production, redirect to the actual product/page
    // For now, return success
    res.json({
      success: true,
      message: 'Click tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Get affiliate analytics (authenticated affiliates only)
router.get('/analytics', [
  authenticateToken,
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
], async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // In production, get affiliateId from user's affiliate profile
    const affiliateId = 'ICEABCD123'; // Mock affiliate ID

    const analytics = await affiliateService.getAffiliateAnalytics(
      affiliateId,
      parseInt(days as string)
    );

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching affiliate analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Calculate commission for order (internal route)
router.post('/commission/calculate', [
  authenticateToken,
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('affiliateId').notEmpty().withMessage('Affiliate ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, affiliateId } = req.body;

    const commission = await affiliateService.calculateCommission(orderId, affiliateId);

    if (commission) {
      res.json({
        success: true,
        commission
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Unable to calculate commission'
      });
    }
  } catch (error) {
    console.error('Error calculating commission:', error);
    res.status(500).json({ error: 'Failed to calculate commission' });
  }
});

// Process commission payments (admin only)
router.post('/payments/process', [
  authenticateToken,
  requireAdmin,
  body('affiliateIds').isArray().withMessage('Affiliate IDs must be an array'),
  body('affiliateIds.*').notEmpty().withMessage('Each affiliate ID must be provided')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { affiliateIds } = req.body;

    const results = await affiliateService.processCommissionPayments(affiliateIds);

    res.json({
      success: true,
      results: {
        successful: results.successful.length,
        failed: results.failed.length,
        details: results
      }
    });
  } catch (error) {
    console.error('Error processing commission payments:', error);
    res.status(500).json({ error: 'Failed to process payments' });
  }
});

// Create affiliate campaign (admin only)
router.post('/campaigns', [
  authenticateToken,
  requireAdmin,
  body('name').notEmpty().withMessage('Campaign name is required'),
  body('description').notEmpty().withMessage('Campaign description is required'),
  body('productIds').isArray().withMessage('Product IDs must be an array'),
  body('commissionRate').isFloat({ min: 0, max: 50 }).withMessage('Commission rate must be between 0 and 50'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('targetAudience').isArray().withMessage('Target audience must be an array'),
  body('materials').isObject().withMessage('Materials must be an object'),
  body('requirements').isArray().withMessage('Requirements must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const campaignData = {
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      isActive: true
    };

    const campaignId = await affiliateService.createCampaign(campaignData);

    res.status(201).json({
      success: true,
      campaignId,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('Error creating affiliate campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Initialize ICEPACA default campaigns (admin only)
router.post('/campaigns/initialize-defaults', [
  authenticateToken,
  requireAdmin
], async (req, res) => {
  try {
    const campaignIds = await affiliateService.createICEPACACampaigns();

    res.json({
      success: true,
      campaignIds,
      message: `Successfully created ${campaignIds.length} default ICEPACA campaigns`
    });
  } catch (error) {
    console.error('Error creating default campaigns:', error);
    res.status(500).json({ error: 'Failed to create default campaigns' });
  }
});

// Get affiliate program info (public route for potential affiliates)
router.get('/program-info', async (req, res) => {
  try {
    const programInfo = {
      commissionRates: {
        bronze: '10-12%',
        silver: '12-15%',
        gold: '15-18%',
        platinum: '18-20%'
      },
      benefits: [
        'Competitive commission rates up to 20%',
        'Monthly bonus opportunities',
        'Exclusive access to new products',
        'Professional marketing materials',
        'Dedicated affiliate support',
        'Real-time tracking and analytics'
      ],
      requirements: [
        'Alignment with sustainability values',
        'Active social media presence',
        'Quality content creation',
        'FTC-compliant disclosure practices'
      ],
      idealPartners: [
        'Outdoor and camping influencers',
        'Sustainability advocates',
        'Family and parenting bloggers',
        'Zero-waste lifestyle creators',
        'Adventure and travel content creators'
      ],
      paymentSchedule: 'Monthly payments on the 15th',
      minimumPayout: '$50',
      cookieWindow: '30 days',
      supportedChannels: [
        'Social Media (Instagram, TikTok, YouTube)',
        'Blogs and Websites',
        'Email Marketing',
        'Video Content',
        'Podcast Sponsorships'
      ]
    };

    res.json(programInfo);
  } catch (error) {
    console.error('Error getting program info:', error);
    res.status(500).json({ error: 'Failed to get program information' });
  }
});

// Get marketing materials (authenticated affiliates only)
router.get('/materials', [authenticateToken], async (req, res) => {
  try {
    const materials = {
      banners: [
        {
          size: '728x90',
          variants: [
            '/affiliate/banners/icepaca-728x90-summer.jpg',
            '/affiliate/banners/icepaca-728x90-sustainability.jpg',
            '/affiliate/banners/icepaca-728x90-family.jpg'
          ]
        },
        {
          size: '300x250',
          variants: [
            '/affiliate/banners/icepaca-300x250-adventure.jpg',
            '/affiliate/banners/icepaca-300x250-eco.jpg'
          ]
        },
        {
          size: '160x600',
          variants: [
            '/affiliate/banners/icepaca-160x600-vertical.jpg'
          ]
        }
      ],
      productImages: [
        {
          product: 'Small Pack',
          images: [
            '/affiliate/products/small-pack-lifestyle-1.jpg',
            '/affiliate/products/small-pack-product-shot.jpg',
            '/affiliate/products/small-pack-in-lunchbox.jpg'
          ]
        },
        {
          product: 'Medium Pack',
          images: [
            '/affiliate/products/medium-pack-cooler.jpg',
            '/affiliate/products/medium-pack-camping.jpg'
          ]
        },
        {
          product: 'Adventure Bundle',
          images: [
            '/affiliate/products/bundle-complete-set.jpg',
            '/affiliate/products/bundle-lifestyle-adventure.jpg'
          ]
        }
      ],
      copyTemplates: {
        headlines: [
          'Keep Your Adventures Cool with ICEPACA',
          'Say Goodbye to Messy Ice Forever',
          'The Sustainable Choice for Cooling',
          'Reusable Ice Packs That Actually Work'
        ],
        descriptions: [
          'ICEPACA reusable ice packs last longer than ice, stay mess-free, and save money. Perfect for camping, lunch boxes, and any cooling need.',
          'Join thousands of happy customers who\'ve switched to ICEPACA. No more soggy food, no more buying ice - just reliable, sustainable cooling.',
          'Each ICEPACA pack replaces hundreds of bags of ice. Better for your wallet, better for the planet.'
        ],
        callsToAction: [
          'Shop ICEPACA Now',
          'Get Your ICEPACA Pack',
          'Start Cooling Sustainably',
          'Try ICEPACA Risk-Free'
        ]
      },
      socialMediaTemplates: {
        instagram: [
          'Keep it cool and sustainable! 🧊 ICEPACA packs are the game-changer I didn\'t know I needed. No more messy ice, no more waste! #ICEPACA #SustainableLiving #EcoFriendly',
          'Adventure update: These ICEPACA packs kept our drinks cold for the ENTIRE camping trip! 🏕️ Worth every penny and so much better than buying ice. #CampingGear #OutdoorLife #ZeroWaste'
        ],
        tiktok: [
          'POV: You discovered ice packs that actually work 🤯 ICEPACA has changed my lunch game forever! No more soggy sandwiches ✨ #ICEPACA #LifeHack #LunchBox',
          'Ice pack comparison: Regular ice vs ICEPACA after 8 hours... the results will shock you! 😱 #ProductReview #ICEPACA #SustainableTok'
        ]
      },
      videos: [
        {
          title: 'ICEPACA Product Demo',
          url: '/affiliate/videos/icepaca-demo-30s.mp4',
          duration: '30 seconds',
          description: 'Quick product demonstration showing ICEPACA in action'
        },
        {
          title: 'Camping with ICEPACA',
          url: '/affiliate/videos/icepaca-camping-60s.mp4',
          duration: '60 seconds',
          description: 'Lifestyle video showcasing ICEPACA during camping trip'
        }
      ]
    };

    res.json(materials);
  } catch (error) {
    console.error('Error getting marketing materials:', error);
    res.status(500).json({ error: 'Failed to get marketing materials' });
  }
});

// Get affiliate leaderboard (authenticated affiliates only)
router.get('/leaderboard', [
  authenticateToken,
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Period must be week, month, quarter, or year'),
  query('metric').optional().isIn(['sales', 'earnings', 'conversions']).withMessage('Metric must be sales, earnings, or conversions')
], async (req, res) => {
  try {
    const { period = 'month', metric = 'earnings' } = req.query;

    // Mock leaderboard data
    const leaderboard = [
      { rank: 1, affiliateId: 'ICEABC123', name: 'Adventure Mike', value: 1250, tier: 'gold' },
      { rank: 2, affiliateId: 'ICEDEF456', name: 'Eco Sarah', value: 980, tier: 'silver' },
      { rank: 3, affiliateId: 'ICEGHI789', name: 'Camping Chris', value: 750, tier: 'silver' },
      { rank: 4, affiliateId: 'ICEJKL012', name: 'Sustainable Sam', value: 650, tier: 'bronze' },
      { rank: 5, affiliateId: 'ICEMNO345', name: 'Family Blogger', value: 580, tier: 'bronze' }
    ];

    res.json({
      period,
      metric,
      leaderboard,
      userRank: Math.floor(Math.random() * 50) + 1, // Mock user's rank
      userValue: Math.floor(Math.random() * 500) + 100
    });
  } catch (error) {
    console.error('Error getting affiliate leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Affiliate service health check
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await affiliateService.healthCheck();
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      services: {
        affiliate: true,
        email: isHealthy,
        database: true // Mock - would check database connectivity
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Affiliate service health check error:', error);
    res.status(503).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;