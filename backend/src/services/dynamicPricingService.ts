import { Product, IProduct } from '../models/Product';
import { Order } from '../models/Order';

interface PricingRule {
  id: string;
  name: string;
  type: 'seasonal' | 'demand' | 'inventory' | 'competitor' | 'user_segment' | 'time_based';
  priority: number;
  active: boolean;
  conditions: PricingCondition[];
  adjustment: PricingAdjustment;
  validFrom: Date;
  validTo?: Date;
  maxDiscount?: number;
  minPrice?: number;
  applicableProducts?: string[];
}

interface PricingCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'in' | 'between';
  value: any;
}

interface PricingAdjustment {
  type: 'percentage' | 'fixed' | 'multiplier';
  value: number;
  reason: string;
}

interface MarketData {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  temperature: number;
  weatherForecast: string[];
  holidaysApproaching: string[];
  competitorPrices: { [productId: string]: number };
}

interface DemandMetrics {
  productId: string;
  views: number;
  cartAdds: number;
  purchases: number;
  inventoryLevel: number;
  demandScore: number;
  trending: boolean;
}

interface UserSegment {
  segment: 'new' | 'returning' | 'vip' | 'student' | 'military' | 'bulk_buyer';
  discountEligible: boolean;
  maxDiscount: number;
  loyaltyPoints?: number;
}

class DynamicPricingService {
  private pricingRules: PricingRule[] = [];
  private marketDataCache: MarketData | null = null;
  private lastMarketUpdate: Date = new Date(0);

  constructor() {
    this.initializeDefaultRules();
  }

  // Initialize default pricing rules
  private initializeDefaultRules(): void {
    this.pricingRules = [
      // Seasonal pricing
      {
        id: 'summer-peak',
        name: 'Summer Peak Season',
        type: 'seasonal',
        priority: 1,
        active: true,
        conditions: [
          { field: 'season', operator: 'eq', value: 'summer' },
          { field: 'temperature', operator: 'gte', value: 80 }
        ],
        adjustment: {
          type: 'percentage',
          value: -10, // 10% discount during hot summer
          reason: 'Summer cooling demand surge'
        },
        validFrom: new Date('2024-06-01'),
        validTo: new Date('2024-08-31'),
        maxDiscount: 15
      },
      
      // High demand pricing
      {
        id: 'high-demand',
        name: 'High Demand Surge',
        type: 'demand',
        priority: 2,
        active: true,
        conditions: [
          { field: 'demandScore', operator: 'gte', value: 8 },
          { field: 'inventoryLevel', operator: 'lte', value: 20 }
        ],
        adjustment: {
          type: 'percentage',
          value: 5, // 5% premium for high demand, low inventory
          reason: 'High demand with limited inventory'
        },
        validFrom: new Date(),
        maxDiscount: 0,
        minPrice: 10
      },

      // Low inventory urgency
      {
        id: 'low-inventory',
        name: 'Low Inventory Clearance',
        type: 'inventory',
        priority: 3,
        active: true,
        conditions: [
          { field: 'inventoryLevel', operator: 'lte', value: 10 },
          { field: 'demandScore', operator: 'lte', value: 5 }
        ],
        adjustment: {
          type: 'percentage',
          value: -20, // 20% discount to clear low-demand inventory
          reason: 'Inventory clearance'
        },
        validFrom: new Date(),
        maxDiscount: 25
      },

      // Student discount
      {
        id: 'student-discount',
        name: 'Student Discount',
        type: 'user_segment',
        priority: 4,
        active: true,
        conditions: [
          { field: 'userSegment', operator: 'eq', value: 'student' }
        ],
        adjustment: {
          type: 'percentage',
          value: -15, // 15% student discount
          reason: 'Student pricing'
        },
        validFrom: new Date(),
        maxDiscount: 15
      },

      // Bulk order pricing
      {
        id: 'bulk-discount',
        name: 'Bulk Order Discount',
        type: 'user_segment',
        priority: 5,
        active: true,
        conditions: [
          { field: 'quantity', operator: 'gte', value: 5 }
        ],
        adjustment: {
          type: 'percentage',
          value: -12, // 12% bulk discount
          reason: 'Bulk order discount'
        },
        validFrom: new Date(),
        maxDiscount: 20
      },

      // Weekend special
      {
        id: 'weekend-special',
        name: 'Weekend Adventure Special',
        type: 'time_based',
        priority: 6,
        active: true,
        conditions: [
          { field: 'dayOfWeek', operator: 'in', value: ['friday', 'saturday', 'sunday'] }
        ],
        adjustment: {
          type: 'percentage',
          value: -8, // 8% weekend discount
          reason: 'Weekend adventure special'
        },
        validFrom: new Date(),
        maxDiscount: 10
      },

      // Holiday promotions
      {
        id: 'holiday-promo',
        name: 'Holiday Promotion',
        type: 'seasonal',
        priority: 7,
        active: true,
        conditions: [
          { field: 'holidaysApproaching', operator: 'in', value: ['memorial_day', 'july_4th', 'labor_day'] }
        ],
        adjustment: {
          type: 'percentage',
          value: -15, // 15% holiday discount
          reason: 'Holiday celebration special'
        },
        validFrom: new Date(),
        maxDiscount: 20
      }
    ];
  }

