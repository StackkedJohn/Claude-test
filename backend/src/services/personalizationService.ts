import { User } from '../models/User';
import { Order } from '../models/Order';
import { Product } from '../models/Product';

interface UserProfile {
  userId?: string;
  sessionId: string;
  preferences: {
    favoriteCategories: string[];
    priceRange: { min: number; max: number };
    coolerSizes: string[];
    usagePatterns: string[];
    brandLoyalty: number;
  };
  behavior: {
    pageViews: Array<{
      page: string;
      timestamp: Date;
      duration: number;
    }>;
    searchQueries: Array<{
      query: string;
      timestamp: Date;
      results: number;
    }>;
    productViews: Array<{
      productId: string;
      timestamp: Date;
      duration: number;
    }>;
    cartActions: Array<{
      action: 'add' | 'remove' | 'update';
      productId: string;
      quantity: number;
      timestamp: Date;
    }>;
  };
  demographics: {
    location?: {
      country: string;
      state: string;
      city: string;
    };
    device: {
      type: 'desktop' | 'mobile' | 'tablet';
      os: string;
      browser: string;
    };
    timeZone?: string;
  };
  engagement: {
    sessionCount: number;
    totalTime: number;
    lastVisit: Date;
    firstVisit: Date;
    loyaltyScore: number;
  };
  purchaseHistory: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    favoriteProducts: string[];
    seasonalPatterns: { [season: string]: number };
    lastPurchase?: Date;
  };
}

interface PersonalizedRecommendations {
  homepage: {
    heroMessage: string;
    featuredProducts: Array<{
      id: string;
      reason: string;
      confidence: number;
    }>;
    categories: string[];
    promotions: Array<{
      id: string;
      title: string;
      description: string;
      relevance: number;
    }>;
  };
  products: Array<{
    id: string;
    name: string;
    price: number;
    personalizedPrice?: number;
    recommendationReason: string;
    confidence: number;
    category: string;
  }>;
  content: Array<{
    type: 'blog' | 'guide' | 'video';
    id: string;
    title: string;
    relevance: number;
    reason: string;
  }>;
  notifications: Array<{
    type: 'promotion' | 'restock' | 'price_drop' | 'recommendation';
    message: string;
    priority: number;
    validUntil?: Date;
  }>;
}

interface SessionData {
  sessionId: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  referrer?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  deviceInfo: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
    screenResolution?: string;
  };
  location?: {
    country: string;
    state: string;
    city: string;
    timezone: string;
  };
  consentGiven: {
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
    timestamp: Date;
  };
}

class PersonalizationService {
  private userProfiles: Map<string, UserProfile> = new Map();
  private sessions: Map<string, SessionData> = new Map();
  private mlModelWeights = {
    behavioral: 0.4,
    demographic: 0.2,
    transactional: 0.3,
    contextual: 0.1
  };

  // Create or update user profile
  async createUserProfile(sessionId: string, userId?: string): Promise<UserProfile> {
    const existingProfile = this.userProfiles.get(sessionId);
    
    if (existingProfile && userId) {
      existingProfile.userId = userId;
      return existingProfile;
    }

    const profile: UserProfile = {
      userId,
      sessionId,
      preferences: {
        favoriteCategories: [],
        priceRange: { min: 0, max: 1000 },
        coolerSizes: [],
        usagePatterns: [],
        brandLoyalty: 0.5
      },
      behavior: {
        pageViews: [],
        searchQueries: [],
        productViews: [],
        cartActions: []
      },
      demographics: {
        device: {
          type: 'desktop',
          os: 'unknown',
          browser: 'unknown'
        }
      },
      engagement: {
        sessionCount: 1,
        totalTime: 0,
        lastVisit: new Date(),
        firstVisit: new Date(),
        loyaltyScore: 0
      },
      purchaseHistory: {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        favoriteProducts: [],
        seasonalPatterns: {}
      }
    };

    // If user is logged in, load historical data
    if (userId) {
      await this.loadUserHistoricalData(profile, userId);
    }

    this.userProfiles.set(sessionId, profile);
    return profile;
  }

