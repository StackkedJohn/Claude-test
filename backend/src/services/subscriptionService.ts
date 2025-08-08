import axios from 'axios';
import { User } from '../models/User';
import { Product } from '../models/Product';
import crypto from 'crypto';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingInterval: 'monthly' | 'quarterly' | 'annually';
  features: string[];
  products: Array<{
    productId: string;
    quantity: number;
    variant?: string;
  }>;
  isActive: boolean;
  maxSubscribers?: number;
  currentSubscribers: number;
}

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'paused' | 'cancelled' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  paymentMethodId: string;
  totalPaid: number;
  deliveryAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    deliveryInstructions?: string;
    skipNextDelivery?: boolean;
    nextSkipDate?: Date;
    customizations?: { [key: string]: any };
  };
  createdAt: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

interface SubscriptionDelivery {
  id: string;
  subscriptionId: string;
  deliveryDate: Date;
  status: 'scheduled' | 'processing' | 'shipped' | 'delivered' | 'failed' | 'skipped';
  trackingNumber?: string;
  shippingCarrier?: string;
  products: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  totalValue: number;
  isSkipped: boolean;
  skipReason?: string;
  deliveredAt?: Date;
  failureReason?: string;
}

interface AdventureKit {
  month: string;
  year: number;
  theme: string;
  products: Array<{
    id: string;
    name: string;
    description: string;
    quantity: number;
    isExclusive?: boolean;
  }>;
  bonusContent: {
    guide?: string;
    tips: string[];
    videoUrl?: string;
  };
  estimatedValue: number;
  actualPrice: number;
}

class SubscriptionService {
  private stripeSecretKey: string;
  private baseUrl: string;

  constructor() {
    this.stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
    this.baseUrl = process.env.FRONTEND_URL || 'https://icepaca.com';
  }

