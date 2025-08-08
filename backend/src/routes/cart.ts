import express, { Request, Response } from 'express';
import Cart, { ICart } from '../models/Cart';
import Product from '../models/Product';
import inventoryService from '../services/inventoryService';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get cart by session ID with real-time inventory sync
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    // Sync cart with real-time inventory
    const inventorySync = await inventoryService.syncCartInventory(sessionId);
    
    const cart = await Cart.findOne({ sessionId })
      .populate('items.productId');

    if (!cart) {
      return res.json({ items: [], totalItems: 0, totalPrice: 0 });
    }

    // Include inventory sync info in response
    const response = {
      ...cart.toObject(),
      inventorySync: inventorySync.updated ? {
        updated: true,
        changes: inventorySync.changes,
        removedItems: inventorySync.removedItems
      } : undefined
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching cart' });
  }
});

// Add item to cart with real-time inventory validation
router.post('/:sessionId/add', async (req: Request, res: Response) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const { sessionId } = req.params;

    // Validate inventory availability
    const inventoryValidation = await inventoryService.validateCartInventory([
      { productId, quantity }
    ]);

    if (!inventoryValidation.valid) {
      const issue = inventoryValidation.issues[0];
      return res.status(400).json({ 
        error: 'Insufficient stock',
        available: issue.available,
        requested: issue.requested,
        maxAllowed: issue.maxAllowed
      });
    }

    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find or create cart
    let cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = new Cart({ 
        sessionId,
        items: [],
        totalItems: 0,
        totalPrice: 0
      });
    }

    // Add item to cart
    cart.addItem(product._id, quantity, product.price);
    await cart.save();

    // Reserve stock
    product.reserveStock(quantity);
    await product.save();

    // Populate product details for response
    await cart.populate('items.productId');

    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'Error adding item to cart' });
  }
});

// Update item quantity in cart
router.put('/:sessionId/update', async (req: Request, res: Response) => {
  try {
    const { productId, quantity } = req.body;
    const { sessionId } = req.params;

    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Find current item quantity
    const currentItem = cart.items.find(item => 
      item.productId.toString() === productId
    );

    if (!currentItem) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    const quantityDiff = quantity - currentItem.quantity;

    // Check stock if increasing quantity
    if (quantityDiff > 0) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const availableStock = product.stock.quantity - product.stock.reserved;
      if (availableStock < quantityDiff) {
        return res.status(400).json({ 
          error: 'Insufficient stock',
          available: availableStock + currentItem.quantity
        });
      }

      // Reserve additional stock
      product.reserveStock(quantityDiff);
      await product.save();
    } else if (quantityDiff < 0) {
      // Release stock if decreasing quantity
      const product = await Product.findById(productId);
      if (product) {
        product.releaseStock(Math.abs(quantityDiff));
        await product.save();
      }
    }

    // Update cart
    cart.updateItemQuantity(productId, quantity);
    await cart.save();

    await cart.populate('items.productId');
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'Error updating cart item' });
  }
});

// Remove item from cart
router.delete('/:sessionId/remove/:productId', async (req: Request, res: Response) => {
  try {
    const { sessionId, productId } = req.params;

    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Find item to get quantity for stock release
    const item = cart.items.find(item => 
      item.productId.toString() === productId
    );

    if (item) {
      // Release reserved stock
      const product = await Product.findById(productId);
      if (product) {
        product.releaseStock(item.quantity);
        await product.save();
      }
    }

    // Remove item from cart
    cart.removeItem(productId);
    await cart.save();

    await cart.populate('items.productId');
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'Error removing item from cart' });
  }
});

// Clear entire cart
router.delete('/:sessionId/clear', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      return res.json({ message: 'Cart already empty' });
    }

    // Release all reserved stock
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.releaseStock(item.quantity);
        await product.save();
      }
    }

    // Clear cart
    cart.clearCart();
    await cart.save();

    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error clearing cart' });
  }
});

