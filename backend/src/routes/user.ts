// User profile and dashboard routes
import express, { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { authenticateToken, requireOwnership } from '../middleware/auth';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId).select('-password -twoFactorSecret -backupCodes');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { firstName, lastName, phone, dateOfBirth, preferences } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update profile fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);

    // Update preferences
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    const updatedUser = await User.findById(userId).select('-password -twoFactorSecret -backupCodes');

    res.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Get user dashboard data
router.get('/dashboard', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    // Get user info
    const user = await User.findById(userId).select('-password -twoFactorSecret -backupCodes');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get recent orders (last 5)
    const recentOrders = await Order.find({ 'customer.email': user.email })
      .sort({ orderDate: -1 })
      .limit(5)
      .populate('items.productId', 'name images');

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { 'customer.email': user.email, status: { $nin: ['cancelled', 'failed'] } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totals.total' },
          averageOrderValue: { $avg: '$totals.total' }
        }
      }
    ]);

    // Get wishlist with product details
    const wishlist = await User.findById(userId)
      .populate({
        path: 'wishlist.productId',
        select: 'name price images rating reviewCount inStock'
      })
      .select('wishlist');

    // Get user's reviews
    const reviews = await Review.find({ userId })
      .populate('productId', 'name images')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get review statistics
    const reviewStats = await Review.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          helpfulVotes: { $sum: '$helpfulVotes' }
        }
      }
    ]);

    const dashboardData = {
      user: {
        ...user.toJSON(),
        fullName: user.getFullName(),
        wishlistCount: user.wishlist.length
      },
      orders: {
        recent: recentOrders,
        stats: orderStats[0] || { totalOrders: 0, totalSpent: 0, averageOrderValue: 0 }
      },
      wishlist: wishlist?.wishlist || [],
      reviews: {
        recent: reviews,
        stats: reviewStats[0] || { totalReviews: 0, averageRating: 0, helpfulVotes: 0 }
      }
    };

    res.json({
      success: true,
      dashboard: dashboardData
    });

  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get user's order history
router.get('/orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ 'customer.email': user.email })
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('items.productId', 'name images');

    const totalOrders = await Order.countDocuments({ 'customer.email': user.email });

    res.json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        hasNext: page * limit < totalOrders,
        hasPrev: page > 1
      }
    });

  } catch (error: any) {
    console.error('Orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// Get specific order details
router.get('/orders/:orderNumber', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.user?.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const order = await Order.findOne({ 
      orderNumber,
      'customer.email': user.email 
    }).populate('items.productId', 'name images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error: any) {
    console.error('Order details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details'
    });
  }
});

// Manage user addresses
router.get('/addresses', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId).select('addresses');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      addresses: user.addresses
    });

  } catch (error: any) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch addresses'
    });
  }
});

// Add new address
router.post('/addresses', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const addressData = req.body;

    // Validation
    const requiredFields = ['label', 'firstName', 'lastName', 'address1', 'city', 'state', 'zipCode'];
    for (const field of requiredFields) {
      if (!addressData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate unique ID for address
    const addressId = require('crypto').randomUUID();
    const newAddress = {
      id: addressId,
      ...addressData,
      country: addressData.country || 'US',
      isDefault: addressData.isDefault || user.addresses.length === 0,
      createdAt: new Date()
    };

    // If this is set as default, unmark others
    if (newAddress.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push(newAddress);
    await user.save();

    res.json({
      success: true,
      address: newAddress,
      message: 'Address added successfully'
    });

  } catch (error: any) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add address'
    });
  }
});

// Update address
router.put('/addresses/:addressId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { addressId } = req.params;
    const updates = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const addressIndex = user.addresses.findIndex(addr => addr.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // If setting as default, unmark others
    if (updates.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    // Update address
    Object.assign(user.addresses[addressIndex], updates);
    await user.save();

    res.json({
      success: true,
      address: user.addresses[addressIndex],
      message: 'Address updated successfully'
    });

  } catch (error: any) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address'
    });
  }
});

// Delete address
router.delete('/addresses/:addressId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { addressId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const addressIndex = user.addresses.findIndex(addr => addr.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    // If deleted address was default, make first remaining address default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address'
    });
  }
});

// Wishlist management
router.get('/wishlist', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    const user = await User.findById(userId)
      .populate({
        path: 'wishlist.productId',
        select: 'name price images rating reviewCount inStock description'
      })
      .select('wishlist');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      wishlist: user.wishlist
    });

  } catch (error: any) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist'
    });
  }
});

// Add to wishlist
router.post('/wishlist', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { productId, notes } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.addToWishlist(productId, notes);

    res.json({
      success: true,
      message: 'Product added to wishlist'
    });

  } catch (error: any) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist'
    });
  }
});

// Remove from wishlist
router.delete('/wishlist/:productId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { productId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.removeFromWishlist(productId);

    res.json({
      success: true,
      message: 'Product removed from wishlist'
    });

  } catch (error: any) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist'
    });
  }
});

export default router;