  // Create subscription plans
  async createSubscriptionPlan(planData: Omit<SubscriptionPlan, 'id' | 'currentSubscribers'>): Promise<string> {
    try {
      const planId = `plan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      const plan: SubscriptionPlan = {
        ...planData,
        id: planId,
        currentSubscribers: 0
      };

      // In production, save to database
      console.log('Created subscription plan:', plan);

      // Create Stripe product and price if Stripe is configured
      if (this.stripeSecretKey) {
        await this.createStripePrice(plan);
      }

      return planId;
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      throw error;
    }
  }

  // Initialize ICEPACA Adventure Kit plans
  async initializeAdventureKitPlans(): Promise<string[]> {
    const plans = [
      {
        name: 'Monthly Adventure Kit',
        description: 'Monthly delivery of curated ice packs and cooling accessories for your adventures',
        price: 29.99,
        billingInterval: 'monthly' as const,
        features: [
          'Premium ice packs each month',
          'Exclusive adventure accessories',
          'Monthly cooling tips guide',
          'Early access to new products',
          'Free shipping',
          'Skip or cancel anytime'
        ],
        products: [
          { productId: 'monthly-adventure-pack', quantity: 1 },
          { productId: 'surprise-accessory', quantity: 1 }
        ],
        isActive: true,
        maxSubscribers: 1000
      },
      {
        name: 'Quarterly Explorer Box',
        description: 'Seasonal collection of premium cooling gear for serious outdoor enthusiasts',
        price: 79.99,
        billingInterval: 'quarterly' as const,
        features: [
          '3-4 premium ice packs per box',
          'Seasonal adventure gear',
          'Exclusive ICEPACA merchandise',
          'Comprehensive adventure guide',
          'Member-only discounts (15%)',
          'Priority customer support',
          'Free shipping worldwide'
        ],
        products: [
          { productId: 'seasonal-explorer-pack', quantity: 1 },
          { productId: 'premium-accessories-bundle', quantity: 1 },
          { productId: 'exclusive-merchandise', quantity: 1 }
        ],
        isActive: true,
        maxSubscribers: 500
      },
      {
        name: 'Annual Adventure Collection',
        description: 'Complete year of premium cooling solutions with exclusive member benefits',
        price: 299.99,
        billingInterval: 'annually' as const,
        features: [
          'All adventure kits for the year',
          'Exclusive annual member perks',
          'Complimentary product upgrades',
          'VIP access to new releases',
          'Personal adventure consultant',
          '25% discount on additional purchases',
          'Lifetime warranty on subscription items',
          'Custom kit personalization'
        ],
        products: [
          { productId: 'annual-collection', quantity: 1 },
          { productId: 'vip-member-kit', quantity: 1 }
        ],
        isActive: true,
        maxSubscribers: 100
      }
    ];

    const planIds: string[] = [];
    for (const planData of plans) {
      const id = await this.createSubscriptionPlan(planData);
      planIds.push(id);
    }

    return planIds;
  }

  // Create subscription for user
  async createSubscription(
    userId: string,
    planId: string,
    paymentMethodId: string,
    deliveryAddress: Subscription['deliveryAddress']
  ): Promise<string> {
    try {
      const subscriptionId = `sub_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const now = new Date();
      const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const subscription: Subscription = {
        id: subscriptionId,
        userId,
        planId,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: nextBilling,
        nextBillingDate: nextBilling,
        paymentMethodId,
        totalPaid: 0,
        deliveryAddress,
        preferences: {},
        createdAt: now
      };

      // In production, save to database
      console.log('Created subscription:', subscription);

      // Create Stripe subscription if configured
      if (this.stripeSecretKey) {
        await this.createStripeSubscription(subscription);
      }

      // Schedule first delivery
      await this.scheduleNextDelivery(subscriptionId);

      // Send welcome email
      await this.sendWelcomeEmail(userId, planId);

      return subscriptionId;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Generate Adventure Kit contents for each month
  async generateAdventureKit(month: number, year: number): Promise<AdventureKit> {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const seasonalThemes = {
      'winter': ['New Year Fresh Start', 'Winter Sports Ready', 'Indoor Meal Prep'],
      'spring': ['Spring Cleaning Prep', 'Easter Family Gathering', 'Garden Party Ready'],
      'summer': ['Beach Day Essentials', 'Camping Adventure', 'Picnic Perfect'],
      'autumn': ['Back to School', 'Thanksgiving Prep', 'Holiday Party Ready']
    };

    const getSeason = (month: number): keyof typeof seasonalThemes => {
      if (month >= 12 || month <= 2) return 'winter';
      if (month >= 3 && month <= 5) return 'spring';
      if (month >= 6 && month <= 8) return 'summer';
      return 'autumn';
    };

    const season = getSeason(month);
    const theme = seasonalThemes[season][month % seasonalThemes[season].length];

    // Generate products based on season and theme
    const products = this.generateSeasonalProducts(season, theme);
    
    const kit: AdventureKit = {
      month: months[month - 1],
      year,
      theme,
      products,
      bonusContent: {
        guide: `${months[month - 1]} ${year} Adventure Guide - ${theme}`,
        tips: this.generateSeasonalTips(season, theme),
        videoUrl: `/adventure-guides/${year}/${month}/demo.mp4`
      },
      estimatedValue: products.reduce((sum, p) => sum + (p.quantity * this.getProductPrice(p.id)), 0),
      actualPrice: 29.99
    };

    return kit;
  }

  private generateSeasonalProducts(season: string, theme: string): AdventureKit['products'] {
    const baseProducts = [
      {
        id: 'featured-ice-pack',
        name: 'Featured Ice Pack of the Month',
        description: 'Our latest or most popular ice pack design',
        quantity: 1
      }
    ];

    const seasonalProducts: { [key: string]: Array<Omit<AdventureKit['products'][0], 'quantity'>> } = {
      winter: [
        {
          id: 'insulated-lunch-bag',
          name: 'Insulated Lunch Bag',
          description: 'Perfect for keeping meals warm or cold during winter',
          isExclusive: true
        },
        {
          id: 'thermal-bottle-holder',
          name: 'Thermal Bottle Holder',
          description: 'Keeps drinks at the perfect temperature'
        }
      ],
      spring: [
        {
          id: 'garden-party-cooler-insert',
          name: 'Garden Party Cooler Insert',
          description: 'Elegant cooling solution for outdoor entertaining',
          isExclusive: true
        },
        {
          id: 'picnic-blanket-cooler',
          name: 'Picnic Blanket with Built-in Cooling',
          description: 'Innovative blanket with cooling compartments'
        }
      ],
      summer: [
        {
          id: 'beach-cooler-pack',
          name: 'Beach Day Cooling Pack',
          description: 'Sand-resistant and extra-long cooling duration',
          isExclusive: true
        },
        {
          id: 'camping-cooking-cooler',
          name: 'Camping Cooking Cooler',
          description: 'Specialized for keeping ingredients fresh while camping'
        }
      ],
      autumn: [
        {
          id: 'school-lunch-kit',
          name: 'Back-to-School Lunch Kit',
          description: 'Complete cooling solution for school lunches',
          isExclusive: true
        },
        {
          id: 'holiday-entertaining-set',
          name: 'Holiday Entertaining Cooling Set',
          description: 'Multiple sizes for holiday food preparation'
        }
      ]
    };

    const seasonProducts = seasonalProducts[season] || [];
    const selectedProducts = seasonProducts.slice(0, 2).map(product => ({
      ...product,
      quantity: 1
    }));

    return [...baseProducts, ...selectedProducts];
  }

  private generateSeasonalTips(season: string, theme: string): string[] {
    const tips: { [key: string]: string[] } = {
      winter: [
        'Use ice packs to keep food from freezing in extremely cold conditions',
        'Layer ice packs in your cooler for extended cooling in cold weather',
        'Ice packs work great for keeping warm foods warm when wrapped properly'
      ],
      spring: [
        'Perfect time to deep clean your coolers and ice packs for the season',
        'Ice packs help keep flowers fresh during spring garden parties',
        'Use smaller ice packs for portion control during spring cleaning meal prep'
      ],
      summer: [
        'Pre-freeze ice packs overnight for maximum cooling power',
        'Use multiple smaller ice packs for better cold distribution',
        'Remember: ice packs won\'t melt and make your food soggy!'
      ],
      autumn: [
        'Ice packs keep school lunches fresh without the mess of melting ice',
        'Perfect for keeping holiday desserts at the right temperature',
        'Use in turkey coolers to maintain safe temperatures during transport'
      ]
    };

    return tips[season] || tips.summer;
  }

  private getProductPrice(productId: string): number {
    // Mock pricing - in production, fetch from product database
    const prices: { [key: string]: number } = {
      'featured-ice-pack': 15.99,
      'insulated-lunch-bag': 24.99,
      'thermal-bottle-holder': 12.99,
      'garden-party-cooler-insert': 19.99,
      'picnic-blanket-cooler': 34.99,
      'beach-cooler-pack': 18.99,
      'camping-cooking-cooler': 22.99,
      'school-lunch-kit': 16.99,
      'holiday-entertaining-set': 29.99
    };

    return prices[productId] || 15.99;
  }

  // Schedule delivery
  async scheduleNextDelivery(subscriptionId: string): Promise<string> {
    try {
      const deliveryId = `del_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date();
      const deliveryDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

      // Generate this month's adventure kit
      const currentKit = await this.generateAdventureKit(now.getMonth() + 1, now.getFullYear());

      const delivery: SubscriptionDelivery = {
        id: deliveryId,
        subscriptionId,
        deliveryDate,
        status: 'scheduled',
        products: currentKit.products.map(product => ({
          productId: product.id,
          productName: product.name,
          quantity: product.quantity,
          price: this.getProductPrice(product.id)
        })),
        totalValue: currentKit.estimatedValue,
        isSkipped: false
      };

      // In production, save to database
      console.log('Scheduled delivery:', delivery);

      // Send delivery notification email
      await this.sendDeliveryNotificationEmail(subscriptionId, delivery, currentKit);

      return deliveryId;
    } catch (error) {
      console.error('Error scheduling delivery:', error);
      throw error;
    }
  }

  // Pause subscription
  async pauseSubscription(subscriptionId: string, reason?: string): Promise<boolean> {
    try {
      // In production, update subscription in database
      console.log(`Paused subscription ${subscriptionId}: ${reason}`);

      // Pause Stripe subscription if configured
      if (this.stripeSecretKey) {
        await this.pauseStripeSubscription(subscriptionId);
      }

      return true;
    } catch (error) {
      console.error('Error pausing subscription:', error);
      return false;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, reason?: string, effectiveDate?: Date): Promise<boolean> {
    try {
      const cancelDate = effectiveDate || new Date();

      // In production, update subscription in database
      console.log(`Cancelled subscription ${subscriptionId}: ${reason}`);

      // Cancel Stripe subscription if configured
      if (this.stripeSecretKey) {
        await this.cancelStripeSubscription(subscriptionId);
      }

      // Send cancellation confirmation email
      await this.sendCancellationEmail(subscriptionId, reason);

      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }
  }

  // Skip next delivery
  async skipNextDelivery(subscriptionId: string, reason?: string): Promise<boolean> {
    try {
      // In production, update next delivery to skipped status
      console.log(`Skipped next delivery for subscription ${subscriptionId}: ${reason}`);

      // Send skip confirmation email
      await this.sendSkipConfirmationEmail(subscriptionId);

      return true;
    } catch (error) {
      console.error('Error skipping delivery:', error);
      return false;
    }
  }

  // Get subscription analytics
  async getSubscriptionAnalytics(): Promise<any> {
    try {
      // In production, fetch real analytics from database
      const mockAnalytics = {
        totalSubscribers: 1247,
        activeSubscriptions: 1098,
        monthlyRevenue: 37842.50,
        churnRate: 3.2,
        averageLifetimeValue: 187.50,
        popularPlans: [
          { name: 'Monthly Adventure Kit', subscribers: 856, percentage: 77.9 },
          { name: 'Quarterly Explorer Box', subscribers: 198, percentage: 18.0 },
          { name: 'Annual Adventure Collection', subscribers: 44, percentage: 4.0 }
        ],
        deliveryMetrics: {
          onTimeDeliveries: 96.8,
          customerSatisfaction: 4.7,
          averageDeliveryTime: 2.3
        },
        topSkipReasons: [
          'Out of town', 'Already have enough', 'Financial reasons', 'Product not needed this month'
        ]
      };

      return mockAnalytics;
    } catch (error) {
      console.error('Error fetching subscription analytics:', error);
      throw error;
    }
  }

  // Stripe integration methods
  private async createStripePrice(plan: SubscriptionPlan): Promise<string> {
    try {
      // Create Stripe product
      const productResponse = await axios.post(
        'https://api.stripe.com/v1/products',
        new URLSearchParams({
          name: plan.name,
          description: plan.description,
          type: 'service'
        }),
        {
          headers: {
            Authorization: `Bearer ${this.stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Create Stripe price
      const priceResponse = await axios.post(
        'https://api.stripe.com/v1/prices',
        new URLSearchParams({
          unit_amount: (plan.price * 100).toString(),
          currency: 'usd',
          recurring: `interval=${plan.billingInterval}`,
          product: productResponse.data.id
        }),
        {
          headers: {
            Authorization: `Bearer ${this.stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return priceResponse.data.id;
    } catch (error) {
      console.error('Error creating Stripe price:', error);
      throw error;
    }
  }

  private async createStripeSubscription(subscription: Subscription): Promise<void> {
    // Mock Stripe subscription creation
    console.log('Created Stripe subscription for:', subscription.id);
  }

  private async pauseStripeSubscription(subscriptionId: string): Promise<void> {
    // Mock Stripe subscription pause
    console.log('Paused Stripe subscription:', subscriptionId);
  }

  private async cancelStripeSubscription(subscriptionId: string): Promise<void> {
    // Mock Stripe subscription cancellation
    console.log('Cancelled Stripe subscription:', subscriptionId);
  }

  // Email notification methods
  private async sendWelcomeEmail(userId: string, planId: string): Promise<void> {
    console.log(`Welcome email sent to user ${userId} for plan ${planId}`);
  }

  private async sendDeliveryNotificationEmail(
    subscriptionId: string,
    delivery: SubscriptionDelivery,
    kit: AdventureKit
  ): Promise<void> {
    console.log(`Delivery notification sent for subscription ${subscriptionId}`);
  }

  private async sendCancellationEmail(subscriptionId: string, reason?: string): Promise<void> {
    console.log(`Cancellation confirmation sent for subscription ${subscriptionId}`);
  }

  private async sendSkipConfirmationEmail(subscriptionId: string): Promise<void> {
    console.log(`Skip confirmation sent for subscription ${subscriptionId}`);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Test Stripe connection if configured
      if (this.stripeSecretKey) {
        await axios.get('https://api.stripe.com/v1/products?limit=1', {
          headers: {
            Authorization: `Bearer ${this.stripeSecretKey}`
          }
        });
      }
      return true;
    } catch (error) {
      console.error('Subscription service health check failed:', error);
      return false;
    }
  }
}

export default new SubscriptionService();