  // Calculate dynamic price for a product
  async calculatePrice(
    productId: string,
    userId?: string,
    quantity: number = 1,
    context?: { [key: string]: any }
  ): Promise<{
    basePrice: number;
    finalPrice: number;
    adjustments: Array<{
      rule: string;
      reason: string;
      adjustment: number;
      type: string;
    }>;
    savings: number;
    validUntil?: Date;
  }> {
    try {
      // Get product
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const basePrice = product.price;
      let finalPrice = basePrice;
      const adjustments: any[] = [];

      // Get market data and demand metrics
      const marketData = await this.getMarketData();
      const demandMetrics = await this.getDemandMetrics(productId);
      const userSegment = userId ? await this.getUserSegment(userId) : null;

      // Build evaluation context
      const evaluationContext = {
        productId,
        basePrice,
        quantity,
        season: marketData.season,
        temperature: marketData.temperature,
        weatherForecast: marketData.weatherForecast,
        holidaysApproaching: marketData.holidaysApproaching,
        demandScore: demandMetrics.demandScore,
        inventoryLevel: demandMetrics.inventoryLevel,
        trending: demandMetrics.trending,
        userSegment: userSegment?.segment,
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        ...context
      };

      // Apply pricing rules in priority order
      const applicableRules = this.pricingRules
        .filter(rule => this.isRuleApplicable(rule, evaluationContext))
        .sort((a, b) => a.priority - b.priority);

      let totalDiscount = 0;
      let validUntil: Date | undefined;

      for (const rule of applicableRules) {
        if (this.evaluateConditions(rule.conditions, evaluationContext)) {
          const adjustment = this.calculateAdjustment(rule.adjustment, finalPrice, quantity);
          
          // Apply min/max constraints
          let adjustedAmount = adjustment;
          
          if (rule.maxDiscount && adjustment < 0) {
            const maxDiscountAmount = basePrice * (rule.maxDiscount / 100);
            adjustedAmount = Math.max(adjustment, -maxDiscountAmount);
          }

          if (rule.minPrice && finalPrice + adjustedAmount < rule.minPrice) {
            adjustedAmount = rule.minPrice - finalPrice;
          }

          finalPrice += adjustedAmount;
          totalDiscount += Math.abs(adjustedAmount < 0 ? adjustedAmount : 0);

          adjustments.push({
            rule: rule.name,
            reason: rule.adjustment.reason,
            adjustment: adjustedAmount,
            type: rule.type
          });

          // Update valid until date
          if (rule.validTo && (!validUntil || rule.validTo < validUntil)) {
            validUntil = rule.validTo;
          }
        }
      }

      // Ensure minimum price
      finalPrice = Math.max(finalPrice, basePrice * 0.5); // Never go below 50% of base price

      return {
        basePrice,
        finalPrice: Math.round(finalPrice * 100) / 100,
        adjustments,
        savings: Math.round(totalDiscount * 100) / 100,
        validUntil
      };
    } catch (error) {
      console.error('Error calculating dynamic price:', error);
      
      // Fallback to base price
      const product = await Product.findById(productId);
      const basePrice = product?.price || 0;
      
      return {
        basePrice,
        finalPrice: basePrice,
        adjustments: [],
        savings: 0
      };
    }
  }

