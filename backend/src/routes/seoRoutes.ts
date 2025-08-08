import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { param, body, query, validationResult } from 'express-validator';
import seoService from '../services/seoService';

const router = express.Router();

// Get meta data for product
router.get('/meta/product/:productId', [
  param('productId').isMongoId().withMessage('Valid product ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId } = req.params;
    const metaData = await seoService.generateProductMeta(productId);

    res.json(metaData);
  } catch (error) {
    console.error('Error generating product meta:', error);
    res.status(500).json({ error: 'Failed to generate meta data' });
  }
});

// Get meta data for blog post
router.get('/meta/blog/:blogId', [
  param('blogId').isMongoId().withMessage('Valid blog ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { blogId } = req.params;
    const metaData = await seoService.generateBlogMeta(blogId);

    res.json(metaData);
  } catch (error) {
    console.error('Error generating blog meta:', error);
    res.status(500).json({ error: 'Failed to generate meta data' });
  }
});

// Get schema markup for product
router.get('/schema/product/:productId', [
  param('productId').isMongoId().withMessage('Valid product ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId } = req.params;
    const schema = await seoService.generateProductSchema(productId);

    res.json(schema);
  } catch (error) {
    console.error('Error generating product schema:', error);
    res.status(500).json({ error: 'Failed to generate schema markup' });
  }
});

// Get schema markup for blog post
router.get('/schema/blog/:blogId', [
  param('blogId').isMongoId().withMessage('Valid blog ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { blogId } = req.params;
    const schema = await seoService.generateBlogSchema(blogId);

    res.json(schema);
  } catch (error) {
    console.error('Error generating blog schema:', error);
    res.status(500).json({ error: 'Failed to generate schema markup' });
  }
});

// Get organization schema
router.get('/schema/organization', async (req, res) => {
  try {
    const schema = seoService.generateOrganizationSchema();
    res.json(schema);
  } catch (error) {
    console.error('Error generating organization schema:', error);
    res.status(500).json({ error: 'Failed to generate organization schema' });
  }
});

// Get website schema
router.get('/schema/website', async (req, res) => {
  try {
    const schema = seoService.generateWebsiteSchema();
    res.json(schema);
  } catch (error) {
    console.error('Error generating website schema:', error);
    res.status(500).json({ error: 'Failed to generate website schema' });
  }
});

// Get breadcrumb schema
router.post('/schema/breadcrumb', [
  body('breadcrumbs').isArray().withMessage('Breadcrumbs array required'),
  body('breadcrumbs.*.name').notEmpty().withMessage('Breadcrumb name required'),
  body('breadcrumbs.*.url').notEmpty().withMessage('Breadcrumb URL required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { breadcrumbs } = req.body;
    const schema = seoService.generateBreadcrumbSchema(breadcrumbs);

    res.json(schema);
  } catch (error) {
    console.error('Error generating breadcrumb schema:', error);
    res.status(500).json({ error: 'Failed to generate breadcrumb schema' });
  }
});

// Get FAQ schema for product
router.get('/schema/faq/product/:productId', [
  param('productId').isMongoId().withMessage('Valid product ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId } = req.params;
    const schema = seoService.generateProductFAQSchema(productId);

    res.json(schema);
  } catch (error) {
    console.error('Error generating FAQ schema:', error);
    res.status(500).json({ error: 'Failed to generate FAQ schema' });
  }
});

// Analyze competitor SEO (admin only)
router.post('/analyze/competitors', [
  authenticateToken,
  requireAdmin,
  body('urls').isArray().withMessage('URLs array required'),
  body('urls.*').isURL().withMessage('Valid URLs required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { urls } = req.body;
    
    if (urls.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 URLs allowed for analysis' });
    }

    const analysis = await seoService.analyzeCompetitorSEO(urls);
    
    // Generate recommendations for each competitor
    const analysisWithRecommendations = analysis.map(comp => ({
      ...comp,
      recommendations: comp.error ? [] : seoService.generateSEORecommendations(comp)
    }));

    res.json({
      analysis: analysisWithRecommendations,
      summary: {
        totalAnalyzed: analysis.length,
        successful: analysis.filter(a => !a.error).length,
        failed: analysis.filter(a => a.error).length
      }
    });
  } catch (error) {
    console.error('Error analyzing competitors:', error);
    res.status(500).json({ error: 'Failed to analyze competitor SEO' });
  }
});

// Generate SEO recommendations for URL (admin only)
router.post('/recommendations', [
  authenticateToken,
  requireAdmin,
  body('analysis').isObject().withMessage('Analysis data required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { analysis } = req.body;
    const recommendations = seoService.generateSEORecommendations(analysis);

    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate SEO recommendations' });
  }
});

// Get complete SEO package for page
router.get('/package/:type/:id', [
  param('type').isIn(['product', 'blog']).withMessage('Type must be product or blog'),
  param('id').isMongoId().withMessage('Valid ID required'),
  query('includeFAQ').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, id } = req.params;
    const { includeFAQ = false } = req.query;

    const seoPackage: any = {
      meta: null,
      schema: {
        main: null,
        organization: seoService.generateOrganizationSchema(),
        website: seoService.generateWebsiteSchema()
      }
    };

    if (type === 'product') {
      seoPackage.meta = await seoService.generateProductMeta(id);
      seoPackage.schema.main = await seoService.generateProductSchema(id);
      
      if (includeFAQ) {
        seoPackage.schema.faq = seoService.generateProductFAQSchema(id);
      }
    } else if (type === 'blog') {
      seoPackage.meta = await seoService.generateBlogMeta(id);
      seoPackage.schema.main = await seoService.generateBlogSchema(id);
    }

    res.json(seoPackage);
  } catch (error) {
    console.error('Error generating SEO package:', error);
    res.status(500).json({ error: 'Failed to generate complete SEO package' });
  }
});

// SEO health check
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await seoService.healthCheck();
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      services: {
        seoService: true,
        openai: isHealthy,
        schemaGeneration: true,
        metaGeneration: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SEO health check error:', error);
    res.status(503).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;