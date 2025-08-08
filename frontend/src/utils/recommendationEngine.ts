// AI-Powered Personalized Recommendation Engine for ICEPACA
import { analytics } from './analytics';

interface UserProfile {
  userId: string;
  demographics?: {
    age?: number;
    location?: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
  };
  preferences: {
    useCases: string[]; // camping, marine, lunch, etc.
    priceRange: [number, number];
    sizePreference: string[];
    brandLoyalty: number; // 0-1 score
  };
  behavior: {
    browsingHistory: ProductInteraction[];
    purchaseHistory: Purchase[];
    cartAbandonment: CartAbandonmentEvent[];
    sessionDuration: number;
    pageViews: number;
    engagementScore: number; // 0-1 score
  };
  contextualFactors: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    season: 'spring' | 'summer' | 'fall' | 'winter';
    weatherCondition?: 'hot' | 'cold' | 'mild' | 'rainy';
    isHoliayPeriod: boolean;
  };
}

interface ProductInteraction {
  productId: string;
  interactionType: 'view' | 'click' | 'add_to_cart' | 'wishlist' | 'share';
  timestamp: Date;
  duration?: number;
  source: string;
}

interface Purchase {
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  timestamp: Date;
  satisfaction?: number; // 1-5 rating if available
}

interface CartAbandonmentEvent {
  sessionId: string;
  products: { productId: string; quantity: number }[];
  timestamp: Date;
  reason?: 'price' | 'shipping' | 'payment' | 'comparison' | 'distraction';
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  size: string;
  useCases: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  features: string[];
  specifications: Record<string, any>;
}

interface Recommendation {
  productId: string;
  score: number;
  reason: RecommendationReason;
  confidence: number; // 0-1 score
  personalizedMessage: string;
  urgency?: 'low' | 'medium' | 'high';
  context: string;
}

interface RecommendationReason {
  primary: 'collaborative' | 'content_based' | 'behavioral' | 'contextual' | 'trending';
  factors: string[];
  explanation: string;
}

class PersonalizedRecommendationEngine {
  private userProfiles: Map<string, UserProfile> = new Map();
  private products: Map<string, Product> = new Map();
  private interactions: ProductInteraction[] = [];
  private modelWeights = {
    collaborative: 0.3,
    contentBased: 0.25,
    behavioral: 0.2,
    contextual: 0.15,
    trending: 0.1
  };

  constructor() {
    this.initializeProducts();
    this.loadUserData();
  }

  private initializeProducts(): void {
    // Mock product data - in production, this would come from your API
    const mockProducts: Product[] = [
      {
        id: '1',
        name: 'ICEPACA Small Pack',
        category: 'Ice Packs',
        price: 10,
        size: 'Small',
        useCases: ['lunch', 'picnic', 'kids'],
        tags: ['compact', 'school', 'work', 'portable'],
        rating: 4.8,
        reviewCount: 124,
        inStock: true,
        features: ['Leak-proof', 'Non-toxic', 'Freezes in 4 hours'],
        specifications: { capacity: '16 oz', duration: '6-8 hours' }
      },
      {
        id: '2',
        name: 'ICEPACA Medium Pack',
        category: 'Ice Packs',
        price: 15,
        size: 'Medium',
        useCases: ['camping', 'picnic', 'sports'],
        tags: ['versatile', 'outdoor', 'cooler', 'family'],
        rating: 4.7,
        reviewCount: 89,
        inStock: true,
        features: ['Extended cooling', 'Durable', 'Ergonomic'],
        specifications: { capacity: '32 oz', duration: '10-12 hours' }
      },
      {
        id: '3',
        name: 'ICEPACA Large Pack',
        category: 'Ice Packs',
        price: 20,
        size: 'Large',
        useCases: ['marine', 'camping', 'commercial'],
        tags: ['heavy-duty', 'professional', 'marine-grade', 'long-lasting'],
        rating: 4.9,
        reviewCount: 156,
        inStock: true,
        features: ['Maximum cooling', 'Marine-grade', 'Puncture-resistant'],
        specifications: { capacity: '64 oz', duration: '16-24 hours' }
      },
      {
        id: '4',
        name: 'ICEPACA Adventure Bundle',
        category: 'Bundles',
        price: 45,
        size: 'Bundle',
        useCases: ['camping', 'marine', 'sports', 'family'],
        tags: ['complete-set', 'value', 'gift', 'adventure'],
        rating: 4.9,
        reviewCount: 203,
        inStock: true,
        features: ['All sizes included', 'Best value', 'Gift-ready'],
        specifications: { capacity: 'Small + Medium + Large', duration: '6-24 hours' }
      }
    ];

    mockProducts.forEach(product => {
      this.products.set(product.id, product);
    });
  }

