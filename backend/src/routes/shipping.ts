// Shipping API routes with real-time rates, address validation, and tracking
import { Router } from 'express';
import shippingService, { ShippingAddress, ShippingItem } from '../services/shippingService';
import inventoryService from '../services/inventoryService';
import notificationService from '../services/notificationService';
import { Product } from '../models/Product';
import { Order } from '../models/Order';

const router = Router();

// Validate shipping address
router.post('/validate-address', async (req, res) => {
  try {
    const address: ShippingAddress = req.body;

    if (!address.address1 || !address.city || !address.state || !address.zipCode) {
      return res.status(400).json({
        error: 'Missing required address fields',
        required: ['address1', 'city', 'state', 'zipCode']
      });
    }

    const validation = await shippingService.validateAddress(address);

    res.json({
      validation,
      address: address
    });

  } catch (error: any) {
    console.error('Address validation error:', error);
    res.status(500).json({
      error: 'Address validation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get shipping rates with inventory sync
router.post('/rates', async (req, res) => {
  try {
    const { fromAddress, toAddress, items } = req.body;

    if (!toAddress || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: toAddress, items'
      });
    }

    // Validate inventory availability first
    const inventoryCheck = await inventoryService.validateCartInventory(
      items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity
      }))
    );

    if (!inventoryCheck.valid) {
      return res.status(400).json({
        error: 'Inventory validation failed',
        issues: inventoryCheck.issues,
        message: 'Some items are not available in requested quantities'
      });
    }

    // Get product details for accurate shipping calculation
    const shippingItems: ShippingItem[] = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          error: `Product ${item.productId} not found`
        });
      }

      // Check if product has accurate weight/dimensions
      if (!product.weight?.value || !product.dimensions) {
        return res.status(400).json({
          error: `Product ${product.name} missing shipping dimensions or weight`
        });
      }

      shippingItems.push({
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        weight: product.weight.value, // in lbs
        dimensions: {
          length: product.dimensions.width, // assuming width/height are swappable for shipping
          width: product.dimensions.height,
          height: product.dimensions.depth || 2 // default depth for ice packs
        },
        value: product.price,
        hsCode: product.specifications?.hsCode || '3926909990', // Default for plastic products
        originCountry: 'US'
      });
    }

    // Default from address (warehouse)
    const defaultFromAddress: ShippingAddress = {
      firstName: 'ICEPACA',
      lastName: 'Warehouse',
      company: 'ICEPACA Inc.',
      address1: process.env.WAREHOUSE_ADDRESS1 || '123 Cool Street',
      address2: process.env.WAREHOUSE_ADDRESS2 || '',
      city: process.env.WAREHOUSE_CITY || 'San Francisco',
      state: process.env.WAREHOUSE_STATE || 'CA',
      zipCode: process.env.WAREHOUSE_ZIP || '94102',
      country: 'US',
      phone: process.env.WAREHOUSE_PHONE || '+1 555 123 4567',
      email: process.env.WAREHOUSE_EMAIL || 'shipping@icepaca.com'
    };

    const quote = await shippingService.getShippingRates(
      fromAddress || defaultFromAddress,
      toAddress,
      shippingItems
    );

    // Add free shipping threshold logic
    const freeShippingThreshold = parseFloat(process.env.FREE_SHIPPING_THRESHOLD || '50');
    const orderSubtotal = shippingItems.reduce((sum, item) => sum + (item.value * item.quantity), 0);
    const qualifiesForFreeShipping = orderSubtotal >= freeShippingThreshold;

    // Apply free shipping to ground methods if threshold is met
    if (qualifiesForFreeShipping) {
      quote.rates = quote.rates.map(rate => {
        if (rate.serviceName.toLowerCase().includes('ground') || 
            rate.serviceName.toLowerCase().includes('advantage')) {
          return {
            ...rate,
            cost: 0,
            displayName: `${rate.displayName} (FREE!)`,
            features: [...rate.features, 'Free Shipping']
          };
        }
        return rate;
      });
    }

    // Add free shipping progress info
    const freeShippingProgress = {
      threshold: freeShippingThreshold,
      current: orderSubtotal,
      remaining: Math.max(0, freeShippingThreshold - orderSubtotal),
      qualified: qualifiesForFreeShipping,
      progress: Math.min(100, (orderSubtotal / freeShippingThreshold) * 100)
    };

    res.json({
      quote,
      inventory: {
        allAvailable: inventoryCheck.valid,
        issues: inventoryCheck.issues
      },
      freeShipping: freeShippingProgress
    });

  } catch (error: any) {
    console.error('Shipping rates error:', error);
    res.status(500).json({
      error: 'Failed to get shipping rates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Calculate shipping for specific products (for product pages)
router.post('/calculate', async (req, res) => {
  try {
    const { productId, quantity = 1, toZipCode, toState = 'CA', toCountry = 'US' } = req.body;

    if (!productId || !toZipCode) {
      return res.status(400).json({
        error: 'Missing required fields: productId, toZipCode'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Create simplified destination address
    const toAddress: ShippingAddress = {
      firstName: 'Customer',
      lastName: 'Estimate',
      address1: '123 Main St',
      city: 'City',
      state: toState,
      zipCode: toZipCode,
      country: toCountry
    };

    const shippingItems: ShippingItem[] = [{
      productId: product._id.toString(),
      name: product.name,
      quantity,
      weight: product.weight?.value || 1,
      dimensions: {
        length: product.dimensions.width,
        width: product.dimensions.height,
        height: product.dimensions.depth || 2
      },
      value: product.price,
      originCountry: 'US'
    }];

    const quote = await shippingService.getShippingRates(
      undefined as any, // Will use default warehouse address
      toAddress,
      shippingItems
    );

    // Simplified response for product page
    const estimates = quote.rates.map(rate => ({
      provider: rate.provider,
      service: rate.displayName,
      cost: rate.cost,
      days: rate.estimatedDays,
      ecoFriendly: rate.carbonFootprint?.ecoFriendly || false,
      co2Grams: rate.carbonFootprint?.co2Grams || 0
    }));

    res.json({
      estimates: estimates.slice(0, 3), // Limit to top 3 options
      totalWeight: quote.totalWeight,
      international: quote.international
    });

  } catch (error: any) {
    console.error('Shipping calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate shipping',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get tracking information
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { carrier = 'USPS' } = req.query;

    const trackingInfo = await shippingService.getTrackingInfo(
      trackingNumber, 
      carrier as string
    );

    if (!trackingInfo) {
      return res.status(404).json({
        error: 'Tracking information not found',
        trackingNumber,
        carrier
      });
    }

    res.json({
      tracking: trackingInfo,
      trackingNumber,
      carrier
    });

  } catch (error: any) {
    console.error('Tracking error:', error);
    res.status(500).json({
      error: 'Failed to get tracking information',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create shipping label (for admin/fulfillment)
router.post('/create-label', async (req, res) => {
  try {
    const { orderId, rateId } = req.body;

    if (!orderId || !rateId) {
      return res.status(400).json({
        error: 'Missing required fields: orderId, rateId'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // In production, this would create actual shipping labels
    // For now, simulate the process
    const trackingNumber = `1Z999AA${Date.now().toString().slice(-10)}`;
    
    // Update order with tracking info
    order.trackingNumber = trackingNumber;
    order.status = 'shipped';
    order.shippedDate = new Date();
    await order.save();

    // Send shipment notification
    const mockShippingRate = {
      displayName: 'USPS Priority Mail',
      carbonFootprint: { co2Grams: 150, offsetCost: 0.30 }
    };

    const mockTrackingInfo = {
      trackingNumber,
      carrier: 'USPS',
      status: 'SHIPPED',
      lastUpdate: new Date().toISOString(),
      events: []
    };

    await notificationService.sendShipmentNotification(
      order,
      mockTrackingInfo as any,
      mockShippingRate,
      {
        email: true,
        sms: false,
        emailAddress: order.customer.email,
        trackingUpdates: true,
        deliveryReminders: true,
        promotionalEmails: false
      }
    );

    res.json({
      success: true,
      trackingNumber,
      labelUrl: `${process.env.API_URL}/shipping/label/${trackingNumber}`, // Mock URL
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status
      }
    });

  } catch (error: any) {
    console.error('Label creation error:', error);
    res.status(500).json({
      error: 'Failed to create shipping label',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get shipping zones and rates (for admin configuration)
router.get('/zones', async (req, res) => {
  try {
    const zones = [
      {
        id: 'zone_1',
        name: 'Local (Same State)',
        description: 'California deliveries',
        states: ['CA'],
        baseRate: 5.99,
        freeShippingThreshold: 35
      },
      {
        id: 'zone_2', 
        name: 'Regional (West Coast)',
        description: 'Western US states',
        states: ['WA', 'OR', 'NV', 'AZ'],
        baseRate: 8.99,
        freeShippingThreshold: 50
      },
      {
        id: 'zone_3',
        name: 'National (Continental US)',
        description: 'All other continental US states',
        states: ['*'], // All other states
        baseRate: 12.99,
        freeShippingThreshold: 75
      },
      {
        id: 'zone_4',
        name: 'International',
        description: 'International destinations',
        countries: ['CA', 'MX', 'UK', 'AU'],
        baseRate: 25.99,
        freeShippingThreshold: 150,
        customsRequired: true
      }
    ];

    res.json({
      zones,
      defaultFreeShippingThreshold: parseFloat(process.env.FREE_SHIPPING_THRESHOLD || '50')
    });

  } catch (error: any) {
    console.error('Shipping zones error:', error);
    res.status(500).json({
      error: 'Failed to get shipping zones',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Handle backorder notifications
router.post('/backorder-notify', async (req, res) => {
  try {
    const { productId, customerEmail, estimatedRestockDate } = req.body;

    if (!productId || !customerEmail) {
      return res.status(400).json({
        error: 'Missing required fields: productId, customerEmail'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // In production, you would store this subscription and send notifications
    // when the product comes back in stock
    
    const mockNotification = {
      id: `backorder_${Date.now()}`,
      productId,
      productName: product.name,
      customerEmail,
      estimatedRestock: estimatedRestockDate || 'Within 2-3 weeks',
      notificationSent: false,
      createdAt: new Date()
    };

    res.json({
      success: true,
      subscription: mockNotification,
      message: `We'll notify ${customerEmail} when ${product.name} is back in stock`
    });

  } catch (error: any) {
    console.error('Backorder notification error:', error);
    res.status(500).json({
      error: 'Failed to set up backorder notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;