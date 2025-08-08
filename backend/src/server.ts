import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import passport from './config/passport';
import productRoutes from './routes/products';
import cartRoutes from './routes/cart';
import adminRoutes from './routes/admin';
import paymentsRoutes from './routes/payments';
import shippingRoutes from './routes/shipping';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import reviewRoutes from './routes/reviews';
import contentRoutes from './routes/content';
import blogRoutes from './routes/blogRoutes';
import aiRoutes from './routes/aiRoutes';
import seoRoutes from './routes/seoRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import socialCommerceRoutes from './routes/socialCommerceRoutes';
import affiliateRoutes from './routes/affiliateRoutes';
import alertService from './services/alertService';
import inventoryService from './services/inventoryService';
import notificationService from './services/notificationService';
import blogSchedulerService from './services/blogSchedulerService';
import personalizationService from './services/personalizationService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/icepaca';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Passport middleware
app.use(passport.initialize());

// Database connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    initializeProducts();
    
    // Start alert monitoring (every 30 minutes)
    alertService.startPeriodicMonitoring(30);
    
    // Start inventory cleanup (every 15 minutes)
    inventoryService.startPeriodicCleanup(15);
    
    // Start blog scheduler
    blogSchedulerService.start();
    
    // Start personalization cleanup (every 6 hours)
    setInterval(() => {
      personalizationService.cleanup();
    }, 6 * 60 * 60 * 1000);
    
    // Clean up old alerts daily
    setInterval(() => {
      alertService.deleteOldAlerts(30);
    }, 24 * 60 * 60 * 1000); // 24 hours
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/social-commerce', socialCommerceRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/shipping', shippingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'ICEPACA API is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Legacy search endpoint (for backward compatibility)
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  
  const mockProducts = [
    { id: 1, name: 'ICEPACA Small Pack', description: 'Compact reusable ice pack for lunch boxes' },
    { id: 2, name: 'ICEPACA Medium Pack', description: 'Medium-sized ice pack for coolers' },
    { id: 3, name: 'ICEPACA Large Pack', description: 'Large ice pack for extended cooling' }
  ];
  
  if (q) {
    const filtered = mockProducts.filter(product => 
      product.name.toLowerCase().includes(q.toString().toLowerCase()) ||
      product.description.toLowerCase().includes(q.toString().toLowerCase())
    );
    res.json(filtered);
  } else {
    res.json(mockProducts);
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Initialize default products
async function initializeProducts() {
  const Product = require('./models/Product').default;
  
  try {
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('Initializing default products...');
      await createDefaultProducts();
    }
  } catch (error) {
    console.error('Error initializing products:', error);
  }
}