  // Load historical data for logged-in users
  private async loadUserHistoricalData(profile: UserProfile, userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      // Load purchase history
      const orders = await Order.find({ user: userId })
        .populate('items.product')
        .sort({ createdAt: -1 })
        .limit(50);

      if (orders.length > 0) {
        profile.purchaseHistory.totalOrders = orders.length;
        profile.purchaseHistory.totalSpent = orders.reduce((sum, order) => sum + order.totals.total, 0);
        profile.purchaseHistory.averageOrderValue = profile.purchaseHistory.totalSpent / orders.length;
        profile.purchaseHistory.lastPurchase = orders[0].createdAt;

        // Analyze favorite products and categories
        const productCounts: { [productId: string]: number } = {};
        const categoryCounts: { [category: string]: number } = {};
        const seasonalCounts: { [season: string]: number } = {};

        orders.forEach(order => {
          const season = this.getSeason(order.createdAt);
          seasonalCounts[season] = (seasonalCounts[season] || 0) + 1;

          order.items.forEach((item: any) => {
            if (item.product) {
              productCounts[item.product._id] = (productCounts[item.product._id] || 0) + item.quantity;
              
              const category = item.product.category || 'uncategorized';
              categoryCounts[category] = (categoryCounts[category] || 0) + item.quantity;
            }
          });
        });

        // Set favorites (top 3 products and categories)
        profile.purchaseHistory.favoriteProducts = Object.entries(productCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([productId]) => productId);

        profile.preferences.favoriteCategories = Object.entries(categoryCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([category]) => category);

        profile.purchaseHistory.seasonalPatterns = seasonalCounts;

        // Calculate loyalty score
        const daysSinceFirstOrder = Math.max(1, Math.floor((Date.now() - orders[orders.length - 1].createdAt.getTime()) / (1000 * 60 * 60 * 24)));
        const orderFrequency = orders.length / daysSinceFirstOrder * 365; // Orders per year
        profile.engagement.loyaltyScore = Math.min(1, orderFrequency / 4); // 4 orders per year = perfect loyalty
      }

      // Update user preferences based on profile data
      if (user.preferences) {
        profile.preferences = { ...profile.preferences, ...user.preferences };
      }

    } catch (error) {
      console.error('Error loading user historical data:', error);
    }
  }

  // Track user behavior
  async trackBehavior(sessionId: string, event: {
    type: 'page_view' | 'product_view' | 'search' | 'cart_action';
    data: any;
  }): Promise<void> {
    const profile = this.userProfiles.get(sessionId);
    if (!profile) return;

    const timestamp = new Date();

    switch (event.type) {
      case 'page_view':
        profile.behavior.pageViews.push({
          page: event.data.page,
          timestamp,
          duration: event.data.duration || 0
        });
        break;

      case 'product_view':
        profile.behavior.productViews.push({
          productId: event.data.productId,
          timestamp,
          duration: event.data.duration || 0
        });
        await this.updateProductInterest(profile, event.data.productId);
        break;

      case 'search':
        profile.behavior.searchQueries.push({
          query: event.data.query,
          timestamp,
          results: event.data.results || 0
        });
        await this.updateSearchPreferences(profile, event.data.query);
        break;

      case 'cart_action':
        profile.behavior.cartActions.push({
          action: event.data.action,
          productId: event.data.productId,
          quantity: event.data.quantity || 1,
          timestamp
        });
        break;
    }

    // Update engagement metrics
    profile.engagement.lastVisit = timestamp;
    profile.engagement.totalTime += event.data.duration || 0;

    this.userProfiles.set(sessionId, profile);
  }

  // Update product interest based on views
  private async updateProductInterest(profile: UserProfile, productId: string): Promise<void> {
    try {
      const product = await Product.findById(productId);
      if (!product) return;

      const category = product.category;
      if (category) {
        const index = profile.preferences.favoriteCategories.indexOf(category);
        if (index > -1) {
          // Move category to front (increase interest)
          profile.preferences.favoriteCategories.splice(index, 1);
          profile.preferences.favoriteCategories.unshift(category);
        } else {
          // Add new category
          profile.preferences.favoriteCategories.unshift(category);
          profile.preferences.favoriteCategories = profile.preferences.favoriteCategories.slice(0, 5);
        }
      }

      // Update price range preferences
      const price = product.price;
      if (profile.preferences.priceRange.min === 0 && profile.preferences.priceRange.max === 1000) {
        // First product view - set initial range
        profile.preferences.priceRange.min = Math.max(0, price * 0.7);
        profile.preferences.priceRange.max = price * 1.5;
      } else {
        // Adjust range based on viewed products
        if (price < profile.preferences.priceRange.min) {
          profile.preferences.priceRange.min = Math.max(0, price * 0.9);
        }
        if (price > profile.preferences.priceRange.max) {
          profile.preferences.priceRange.max = price * 1.1;
        }
      }
    } catch (error) {
      console.error('Error updating product interest:', error);
    }
  }

  // Update search preferences
  private async updateSearchPreferences(profile: UserProfile, query: string): Promise<void> {
    const lowerQuery = query.toLowerCase();
    
    // Extract usage patterns from search
    const patterns = ['camping', 'hiking', 'picnic', 'lunch', 'outdoor', 'sports', 'travel'];
    patterns.forEach(pattern => {
      if (lowerQuery.includes(pattern) && !profile.preferences.usagePatterns.includes(pattern)) {
        profile.preferences.usagePatterns.push(pattern);
      }
    });

    // Extract size preferences
    const sizes = ['small', 'medium', 'large', 'xl', 'compact', 'mini'];
    sizes.forEach(size => {
      if (lowerQuery.includes(size) && !profile.preferences.coolerSizes.includes(size)) {
        profile.preferences.coolerSizes.push(size);
      }
    });
  }

  // Generate personalized homepage
  async generatePersonalizedHomepage(sessionId: string): Promise<PersonalizedRecommendations['homepage']> {
    const profile = this.userProfiles.get(sessionId);
    
    if (!profile) {
      return this.getDefaultHomepage();
    }

    // Generate personalized hero message
    const heroMessage = this.generateHeroMessage(profile);

    // Get personalized product recommendations
    const featuredProducts = await this.getPersonalizedProductRecommendations(profile, 4);

    // Get relevant categories
    const categories = profile.preferences.favoriteCategories.slice(0, 3);

    // Get personalized promotions
    const promotions = await this.getPersonalizedPromotions(profile);

    return {
      heroMessage,
      featuredProducts: featuredProducts.map(p => ({
        id: p.id,
        reason: p.recommendationReason,
        confidence: p.confidence
      })),
      categories,
      promotions
    };
  }

  // Generate hero message based on user profile
  private generateHeroMessage(profile: UserProfile): string {
    const messages = {
      returning: [
        `Welcome back! Ready for your next cooling adventure?`,
        `Hey there, ${profile.userId ? 'valued customer' : 'friend'}! Your perfect ice pack is waiting.`,
        `Great to see you again! Check out what's new in cooling technology.`
      ],
      camping: [
        `Ready for your next camping trip? Discover our outdoor cooling solutions.`,
        `Keep your campsite cool with ICEPACA's adventure-ready ice packs.`,
        `From base camp to summit - we've got your cooling covered.`
      ],
      lunch: [
        `Fresh lunches, every day. Find your perfect lunch companion.`,
        `Keep your meals fresh with our compact cooling solutions.`,
        `Lunchtime just got cooler with ICEPACA.`
      ],
      sports: [
        `Stay cool during your workout with athletic-grade cooling.`,
        `Performance cooling for peak athletes.`,
        `Beat the heat, not your performance.`
      ],
      default: [
        `Discover the future of cooling with ICEPACA.`,
        `Revolutionary ice packs for every lifestyle.`,
        `Cool solutions for warm moments.`
      ]
    };

    let messageType = 'default';
    
    if (profile.engagement.sessionCount > 1) {
      messageType = 'returning';
    } else if (profile.preferences.usagePatterns.includes('camping') || 
               profile.preferences.usagePatterns.includes('outdoor')) {
      messageType = 'camping';
    } else if (profile.preferences.usagePatterns.includes('lunch')) {
      messageType = 'lunch';
    } else if (profile.preferences.usagePatterns.includes('sports')) {
      messageType = 'sports';
    }

    const messageList = messages[messageType as keyof typeof messages] || messages.default;
    return messageList[Math.floor(Math.random() * messageList.length)];
  }

  // Get personalized product recommendations
  async getPersonalizedProductRecommendations(
    profile: UserProfile, 
    limit: number = 10
  ): Promise<PersonalizedRecommendations['products']> {
    try {
      // Get all products
      const products = await Product.find({ isActive: true, inventory: { $gt: 0 } }).lean();
      
      // Score products based on user preferences
      const scoredProducts = products.map(product => {
        let score = 0;
        let reasons: string[] = [];

        // Category preference
        if (profile.preferences.favoriteCategories.includes(product.category)) {
          score += 0.3;
          reasons.push('matches your interests');
        }

        // Price range preference
        if (product.price >= profile.preferences.priceRange.min && 
            product.price <= profile.preferences.priceRange.max) {
          score += 0.2;
          reasons.push('in your price range');
        }

        // Previous purchase history
        if (profile.purchaseHistory.favoriteProducts.includes(product._id.toString())) {
          score += 0.25;
          reasons.push('you loved this before');
        }

        // Usage pattern matching
        const productName = product.name.toLowerCase();
        profile.preferences.usagePatterns.forEach(pattern => {
          if (productName.includes(pattern)) {
            score += 0.15;
            reasons.push(`perfect for ${pattern}`);
          }
        });

        // Size preferences
        profile.preferences.coolerSizes.forEach(size => {
          if (productName.includes(size)) {
            score += 0.1;
            reasons.push(`${size} size you prefer`);
          }
        });

        // Trending boost
        if (product.trending) {
          score += 0.05;
          reasons.push('trending now');
        }

        // Season relevance
        const currentSeason = this.getSeason(new Date());
        if (profile.purchaseHistory.seasonalPatterns[currentSeason] > 0) {
          score += 0.1;
          reasons.push('seasonal favorite');
        }

        return {
          id: product._id.toString(),
          name: product.name,
          price: product.price,
          category: product.category,
          score,
          recommendationReason: reasons.length > 0 ? reasons[0] : 'recommended for you',
          confidence: Math.min(1, score)
        };
      });

      // Sort by score and return top recommendations
      return scoredProducts
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  // Get personalized promotions
  private async getPersonalizedPromotions(profile: UserProfile): Promise<PersonalizedRecommendations['homepage']['promotions']> {
    const promotions = [
      {
        id: 'welcome-new',
        title: 'Welcome to ICEPACA!',
        description: 'Get 15% off your first order',
        condition: (p: UserProfile) => p.purchaseHistory.totalOrders === 0,
        relevance: 0.9
      },
      {
        id: 'loyalty-discount',
        title: 'Loyal Customer Special',
        description: '20% off for valued customers',
        condition: (p: UserProfile) => p.engagement.loyaltyScore > 0.7,
        relevance: 0.8
      },
      {
        id: 'seasonal-camping',
        title: 'Camping Season Sale',
        description: 'Up to 25% off camping gear',
        condition: (p: UserProfile) => p.preferences.usagePatterns.includes('camping'),
        relevance: 0.7
      },
      {
        id: 'bulk-discount',
        title: 'Family Pack Savings',
        description: 'Buy 3, get 1 free',
        condition: (p: UserProfile) => p.purchaseHistory.averageOrderValue > 75,
        relevance: 0.6
      }
    ];

    return promotions
      .filter(promo => promo.condition(profile))
      .map(promo => ({
        id: promo.id,
        title: promo.title,
        description: promo.description,
        relevance: promo.relevance
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3);
  }

  // Default homepage for new users
  private getDefaultHomepage(): PersonalizedRecommendations['homepage'] {
    return {
      heroMessage: 'Discover the future of cooling with ICEPACA',
      featuredProducts: [],
      categories: ['ice-packs', 'cooler-accessories', 'outdoor-gear'],
      promotions: [
        {
          id: 'new-customer',
          title: 'Welcome Offer',
          description: '15% off your first order',
          relevance: 1.0
        }
      ]
    };
  }

  // Create session data
  async createSession(sessionData: Partial<SessionData>): Promise<SessionData> {
    const session: SessionData = {
      sessionId: sessionData.sessionId || this.generateSessionId(),
      userId: sessionData.userId,
      startTime: new Date(),
      lastActivity: new Date(),
      ipAddress: sessionData.ipAddress || '127.0.0.1',
      userAgent: sessionData.userAgent || 'Unknown',
      referrer: sessionData.referrer,
      utmParams: sessionData.utmParams,
      deviceInfo: sessionData.deviceInfo || {
        type: 'desktop',
        os: 'unknown',
        browser: 'unknown'
      },
      location: sessionData.location,
      consentGiven: sessionData.consentGiven || {
        analytics: false,
        marketing: false,
        personalization: false,
        timestamp: new Date()
      }
    };

    this.sessions.set(session.sessionId, session);
    return session;
  }

  // Update session consent
  async updateConsent(sessionId: string, consent: {
    analytics?: boolean;
    marketing?: boolean;
    personalization?: boolean;
  }): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.consentGiven = {
        ...session.consentGiven,
        ...consent,
        timestamp: new Date()
      };
      this.sessions.set(sessionId, session);
    }
  }

  // Get user profile analytics
  async getUserAnalytics(sessionId: string): Promise<{
    profileCompleteness: number;
    engagementScore: number;
    recommendationAccuracy: number;
    segmentData: {
      primary: string;
      secondary: string[];
      confidence: number;
    };
  }> {
    const profile = this.userProfiles.get(sessionId);
    
    if (!profile) {
      return {
        profileCompleteness: 0,
        engagementScore: 0,
        recommendationAccuracy: 0,
        segmentData: {
          primary: 'new_visitor',
          secondary: [],
          confidence: 1.0
        }
      };
    }

    // Calculate profile completeness
    let completeness = 0;
    if (profile.preferences.favoriteCategories.length > 0) completeness += 20;
    if (profile.preferences.usagePatterns.length > 0) completeness += 20;
    if (profile.purchaseHistory.totalOrders > 0) completeness += 30;
    if (profile.behavior.pageViews.length > 5) completeness += 15;
    if (profile.behavior.productViews.length > 3) completeness += 15;

    // Calculate engagement score
    const sessionDuration = profile.engagement.totalTime / (1000 * 60); // minutes
    const pageViewsPerSession = profile.behavior.pageViews.length / profile.engagement.sessionCount;
    const engagementScore = Math.min(100, 
      (sessionDuration / 10) * 40 + // Up to 40 points for 10+ minutes
      (pageViewsPerSession / 5) * 30 + // Up to 30 points for 5+ pages per session
      (profile.behavior.productViews.length / 10) * 30 // Up to 30 points for 10+ product views
    );

    // Determine user segment
    const segmentData = this.calculateUserSegment(profile);

    return {
      profileCompleteness: Math.round(completeness),
      engagementScore: Math.round(engagementScore),
      recommendationAccuracy: Math.round(profile.engagement.loyaltyScore * 100),
      segmentData
    };
  }

  // Calculate user segment
  private calculateUserSegment(profile: UserProfile): {
    primary: string;
    secondary: string[];
    confidence: number;
  } {
    const segments: Array<{
      name: string;
      score: number;
      indicators: string[];
    }> = [];

    // Outdoor enthusiast
    const outdoorScore = profile.preferences.usagePatterns.filter(p => 
      ['camping', 'hiking', 'outdoor', 'sports'].includes(p)
    ).length / 4;
    segments.push({
      name: 'outdoor_enthusiast',
      score: outdoorScore,
      indicators: ['camping', 'hiking', 'outdoor activities']
    });

    // Lunch pack user
    const lunchScore = profile.preferences.usagePatterns.includes('lunch') ? 0.8 : 0;
    segments.push({
      name: 'lunch_user',
      score: lunchScore,
      indicators: ['lunch', 'work', 'school']
    });

    // Budget conscious
    const budgetScore = profile.preferences.priceRange.max < 30 ? 0.8 : 0.3;
    segments.push({
      name: 'budget_conscious',
      score: budgetScore,
      indicators: ['low price range', 'discount seeking']
    });

    // Premium customer
    const premiumScore = profile.purchaseHistory.averageOrderValue > 100 ? 0.9 : 0.2;
    segments.push({
      name: 'premium_customer',
      score: premiumScore,
      indicators: ['high order value', 'quality focused']
    });

    // Loyal customer
    const loyaltyScore = profile.engagement.loyaltyScore;
    segments.push({
      name: 'loyal_customer',
      score: loyaltyScore,
      indicators: ['repeat purchases', 'brand loyalty']
    });

    // Sort by score
    segments.sort((a, b) => b.score - a.score);
    
    const primary = segments[0].name;
    const secondary = segments.slice(1, 3).map(s => s.name);
    const confidence = segments[0].score;

    return { primary, secondary, confidence };
  }

  // Generate session ID
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get season from date
  private getSeason(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  // Clean up old sessions and profiles
  async cleanup(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Remove old sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < oneDayAgo) {
        this.sessions.delete(sessionId);
        this.userProfiles.delete(sessionId);
      }
    }

    console.log(`Cleaned up ${this.sessions.size} active sessions`);
  }

  // Get service statistics
  getStats(): {
    activeSessions: number;
    activeProfiles: number;
    averageEngagement: number;
    topCategories: string[];
  } {
    const profiles = Array.from(this.userProfiles.values());
    
    const averageEngagement = profiles.length > 0 
      ? profiles.reduce((sum, p) => sum + p.engagement.loyaltyScore, 0) / profiles.length
      : 0;

    const categoryMap: { [category: string]: number } = {};
    profiles.forEach(profile => {
      profile.preferences.favoriteCategories.forEach(cat => {
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });
    });

    const topCategories = Object.entries(categoryMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => cat);

    return {
      activeSessions: this.sessions.size,
      activeProfiles: this.userProfiles.size,
      averageEngagement: Math.round(averageEngagement * 100) / 100,
      topCategories
    };
  }
}

export default new PersonalizationService();