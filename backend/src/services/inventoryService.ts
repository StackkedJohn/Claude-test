// Real-time inventory management service
import { Product } from '../models/Product';
import { Cart } from '../models/Cart';

export interface InventoryCheck {
  productId: string;
  requested: number;
  available: number;
  canFulfill: boolean;
  maxAllowed: number;
}

export interface InventoryValidation {
  valid: boolean;
  issues: InventoryCheck[];
  totalAvailable: boolean;
  message?: string;
}

class InventoryService {
  
  // Check if requested quantities are available
  async validateCartInventory(cartItems: Array<{
    productId: string;
    quantity: number;
  }>): Promise<InventoryValidation> {
    const issues: InventoryCheck[] = [];
    let totalAvailable = true;

    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        issues.push({
          productId: item.productId,
          requested: item.quantity,
          available: 0,
          canFulfill: false,
          maxAllowed: 0
        });
        totalAvailable = false;
        continue;
      }

      const availableStock = product.stock.quantity - product.stock.reserved;
      const canFulfill = availableStock >= item.quantity;
      
      if (!canFulfill) {
        issues.push({
          productId: item.productId,
          requested: item.quantity,
          available: availableStock,
          canFulfill: false,
          maxAllowed: Math.max(0, availableStock)
        });
        totalAvailable = false;
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      totalAvailable,
      message: totalAvailable 
        ? 'All items are available' 
        : `${issues.length} item(s) have insufficient stock`
    };
  }

  // Reserve inventory for cart items
  async reserveInventory(cartItems: Array<{
    productId: string;
    quantity: number;
  }>, sessionId: string): Promise<{
    success: boolean;
    reservedItems: string[];
    errors: string[];
  }> {
    const reservedItems: string[] = [];
    const errors: string[] = [];

    // First validate all items
    const validation = await this.validateCartInventory(cartItems);
    if (!validation.valid) {
      return {
        success: false,
        reservedItems: [],
        errors: validation.issues.map(issue => 
          `Product ${issue.productId}: Only ${issue.available} available, requested ${issue.requested}`
        )
      };
    }

    // Reserve each item
    for (const item of cartItems) {
      try {
        const product = await Product.findById(item.productId);
        if (!product) {
          errors.push(`Product ${item.productId} not found`);
          continue;
        }

        // Use atomic operation to prevent race conditions
        const result = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            'stock.quantity': { $gte: product.stock.reserved + item.quantity }
          },
          {
            $inc: { 'stock.reserved': item.quantity },
            $push: {
              'stock.reservations': {
                sessionId,
                quantity: item.quantity,
                reservedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
              }
            }
          },
          { new: true }
        );

        if (!result) {
          errors.push(`Failed to reserve ${item.quantity} of product ${item.productId} - insufficient stock`);
        } else {
          reservedItems.push(item.productId);
        }

      } catch (error) {
        console.error(`Error reserving inventory for ${item.productId}:`, error);
        errors.push(`Error reserving product ${item.productId}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      reservedItems,
      errors
    };
  }

  // Release reserved inventory
  async releaseReservedInventory(sessionId: string): Promise<void> {
    try {
      // Find all products with reservations for this session
      const productsWithReservations = await Product.find({
        'stock.reservations.sessionId': sessionId
      });

      for (const product of productsWithReservations) {
        const sessionReservations = product.stock.reservations.filter(
          (res: any) => res.sessionId === sessionId
        );

        const totalReserved = sessionReservations.reduce(
          (sum: number, res: any) => sum + res.quantity, 0
        );

        // Remove reservations and update reserved count
        await Product.findByIdAndUpdate(product._id, {
          $inc: { 'stock.reserved': -totalReserved },
          $pull: { 'stock.reservations': { sessionId } }
        });
      }

    } catch (error) {
      console.error('Error releasing reserved inventory:', error);
    }
  }

  // Clean up expired reservations
  async cleanupExpiredReservations(): Promise<{
    cleanedCount: number;
    releasedStock: number;
  }> {
    let cleanedCount = 0;
    let releasedStock = 0;

    try {
      const now = new Date();
      
      // Find all products with expired reservations
      const productsWithExpiredReservations = await Product.find({
        'stock.reservations.expiresAt': { $lt: now }
      });

      for (const product of productsWithExpiredReservations) {
        const expiredReservations = product.stock.reservations.filter(
          (res: any) => res.expiresAt < now
        );

        if (expiredReservations.length > 0) {
          const totalExpired = expiredReservations.reduce(
            (sum: number, res: any) => sum + res.quantity, 0
          );

          await Product.findByIdAndUpdate(product._id, {
            $inc: { 'stock.reserved': -totalExpired },
            $pull: { 'stock.reservations': { expiresAt: { $lt: now } } }
          });

          cleanedCount += expiredReservations.length;
          releasedStock += totalExpired;
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired reservations, released ${releasedStock} stock units`);

    } catch (error) {
      console.error('Error cleaning up expired reservations:', error);
    }

    return { cleanedCount, releasedStock };
  }

  // Get real-time stock levels
  async getRealTimeStock(productIds: string[]): Promise<Array<{
    productId: string;
    totalStock: number;
    reservedStock: number;
    availableStock: number;
    inStock: boolean;
  }>> {
    const stockLevels = [];

    for (const productId of productIds) {
      try {
        const product = await Product.findById(productId);
        
        if (product) {
          const availableStock = product.stock.quantity - product.stock.reserved;
          stockLevels.push({
            productId,
            totalStock: product.stock.quantity,
            reservedStock: product.stock.reserved,
            availableStock,
            inStock: availableStock > 0
          });
        } else {
          stockLevels.push({
            productId,
            totalStock: 0,
            reservedStock: 0,
            availableStock: 0,
            inStock: false
          });
        }
      } catch (error) {
        console.error(`Error getting stock for ${productId}:`, error);
        stockLevels.push({
          productId,
          totalStock: 0,
          reservedStock: 0,
          availableStock: 0,
          inStock: false
        });
      }
    }

    return stockLevels;
  }

  // Sync cart with real-time inventory
  async syncCartInventory(sessionId: string): Promise<{
    updated: boolean;
    changes: Array<{
      productId: string;
      productName: string;
      oldQuantity: number;
      newQuantity: number;
      reason: 'insufficient_stock' | 'out_of_stock';
    }>;
    removedItems: string[];
  }> {
    const changes: Array<{
      productId: string;
      productName: string;
      oldQuantity: number;
      newQuantity: number;
      reason: 'insufficient_stock' | 'out_of_stock';
    }> = [];
    const removedItems: string[] = [];
    let updated = false;

    try {
      const cart = await Cart.findOne({ sessionId }).populate('items.productId');
      
      if (!cart) {
        return { updated: false, changes: [], removedItems: [] };
      }

      const updatedItems = [];

      for (const item of cart.items) {
        const product = item.productId as any;
        const availableStock = product.stock.quantity - product.stock.reserved;

        if (availableStock <= 0) {
          // Remove item entirely
          changes.push({
            productId: product._id.toString(),
            productName: product.name,
            oldQuantity: item.quantity,
            newQuantity: 0,
            reason: 'out_of_stock'
          });
          removedItems.push(product._id.toString());
          updated = true;
        } else if (availableStock < item.quantity) {
          // Reduce quantity to available stock
          changes.push({
            productId: product._id.toString(),
            productName: product.name,
            oldQuantity: item.quantity,
            newQuantity: availableStock,
            reason: 'insufficient_stock'
          });
          updatedItems.push({
            ...item.toObject(),
            quantity: availableStock
          });
          updated = true;
        } else {
          // Keep item as is
          updatedItems.push(item.toObject());
        }
      }

      if (updated) {
        // Update cart with new quantities
        await Cart.findOneAndUpdate(
          { sessionId },
          { 
            items: updatedItems,
            updatedAt: new Date()
          }
        );
      }

    } catch (error) {
      console.error('Error syncing cart inventory:', error);
    }

    return { updated, changes, removedItems };
  }

  // Start periodic cleanup of expired reservations
  startPeriodicCleanup(intervalMinutes: number = 15): void {
    setInterval(async () => {
      await this.cleanupExpiredReservations();
    }, intervalMinutes * 60 * 1000);

    console.log(`Started periodic inventory cleanup every ${intervalMinutes} minutes`);
  }
}

export default new InventoryService();