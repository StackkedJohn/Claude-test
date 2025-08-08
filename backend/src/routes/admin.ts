import express, { Request, Response } from 'express';
import Product from '../models/Product';
import AdminAlert from '../models/AdminAlert';
import Cart from '../models/Cart';

const router = express.Router();

// Simple auth middleware (in production, use proper JWT auth)
const requireAuth = (req: Request, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  
  // Simple token check - in production, implement proper JWT verification
  if (!authHeader || authHeader !== 'Bearer admin-token-123') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Get dashboard statistics
router.get('/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true });
    const lowStockProducts = await Product.countDocuments({
      isActive: true,
      $expr: { $lte: ['$stock.quantity', '$stock.lowStockThreshold'] }
    });
    const outOfStockProducts = await Product.countDocuments({
      isActive: true,
      'stock.quantity': 0
    });
    const totalAlerts = await AdminAlert.countDocuments({ isRead: false });
    const activeCarts = await Cart.countDocuments({
      totalItems: { $gt: 0 },
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    // Calculate total inventory value
    const products = await Product.find({ isActive: true });
    const totalInventoryValue = products.reduce((sum, product) => 
      sum + (product.price * product.stock.quantity), 0
    );

    res.json({
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalAlerts,
      activeCarts,
      totalInventoryValue
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching dashboard data' });
  }
});

// Get all products for admin
router.get('/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, sort = 'name', order = 'asc' } = req.query;

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj: any = {};
    sortObj[sort as string] = sortOrder;

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find({})
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments({});

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

// Create new product
router.post('/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const product = new Product(req.body);
    await product.save();

    res.status(201).json(product);
  } catch (error: any) {
    res.status(400).json({ error: 'Error creating product', details: error.message });
  }
});

// Update product
router.put('/products/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error: any) {
    res.status(400).json({ error: 'Error updating product', details: error.message });
  }
});

// Delete product (soft delete - set inactive)
router.delete('/products/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// Update product stock
router.put('/products/:id/stock', requireAuth, async (req: Request, res: Response) => {
  try {
    const { quantity, lowStockThreshold } = req.body;
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.stock.quantity = quantity;
    product.stock.inStock = quantity > 0;
    
    if (lowStockThreshold !== undefined) {
      product.stock.lowStockThreshold = lowStockThreshold;
    }

    await product.save();

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Error updating stock' });
  }
});

// Get low stock products
router.get('/products/low-stock', requireAuth, async (req: Request, res: Response) => {
  try {
    const lowStockProducts = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock.quantity', '$stock.lowStockThreshold'] }
    }).sort({ 'stock.quantity': 1 });

    res.json(lowStockProducts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching low stock products' });
  }
});

// Get admin alerts
router.get('/alerts', requireAuth, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, type, severity, unreadOnly = 'false' } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (unreadOnly === 'true') filter.isRead = false;

    const skip = (Number(page) - 1) * Number(limit);

    const alerts = await AdminAlert.find(filter)
      .populate('productId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AdminAlert.countDocuments(filter);

    res.json({
      alerts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching alerts' });
  }
});

// Mark alert as read
router.put('/alerts/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const alert = await AdminAlert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Error updating alert' });
  }
});

// Mark all alerts as read
router.put('/alerts/mark-all-read', requireAuth, async (req: Request, res: Response) => {
  try {
    await AdminAlert.updateMany(
      { isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All alerts marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Error updating alerts' });
  }
});

// Delete alert
router.delete('/alerts/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const alert = await AdminAlert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting alert' });
  }
});

// Get inventory report
router.get('/inventory/report', requireAuth, async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ isActive: true });

    const report = {
      totalProducts: products.length,
      totalValue: products.reduce((sum, p) => sum + (p.price * p.stock.quantity), 0),
      totalUnits: products.reduce((sum, p) => sum + p.stock.quantity, 0),
      byCategory: {} as any,
      lowStock: products.filter(p => p.isLowStock()),
      outOfStock: products.filter(p => p.stock.quantity === 0),
      topValue: products
        .map(p => ({
          name: p.name,
          value: p.price * p.stock.quantity,
          quantity: p.stock.quantity
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
    };

    // Group by category
    products.forEach(product => {
      if (!report.byCategory[product.category]) {
        report.byCategory[product.category] = {
          products: 0,
          totalValue: 0,
          totalUnits: 0
        };
      }
      
      report.byCategory[product.category].products += 1;
      report.byCategory[product.category].totalValue += product.price * product.stock.quantity;
      report.byCategory[product.category].totalUnits += product.stock.quantity;
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Error generating inventory report' });
  }
});

// Bulk update stock
router.post('/products/bulk-stock-update', requireAuth, async (req: Request, res: Response) => {
  try {
    const { updates } = req.body; // Array of { productId, quantity }

    const results = await Promise.all(
      updates.map(async (update: any) => {
        try {
          const product = await Product.findByIdAndUpdate(
            update.productId,
            {
              'stock.quantity': update.quantity,
              'stock.inStock': update.quantity > 0
            },
            { new: true }
          );

          return { productId: update.productId, success: true, product };
        } catch (error) {
          return { productId: update.productId, success: false, error };
        }
      })
    );

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Error bulk updating stock' });
  }
});

export default router;