  private loadUserData(): void {
    // Load user profiles from storage or create new ones
    try {
      const storedProfiles = localStorage.getItem('user_profiles');
      if (storedProfiles) {
        const profiles = JSON.parse(storedProfiles);
        Object.entries(profiles).forEach(([userId, profile]: [string, any]) => {
          this.userProfiles.set(userId, {
            ...profile,
            behavior: {
              ...profile.behavior,
              browsingHistory: profile.behavior.browsingHistory.map((item: any) => ({
                ...item,
                timestamp: new Date(item.timestamp)
              })),
              purchaseHistory: profile.behavior.purchaseHistory.map((item: any) => ({
                ...item,
                timestamp: new Date(item.timestamp)
              })),
              cartAbandonment: profile.behavior.cartAbandonment.map((item: any) => ({
                ...item,
                timestamp: new Date(item.timestamp)
              }))
            }
          });
        });
      }
    } catch (error) {
      console.error('Error loading user profiles:', error);
    }
  }

  private saveUserData(): void {
    try {
      const profilesToStore = Object.fromEntries(this.userProfiles.entries());
      localStorage.setItem('user_profiles', JSON.stringify(profilesToStore));
    } catch (error) {
      console.error('Error saving user profiles:', error);
    }
  }

  public updateUserProfile(userId: string, updates: Partial<UserProfile>): void {
    const existingProfile = this.userProfiles.get(userId) || this.createDefaultProfile(userId);
    const updatedProfile = { ...existingProfile, ...updates };
    this.userProfiles.set(userId, updatedProfile);
    this.saveUserData();
  }

  private createDefaultProfile(userId: string): UserProfile {
    const contextualFactors = this.getContextualFactors();
    
    return {
      userId,
      preferences: {
        useCases: [],
        priceRange: [0, 100],
        sizePreference: [],
        brandLoyalty: 0.5
      },
      behavior: {
        browsingHistory: [],
        purchaseHistory: [],
        cartAbandonment: [],
        sessionDuration: 0,
        pageViews: 0,
        engagementScore: 0.1
      },
      contextualFactors
    };
  }

  private getContextualFactors() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const month = now.getMonth();
    
    const timeOfDay = hour < 6 ? 'night' : 
                     hour < 12 ? 'morning' : 
                     hour < 18 ? 'afternoon' : 'evening';

    const season = month < 3 || month === 11 ? 'winter' :
                   month < 6 ? 'spring' :
                   month < 9 ? 'summer' : 'fall';

    // Check for holiday periods (simplified)
    const isHoliayPeriod = [11, 0].includes(month) || // Nov-Dec
                           (month === 5 && now.getDate() > 15) || // Late May
                           (month === 6) || // June
                           (month === 7); // July