  // Get market data (weather, season, competitors)
  private async getMarketData(): Promise<MarketData> {
    // Cache market data for 1 hour
    if (this.marketDataCache && Date.now() - this.lastMarketUpdate.getTime() < 3600000) {
      return this.marketDataCache;
    }

    try {
      const now = new Date();
      const month = now.getMonth();
      
      // Determine season
      let season: 'spring' | 'summer' | 'fall' | 'winter';
      if (month >= 2 && month <= 4) season = 'spring';
      else if (month >= 5 && month <= 7) season = 'summer';
      else if (month >= 8 && month <= 10) season = 'fall';
      else season = 'winter';

      // Simulate weather data (in production, call weather API)
      const temperature = season === 'summer' ? 85 : season === 'winter' ? 35 : 65;
      
      // Check upcoming holidays
      const holidaysApproaching = this.checkUpcomingHolidays();

      // Simulate competitor pricing (in production, scrape competitor sites)
      const competitorPrices = await this.getCompetitorPrices();

      this.marketDataCache = {
        season,
        temperature,
        weatherForecast: [`${temperature}°F`, season === 'summer' ? 'Hot' : 'Mild'],
        holidaysApproaching,
        competitorPrices
      };

      this.lastMarketUpdate = now;
      return this.marketDataCache;
    } catch (error) {
      console.error('Error fetching market data:', error);
      
      // Return default data
      return {
        season: 'spring',
        temperature: 70,
        weatherForecast: ['70°F', 'Mild'],
        holidaysApproaching: [],
        competitorPrices: {}
      };
    }
  }