async function createDefaultProducts() {
  const Product = require('./models/Product').default;
  
  const defaultProducts = [
    {
      name: 'ICEPACA Small Pack',
      description: 'Ice replacement without watery mess, lasts longer than comparable ice, perfect for lunch boxes. Pays for itself after several uses.',
      price: 10,
      compareAtPrice: 15,
      images: [{
        url: '/images/icepaca-small.jpg',
        altText: 'ICEPACA reusable ice pack small size in blue packaging',
        isPrimary: true
      }],
      dimensions: { width: 8, height: 6, depth: 1, unit: 'inches' },
      weight: { value: 0.75, unit: 'lbs' }, // More accurate for small pack
      stock: { quantity: 100, lowStockThreshold: 20, inStock: true, reserved: 0 },
      category: 'Ice Packs',
      tags: ['small', 'lunch', 'compact', 'reusable'],
      features: ['Leak-proof design', 'Non-toxic gel', 'Freezes in 4 hours'],
      specifications: {
        capacity: '16 oz equivalent',
        freezeTime: '4-6 hours',
        coolingDuration: '6-8 hours',
        material: 'Food-safe TPU',
        safetyRating: 'FDA Approved'
      },
      sustainability: {
        carbonSavedPerUse: 0.5,
        reusabilityCount: 1000,
        ecoFriendlyMaterials: ['Recyclable TPU', 'Non-toxic gel'],
        recyclable: true
      },
      recommendations: {
        relatedProducts: [],
        bundlesWith: [],
        useCases: ['Lunch boxes', 'Small coolers', 'Baby bottles']
      },
      isActive: true
    },
    {
      name: 'ICEPACA Medium Pack',
      description: 'Perfect for coolers and extended outings. Ice replacement without watery mess, lasts longer than comparable ice. Ideal for picnics and day trips.',
      price: 15,
      compareAtPrice: 22,
      images: [{
        url: '/images/icepaca-medium.jpg',
        altText: 'ICEPACA reusable ice pack medium size in blue packaging',
        isPrimary: true
      }],
      dimensions: { width: 10, height: 8, depth: 1.5, unit: 'inches' },
      weight: { value: 1.25, unit: 'lbs' }, // More accurate for medium pack
      stock: { quantity: 75, lowStockThreshold: 15, inStock: true, reserved: 0 },
      category: 'Ice Packs',
      tags: ['medium', 'cooler', 'picnic', 'reusable'],
      features: ['Extended cooling', 'Durable construction', 'Ergonomic shape'],
      specifications: {
        capacity: '32 oz equivalent',
        freezeTime: '6-8 hours',
        coolingDuration: '10-12 hours',
        material: 'Food-safe TPU',
        safetyRating: 'FDA Approved'
      },
      sustainability: {
        carbonSavedPerUse: 1.2,
        reusabilityCount: 1200,
        ecoFriendlyMaterials: ['Recyclable TPU', 'Non-toxic gel'],
        recyclable: true
      },
      recommendations: {
        relatedProducts: [],
        bundlesWith: [],
        useCases: ['Coolers', 'Picnics', 'Camping', 'Beach trips']
      },
      isActive: true
    },
    {
      name: 'ICEPACA Large Pack',
      description: 'Maximum cooling power for extended adventures. Perfect for marine use, large coolers, and multi-day trips. Superior ice replacement.',
      price: 20,
      compareAtPrice: 30,
      images: [{
        url: '/images/icepaca-large.jpg',
        altText: 'ICEPACA reusable ice pack large size in blue packaging',
        isPrimary: true
      }],
      dimensions: { width: 12, height: 10, depth: 2, unit: 'inches' },
      weight: { value: 2.1, unit: 'lbs' }, // More accurate for large pack
      stock: { quantity: 50, lowStockThreshold: 10, inStock: true, reserved: 0 },
      category: 'Ice Packs',
      tags: ['large', 'marine', 'camping', 'extended-cooling'],
      features: ['Maximum cooling power', 'Marine-grade durability', 'Puncture-resistant'],
      specifications: {
        capacity: '64 oz equivalent',
        freezeTime: '8-12 hours',
        coolingDuration: '16-24 hours',
        material: 'Marine-grade TPU',
        safetyRating: 'FDA Approved'
      },
      sustainability: {
        carbonSavedPerUse: 2.0,
        reusabilityCount: 1500,
        ecoFriendlyMaterials: ['Recyclable TPU', 'Non-toxic gel'],
        recyclable: true
      },
      recommendations: {
        relatedProducts: [],
        bundlesWith: [],
        useCases: ['Marine use', 'Large coolers', 'Multi-day camping', 'Commercial use']
      },
      isActive: true
    },
    {
      name: 'ICEPACA Adventure Bundle',
      description: 'Complete cooling solution with all sizes included. Perfect for any adventure - from lunch boxes to marine expeditions. Best value bundle!',
      price: 45,
      compareAtPrice: 65,
      images: [{
        url: '/images/icepaca-bundle.jpg',
        altText: 'ICEPACA adventure bundle with small, medium, and large ice packs in blue packaging',
        isPrimary: true
      }],
      dimensions: { width: 12, height: 10, depth: 4.5, unit: 'inches' },
      weight: { value: 4.1, unit: 'lbs' }, // More accurate for bundle (sum of all packs)
      stock: { quantity: 30, lowStockThreshold: 5, inStock: true, reserved: 0 },
      category: 'Bundles',
      tags: ['bundle', 'complete-set', 'adventure', 'value'],
      features: ['All three sizes', 'Best value', 'Complete solution', 'Gift-ready packaging'],
      specifications: {
        capacity: 'Small + Medium + Large',
        freezeTime: '4-12 hours (varies by size)',
        coolingDuration: '6-24 hours (varies by size)',
        material: 'Food-safe TPU',
        safetyRating: 'FDA Approved'
      },
      sustainability: {
        carbonSavedPerUse: 3.7,
        reusabilityCount: 1200,
        ecoFriendlyMaterials: ['Recyclable TPU', 'Non-toxic gel'],
        recyclable: true
      },
      bundle: {
        isBundle: true,
        includedProducts: [],
        bundleDiscount: 20
      },
      recommendations: {
        relatedProducts: [],
        bundlesWith: [],
        useCases: ['All activities', 'Gift giving', 'Family adventures', 'Professional use']
      },
      isActive: true
    }
  ];

  try {
    await Product.insertMany(defaultProducts);
    console.log('Default products created successfully');
  } catch (error) {
    console.error('Error creating default products:', error);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});