    return {
      timeOfDay,
      dayOfWeek,
      season,
      isHoliayPeriod
    };
  }

  public trackInteraction(userId: string, interaction: ProductInteraction): void {
    this.interactions.push(interaction);
    
    const profile = this.userProfiles.get(userId) || this.createDefaultProfile(userId);
    profile.behavior.browsingHistory.push(interaction);
    
    // Update engagement score
    const interactionWeights = {
      view: 1,
      click: 2,
      add_to_cart: 5,
      wishlist: 3,
      share: 4
    };
    
    const weight = interactionWeights[interaction.interactionType] || 1;
    profile.behavior.engagementScore = Math.min(1, profile.behavior.engagementScore + (weight * 0.01));

    // Infer preferences from interactions
    const product = this.products.get(interaction.productId);
    if (product) {
      // Update use case preferences
      product.useCases.forEach(useCase => {
        if (!profile.preferences.useCases.includes(useCase)) {
          profile.preferences.useCases.push(useCase);
        }
      });

      // Update size preferences
      if (!profile.preferences.sizePreference.includes(product.size)) {
        profile.preferences.sizePreference.push(product.size);
      }

      // Update price range based on interaction
      if (interaction.interactionType === 'add_to_cart' || interaction.interactionType === 'wishlist') {
        profile.preferences.priceRange[1] = Math.max(profile.preferences.priceRange[1], product.price * 1.2);
      }
    }

    this.userProfiles.set(userId, profile);
    this.saveUserData();
  }

  public getRecommendations(
    userId: string, 
    context: 'homepage' | 'product_page' | 'cart' | 'checkout' | 'email' = 'homepage',
    limit: number = 4
  ): Recommendation[] {
    const profile = this.userProfiles.get(userId) || this.createDefaultProfile(userId);
    const allProducts = Array.from(this.products.values()).filter(p => p.inStock);
    
    // Score products using different algorithms
    const recommendations: Recommendation[] = allProducts.map(product => {
      const collaborativeScore = this.calculateCollaborativeScore(userId, product.id);
      const contentScore = this.calculateContentBasedScore(profile, product);
      const behavioralScore = this.calculateBehavioralScore(profile, product);
      const contextualScore = this.calculateContextualScore(profile, product, context);
      const trendingScore = this.calculateTrendingScore(product);

      const totalScore = (
        collaborativeScore * this.modelWeights.collaborative +
        contentScore * this.modelWeights.contentBased +
        behavioralScore * this.modelWeights.behavioral +
        contextualScore * this.modelWeights.contextual +
        trendingScore * this.modelWeights.trending
      );

      const reason = this.generateRecommendationReason(
        { collaborativeScore, contentScore, behavioralScore, contextualScore, trendingScore },
        product,
        profile
      );

      return {
        productId: product.id,
        score: totalScore,
        reason,
        confidence: this.calculateConfidence(totalScore, profile.behavior.engagementScore),
        personalizedMessage: this.generatePersonalizedMessage(product, profile, context),
        urgency: this.calculateUrgency(product, profile),
        context
      };
    });

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateCollaborativeScore(userId: string, productId: string): number {
    // Simplified collaborative filtering based on similar users' interactions
    const userInteractions = this.interactions.filter(i => i.userId === userId);
    const productInteractions = this.interactions.filter(i => i.productId === productId);
    
    if (productInteractions.length === 0) return 0.1;

    // Find users who interacted with this product
    const similarUsers = productInteractions.map(i => i.userId).filter(id => id !== userId);
    
    if (similarUsers.length === 0) return 0.1;

    // Calculate similarity score based on common interactions
    let similaritySum = 0;
    similarUsers.forEach(similarUserId => {
      const commonProducts = userInteractions
        .filter(ui => this.interactions.some(si => 
          si.userId === similarUserId && si.productId === ui.productId
        )).length;
      
      similaritySum += commonProducts / Math.max(userInteractions.length, 1);
    });

    return Math.min(1, similaritySum / similarUsers.length);
  }

  private calculateContentBasedScore(profile: UserProfile, product: Product): number {
    let score = 0;

    // Use case match
    const useCaseMatch = product.useCases.some(uc => profile.preferences.useCases.includes(uc));
    if (useCaseMatch) score += 0.4;

    // Size preference match
    if (profile.preferences.sizePreference.includes(product.size)) {
      score += 0.3;
    }

    // Price range match
    const [minPrice, maxPrice] = profile.preferences.priceRange;
    if (product.price >= minPrice && product.price <= maxPrice) {
      score += 0.2;
    }

    // Quality score based on ratings
    score += (product.rating / 5) * 0.1;

    return Math.min(1, score);
  }

  private calculateBehavioralScore(profile: UserProfile, product: Product): number {
    let score = 0;

    // Check if user has interacted with similar products
    const similarInteractions = profile.behavior.browsingHistory.filter(interaction => {
      const interactedProduct = this.products.get(interaction.productId);
      return interactedProduct && (
        interactedProduct.category === product.category ||
        interactedProduct.useCases.some(uc => product.useCases.includes(uc))
      );
    });

    score += Math.min(0.5, similarInteractions.length * 0.1);

    // Engagement score influence
    score += profile.behavior.engagementScore * 0.3;

    // Recency of interactions
    const recentInteractions = profile.behavior.browsingHistory.filter(
      interaction => Date.now() - interaction.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // 7 days
    );
    score += Math.min(0.2, recentInteractions.length * 0.05);

    return Math.min(1, score);
  }

  private calculateContextualScore(profile: UserProfile, product: Product, context: string): number {
    let score = 0;

    // Seasonal relevance
    const seasonalRelevance: Record<string, string[]> = {
      summer: ['marine', 'picnic', 'sports', 'camping'],
      winter: ['lunch', 'indoor'],
      spring: ['camping', 'picnic'],
      fall: ['camping', 'sports']
    };

    const relevantUseCases = seasonalRelevance[profile.contextualFactors.season] || [];
    if (product.useCases.some(uc => relevantUseCases.includes(uc))) {
      score += 0.3;
    }

    // Time of day relevance
    if (profile.contextualFactors.timeOfDay === 'morning' && product.useCases.includes('lunch')) {
      score += 0.2;
    }

    // Holiday period boost for gifts/bundles
    if (profile.contextualFactors.isHoliayPeriod && product.tags.includes('gift')) {
      score += 0.3;
    }

    // Context-specific boosts
    const contextBoosts: Record<string, Record<string, number>> = {
      homepage: { 'trending': 0.2, 'popular': 0.2 },
      product_page: { 'related': 0.3, 'complementary': 0.2 },
      cart: { 'bundle': 0.4, 'upsell': 0.3 },
      checkout: { 'accessories': 0.2 },
      email: { 'personalized': 0.3, 'abandoned': 0.4 }
    };

    const boosts = contextBoosts[context] || {};
    Object.entries(boosts).forEach(([tag, boost]) => {
      if (product.tags.includes(tag)) {
        score += boost;
      }
    });

    return Math.min(1, score);
  }

  private calculateTrendingScore(product: Product): number {
    // Simple trending calculation based on recent interactions
    const recentInteractions = this.interactions.filter(
      i => i.productId === product.id && 
           Date.now() - i.timestamp.getTime() < 24 * 60 * 60 * 1000 // last 24 hours
    );

    const viewCount = recentInteractions.filter(i => i.interactionType === 'view').length;
    const cartAdds = recentInteractions.filter(i => i.interactionType === 'add_to_cart').length;

    return Math.min(1, (viewCount * 0.1 + cartAdds * 0.3) / 10);
  }

  private generateRecommendationReason(
    scores: Record<string, number>,
    product: Product,
    profile: UserProfile
  ): RecommendationReason {
    const maxScore = Math.max(...Object.values(scores));
    const primaryReason = Object.entries(scores).find(([, score]) => score === maxScore)?.[0] || 'trending';

    const factors: string[] = [];
    const reasonMap: Record<string, { primary: RecommendationReason['primary'], explanation: string }> = {
      collaborativeScore: {
        primary: 'collaborative',
        explanation: 'Customers like you also viewed this product'
      },
      contentScore: {
        primary: 'content_based',
        explanation: 'Matches your interests and preferences'
      },
      behavioralScore: {
        primary: 'behavioral',
        explanation: 'Based on your browsing behavior'
      },
      contextualScore: {
        primary: 'contextual',
        explanation: 'Perfect for this time of year'
      },
      trendingScore: {
        primary: 'trending',
        explanation: 'Trending among ICEPACA users'
      }
    };

    // Add relevant factors
    if (scores.collaborativeScore > 0.3) factors.push('Similar users');
    if (scores.contentScore > 0.3) factors.push('Interest match');
    if (scores.behavioralScore > 0.3) factors.push('Browsing history');
    if (scores.contextualScore > 0.3) factors.push('Seasonal relevance');
    if (scores.trendingScore > 0.3) factors.push('Currently popular');

    const reason = reasonMap[primaryReason] || reasonMap.trendingScore;

    return {
      primary: reason.primary,
      factors,
      explanation: reason.explanation
    };
  }

  private calculateConfidence(score: number, engagementScore: number): number {
    // Confidence based on score and user engagement level
    const baseConfidence = Math.min(1, score * 1.2);
    const engagementBoost = engagementScore * 0.3;
    return Math.min(1, baseConfidence + engagementBoost);
  }

  private generatePersonalizedMessage(product: Product, profile: UserProfile, context: string): string {
    const messages: Record<string, string[]> = {
      homepage: [
        `Perfect for your ${profile.preferences.useCases[0] || 'outdoor'} adventures!`,
        `${product.name} - Loved by customers like you`,
        `Keep things cool with our most popular ${product.size.toLowerCase()} pack`
      ],
      product_page: [
        `Customers who viewed this also loved ${product.name}`,
        `Complete your cooling setup with ${product.name}`,
        `${product.name} pairs perfectly with your selection`
      ],
      cart: [
        `Add ${product.name} for the complete cooling solution`,
        `Save more with ${product.name} - perfect bundle addition`,
        `Don't forget ${product.name} for extended cooling power`
      ],
      email: [
        `Still thinking about ${product.name}? It's waiting for you!`,
        `Complete your order with ${product.name}`,
        `${product.name} is back in stock - grab yours now!`
      ]
    };

    const contextMessages = messages[context] || messages.homepage;
    return contextMessages[Math.floor(Math.random() * contextMessages.length)];
  }

  private calculateUrgency(product: Product, profile: UserProfile): 'low' | 'medium' | 'high' {
    let urgencyScore = 0;

    // Check if user has this in cart abandonment
    const hasAbandoned = profile.behavior.cartAbandonment.some(
      abandonment => abandonment.products.some(p => p.productId === product.id)
    );
    if (hasAbandoned) urgencyScore += 0.4;

    // Check stock level (mock - in production, get from inventory)
    if (product.reviewCount > 100) urgencyScore += 0.2; // Popular items

    // Seasonal urgency
    if (profile.contextualFactors.season === 'summer' && product.useCases.includes('marine')) {
      urgencyScore += 0.3;
    }

    // Holiday urgency
    if (profile.contextualFactors.isHoliayPeriod && product.tags.includes('gift')) {
      urgencyScore += 0.3;
    }

    if (urgencyScore >= 0.7) return 'high';
    if (urgencyScore >= 0.4) return 'medium';
    return 'low';
  }

  // Public API methods for integration
  public getPersonalizedHomepage(userId: string) {
    return {
      recommendations: this.getRecommendations(userId, 'homepage', 6),
      trending: this.getTrendingProducts(4),
      newArrivals: this.getNewArrivals(4),
      personalizedMessage: this.getPersonalizedWelcomeMessage(userId)
    };
  }

  public getProductRecommendations(userId: string, currentProductId: string, limit = 4) {
    return this.getRecommendations(userId, 'product_page', limit);
  }

  public getCartRecommendations(userId: string, cartItems: string[], limit = 3) {
    return this.getRecommendations(userId, 'cart', limit)
      .filter(rec => !cartItems.includes(rec.productId));
  }

  public getAbandonedCartRecommendations(userId: string, abandonedItems: string[]) {
    const profile = this.userProfiles.get(userId);
    if (!profile) return [];

    return this.getRecommendations(userId, 'email', 3)
      .map(rec => ({
        ...rec,
        personalizedMessage: `Still thinking about ${this.products.get(rec.productId)?.name}? Complete your order now!`,
        urgency: 'high' as const
      }));
  }

  private getTrendingProducts(limit: number) {
    return Array.from(this.products.values())
      .sort((a, b) => this.calculateTrendingScore(b) - this.calculateTrendingScore(a))
      .slice(0, limit);
  }

  private getNewArrivals(limit: number) {
    // Mock implementation - in production, sort by creation date
    return Array.from(this.products.values())
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, limit);
  }

  private getPersonalizedWelcomeMessage(userId: string): string {
    const profile = this.userProfiles.get(userId);
    if (!profile || profile.behavior.browsingHistory.length === 0) {
      return "Welcome to ICEPACA! Discover our alpaca-inspired cooling solutions.";
    }

    const primaryUseCase = profile.preferences.useCases[0];
    const useCaseMessages: Record<string, string> = {
      camping: "Ready for your next adventure? We've got the cooling power you need!",
      marine: "Set sail with confidence - our marine-grade cooling solutions have you covered!",
      lunch: "Make every meal fresh with our premium lunch cooling solutions!",
      sports: "Stay cool during intense activities with our sports-tested ice packs!"
    };

    return useCaseMessages[primaryUseCase] || "Welcome back! Check out these personalized recommendations.";
  }
}

// Global instance
const recommendationEngine = new PersonalizedRecommendationEngine();

export { recommendationEngine, PersonalizedRecommendationEngine };
export type { Recommendation, UserProfile, ProductInteraction };