  // Get demand metrics for a product
  private async getDemandMetrics(productId: string): Promise<DemandMetrics> {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Get recent order data (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const recentOrders = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            'items.product': product._id
          }
        },
        {
          $unwind: '$items'
        },
        {
          $match: {
            'items.product': product._id
          }
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$items.quantity' },
            orderCount: { $sum: 1 }
          }
        }
      ]);

      const orderData = recentOrders[0] || { totalQuantity: 0, orderCount: 0 };
      
      // Simulate view and cart data (in production, get from analytics)
      const views = Math.floor(Math.random() * 1000) + 100;
      const cartAdds = Math.floor(views * 0.15); // 15% add-to-cart rate
      
      // Calculate demand score (0-10 scale)
      const viewWeight = 0.2;
      const cartWeight = 0.3;
      const purchaseWeight = 0.5;
      
      const normalizedViews = Math.min(views / 100, 10);
      const normalizedCartAdds = Math.min(cartAdds / 20, 10);
      const normalizedPurchases = Math.min(orderData.totalQuantity / 10, 10);
      
      const demandScore = (
        normalizedViews * viewWeight +
        normalizedCartAdds * cartWeight +
        normalizedPurchases * purchaseWeight
      );

      const inventoryLevel = product.inventory || 0;
      const trending = demandScore > 7 && inventoryLevel < 50;

      return {
        productId,
        views,
        cartAdds,
        purchases: orderData.totalQuantity,
        inventoryLevel,
        demandScore: Math.round(demandScore * 10) / 10,
        trending
      };
    } catch (error) {
      console.error('Error calculating demand metrics:', error);
      return {
        productId,
        views: 0,
        cartAdds: 0,
        purchases: 0,
        inventoryLevel: 100,
        demandScore: 5,
        trending: false
      };
    }
  }

  // Get user segment for personalized pricing
  private async getUserSegment(userId: string): Promise<UserSegment> {
    try {
      // In production, fetch user data from database
      // For now, simulate user segments
      const segments: UserSegment[] = [
        { segment: 'new', discountEligible: true, maxDiscount: 10 },
        { segment: 'returning', discountEligible: true, maxDiscount: 8 },
        { segment: 'vip', discountEligible: true, maxDiscount: 20, loyaltyPoints: 1000 },
        { segment: 'student', discountEligible: true, maxDiscount: 15 },
        { segment: 'military', discountEligible: true, maxDiscount: 12 },
        { segment: 'bulk_buyer', discountEligible: true, maxDiscount: 18 }
      ];

      // Randomly assign for demo (in production, use actual user data)
      return segments[Math.floor(Math.random() * segments.length)];
    } catch (error) {
      console.error('Error getting user segment:', error);
      return { segment: 'new', discountEligible: false, maxDiscount: 0 };
    }
  }

  // Check if a pricing rule is applicable
  private isRuleApplicable(rule: PricingRule, context: any): boolean {
    if (!rule.active) return false;
    
    const now = new Date();
    if (now < rule.validFrom) return false;
    if (rule.validTo && now > rule.validTo) return false;
    
    if (rule.applicableProducts && rule.applicableProducts.length > 0) {
      if (!rule.applicableProducts.includes(context.productId)) return false;
    }
    
    return true;
  }

  // Evaluate rule conditions
  private evaluateConditions(conditions: PricingCondition[], context: any): boolean {
    return conditions.every(condition => {
      const contextValue = context[condition.field];
      const conditionValue = condition.value;
      
      switch (condition.operator) {
        case 'eq':
          return contextValue === conditionValue;
        case 'gt':
          return contextValue > conditionValue;
        case 'lt':
          return contextValue < conditionValue;
        case 'gte':
          return contextValue >= conditionValue;
        case 'lte':
          return contextValue <= conditionValue;
        case 'in':
          return Array.isArray(conditionValue) && 
                 (Array.isArray(contextValue) 
                   ? contextValue.some(v => conditionValue.includes(v))
                   : conditionValue.includes(contextValue));
        case 'between':
          return Array.isArray(conditionValue) && 
                 contextValue >= conditionValue[0] && 
                 contextValue <= conditionValue[1];
        default:
          return false;
      }
    });
  }

  // Calculate price adjustment
  private calculateAdjustment(adjustment: PricingAdjustment, currentPrice: number, quantity: number): number {
    switch (adjustment.type) {
      case 'percentage':
        return currentPrice * (adjustment.value / 100);
      case 'fixed':
        return adjustment.value * quantity;
      case 'multiplier':
        return currentPrice * (adjustment.value - 1);
      default:
        return 0;
    }
  }

  // Check upcoming holidays
  private checkUpcomingHolidays(): string[] {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    
    const holidays = [
      { name: 'memorial_day', month: 4, date: 25 }, // Last Monday in May (approx)
      { name: 'july_4th', month: 6, date: 4 },
      { name: 'labor_day', month: 8, date: 7 } // First Monday in September (approx)
    ];
    
    const approaching = holidays.filter(holiday => {
      const holidayDate = new Date(year, holiday.month, holiday.date);
      const daysUntil = (holidayDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
      return daysUntil > 0 && daysUntil <= 14; // Within 2 weeks
    });
    
    return approaching.map(h => h.name);
  }

  // Get competitor prices (simulated)
  private async getCompetitorPrices(): Promise<{ [productId: string]: number }> {
    // In production, this would scrape competitor websites or use price APIs
    return {
      'competitor_1': 19.99,
      'competitor_2': 22.50,
      'competitor_3': 18.99
    };
  }

  // Add new pricing rule
  addPricingRule(rule: Omit<PricingRule, 'id'>): string {
    const id = `rule_${Date.now()}`;
    const newRule: PricingRule = { ...rule, id };
    
    this.pricingRules.push(newRule);
    this.pricingRules.sort((a, b) => a.priority - b.priority);
    
    return id;
  }

  // Update pricing rule
  updatePricingRule(id: string, updates: Partial<PricingRule>): boolean {
    const index = this.pricingRules.findIndex(rule => rule.id === id);
    if (index === -1) return false;
    
    this.pricingRules[index] = { ...this.pricingRules[index], ...updates };
    this.pricingRules.sort((a, b) => a.priority - b.priority);
    
    return true;
  }

  // Get all pricing rules
  getPricingRules(): PricingRule[] {
    return this.pricingRules;
  }

  // Get pricing analytics
  async getPricingAnalytics(days: number = 30): Promise<{
    totalRevenue: number;
    dynamicPricingRevenue: number;
    averageDiscount: number;
    topPerformingRules: Array<{
      rule: string;
      applications: number;
      revenueImpact: number;
    }>;
  }> {
    // In production, query actual order data
    const mockAnalytics = {
      totalRevenue: 45678.90,
      dynamicPricingRevenue: 8901.23,
      averageDiscount: 12.5,
      topPerformingRules: [
        { rule: 'Summer Peak Season', applications: 234, revenueImpact: 3456.78 },
        { rule: 'Bulk Order Discount', applications: 89, revenueImpact: 2345.67 },
        { rule: 'Weekend Adventure Special', applications: 156, revenueImpact: 1789.12 }
      ]
    };
    
    return mockAnalytics;
  }
}

export default new DynamicPricingService();