// Get cart recommendations based on current items
router.get('/:sessionId/recommendations', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const cart = await Cart.findOne({ sessionId })
      .populate('items.productId');

    if (!cart || cart.items.length === 0) {
      // Return general recommendations for empty cart
      const recommendations = await Product.find({
        isActive: true,
        'bundle.isBundle': true
      }).limit(3);

      return res.json({ 
        type: 'general',
        products: recommendations,
        message: 'Popular bundles for new customers'
      });
    }

    // Get categories and tags from cart items
    const cartProductIds = cart.items.map(item => item.productId);
    const cartCategories = [...new Set(cart.items.map(item => (item.productId as any).category))];
    const cartTags = [...new Set(cart.items.flatMap(item => (item.productId as any).tags))];

    // Find complementary products
    const complementaryProducts = await Product.find({
      _id: { $nin: cartProductIds },
      isActive: true,
      $or: [
        { category: { $in: cartCategories } },
        { tags: { $in: cartTags } },
        { 'recommendations.bundlesWith': { $in: cartProductIds } }
      ]
    }).limit(4);

    // Generate personalized message based on cart contents
    let message = 'Customers who bought these items also liked:';
    
    if (cart.items.some(item => (item.productId as any).tags.includes('small'))) {
      message = 'Pair with cooler for camping - Complete your cooling setup:';
    } else if (cart.items.some(item => (item.productId as any).tags.includes('marine'))) {
      message = 'Perfect for marine adventures - You might also need:';
    }

    res.json({
      type: 'personalized',
      products: complementaryProducts,
      message,
      based_on: cartCategories
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching cart recommendations' });
  }
});

// Apply discount code
router.post('/:sessionId/discount', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { discountCode } = req.body;

    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Simple discount logic (can be expanded with a discount codes collection)
    const discounts: { [key: string]: number } = {
      'WELCOME10': 10,
      'SAVE15': 15,
      'FIRST20': 20,
      'BUNDLE25': 25
    };

    const discountAmount = discounts[discountCode.toUpperCase()];
    
    if (!discountAmount) {
      return res.status(400).json({ error: 'Invalid discount code' });
    }

    cart.discountCode = discountCode.toUpperCase();
    cart.discountAmount = discountAmount;
    cart.calculateTotals();
    
    await cart.save();

    res.json({
      message: `Discount of $${discountAmount} applied!`,
      cart
    });
  } catch (error) {
    res.status(500).json({ error: 'Error applying discount' });
  }
});

// Real-time stock check for cart items
router.get('/:sessionId/stock-check', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const cart = await Cart.findOne({ sessionId });
    if (!cart || cart.items.length === 0) {
      return res.json({ allInStock: true, stockLevels: [] });
    }

    const productIds = cart.items.map(item => item.productId.toString());
    const stockLevels = await inventoryService.getRealTimeStock(productIds);
    
    // Check if all cart items are still available
    const allInStock = cart.items.every(cartItem => {
      const stock = stockLevels.find(s => s.productId === cartItem.productId.toString());
      return stock && stock.availableStock >= cartItem.quantity;
    });

    // Identify items with insufficient stock
    const insufficientStock = cart.items
      .map(cartItem => {
        const stock = stockLevels.find(s => s.productId === cartItem.productId.toString());
        if (!stock || stock.availableStock < cartItem.quantity) {
          return {
            productId: cartItem.productId,
            requested: cartItem.quantity,
            available: stock?.availableStock || 0,
            shortfall: cartItem.quantity - (stock?.availableStock || 0)
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json({
      allInStock,
      stockLevels: stockLevels.map(stock => ({
        ...stock,
        cartQuantity: cart.items.find(item => item.productId.toString() === stock.productId)?.quantity || 0
      })),
      insufficientStock
    });

  } catch (error) {
    console.error('Error checking stock:', error);
    res.status(500).json({ error: 'Error checking stock levels' });
  }
});

// Reserve inventory for checkout
router.post('/:sessionId/reserve', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const cart = await Cart.findOne({ sessionId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const cartItems = cart.items.map(item => ({
      productId: item.productId.toString(),
      quantity: item.quantity
    }));

    const reservationResult = await inventoryService.reserveInventory(cartItems, sessionId);
    
    if (!reservationResult.success) {
      return res.status(400).json({
        error: 'Failed to reserve inventory',
        details: reservationResult.errors,
        reservedItems: reservationResult.reservedItems
      });
    }

    res.json({
      success: true,
      message: 'Inventory reserved successfully',
      reservedItems: reservationResult.reservedItems,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

  } catch (error) {
    console.error('Error reserving inventory:', error);
    res.status(500).json({ error: 'Error reserving inventory' });
  }
});

// Release reserved inventory
router.delete('/:sessionId/release', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    await inventoryService.releaseReservedInventory(sessionId);
    
    res.json({
      success: true,
      message: 'Reserved inventory released successfully'
    });

  } catch (error) {
    console.error('Error releasing inventory:', error);
    res.status(500).json({ error: 'Error releasing inventory' });
  }
});

export default router;