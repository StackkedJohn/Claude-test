import { Product } from '../models/Product';
import { BlogPost, IBlogPost } from '../models/Blog';

interface ProductMatch {
  product: any;
  relevanceScore: number;
  matchReason: string;
  suggestedPosition: 'inline' | 'sidebar' | 'footer';
}

interface ContentAnalysis {
  keywords: string[];
  topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  useCase: string[];
  targetAudience: string[];
}

class ProductMatchingService {
  // Main method to find related products for a blog post
  async findRelatedProducts(blogPost: IBlogPost, limit: number = 3): Promise<ProductMatch[]> {
    console.log(`Finding related products for blog post: ${blogPost.title}`);

    try {
      // Analyze blog content
      const contentAnalysis = await this.analyzeContent(blogPost);
      console.log('Content analysis:', contentAnalysis);

      // Get all active products
      const products = await Product.find({ 
        isActive: true,
        inventory: { $gt: 0 } // Only show products in stock
      }).lean();

      // Score each product for relevance
      const productMatches: ProductMatch[] = [];

      for (const product of products) {
        const relevanceScore = this.calculateRelevanceScore(product, blogPost, contentAnalysis);
        
        if (relevanceScore > 0.3) { // Minimum relevance threshold
          const matchReason = this.generateMatchReason(product, blogPost, contentAnalysis);
          const suggestedPosition = this.determineSuggestedPosition(relevanceScore);

          productMatches.push({
            product,
            relevanceScore,
            matchReason,
            suggestedPosition
          });
        }
      }

      // Sort by relevance score and return top matches
      return productMatches
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error finding related products:', error);
      return [];
    }
  }

  // Analyze blog content to understand context and intent
  private async analyzeContent(blogPost: IBlogPost): Promise<ContentAnalysis> {
    const allText = `${blogPost.title} ${blogPost.excerpt} ${blogPost.content} ${blogPost.tags.join(' ')}`.toLowerCase();
    
    // Extract keywords from content
    const keywords = this.extractKeywords(allText);
    
    // Identify main topics
    const topics = this.identifyTopics(allText, blogPost.categories);
    
    // Determine use cases mentioned
    const useCase = this.identifyUseCases(allText);
    
    // Identify target audience
    const targetAudience = this.identifyTargetAudience(allText);
    
    // Simple sentiment analysis
    const sentiment = this.analyzeSentiment(allText);

    return {
      keywords,
      topics,
      sentiment,
      useCase,
      targetAudience
    };
  }

  // Extract relevant keywords from content
  private extractKeywords(text: string): string[] {
    const stopWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'this', 'that', 'these', 'those', 'is', 'it', 'they', 'them', 'their'
    ];

    const coolingKeywords = [
      'ice', 'pack', 'cool', 'cooling', 'cold', 'freeze', 'frozen', 'chill', 'chilled',
      'temperature', 'thermal', 'insulated', 'insulation', 'reusable', 'eco-friendly',
      'sustainable', 'non-toxic', 'gel', 'food', 'drink', 'beverage', 'storage',
      'camping', 'hiking', 'outdoor', 'adventure', 'travel', 'picnic', 'lunch',
      'cooler', 'bag', 'backpack', 'portable', 'compact', 'lightweight', 'durable',
      'medical', 'injury', 'therapy', 'relief', 'pain', 'sport', 'sports', 'athletic',
      'beach', 'summer', 'hot', 'weather', 'vacation', 'trip', 'family', 'kids'
    ];

    const words = text.split(/\s+/)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => word.length > 2)
      .filter(word => !stopWords.includes(word));

    // Prioritize cooling-related keywords
    const relevantKeywords = words.filter(word => 
      coolingKeywords.some(keyword => word.includes(keyword) || keyword.includes(word))
    );

    // Add high-frequency general keywords
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    const frequentWords = Array.from(wordFreq.entries())
      .filter(([word, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    return [...new Set([...relevantKeywords, ...frequentWords])].slice(0, 15);
  }

  // Identify main topics from content and categories
  private identifyTopics(text: string, categories: any[]): string[] {
    const topics: string[] = [];

    // Add category-based topics
    categories.forEach(category => {
      if (category.name) {
        topics.push(category.name.toLowerCase());
      }
    });

    // Identify topic patterns
    const topicPatterns = {
      'food_storage': ['food', 'storage', 'fresh', 'preserve', 'meal', 'lunch', 'dinner'],
      'outdoor_adventure': ['camping', 'hiking', 'outdoor', 'adventure', 'trail', 'backpack'],
      'sports_recovery': ['sports', 'athletic', 'recovery', 'injury', 'therapy', 'pain'],
      'travel': ['travel', 'vacation', 'trip', 'journey', 'portable', 'compact'],
      'family_activities': ['family', 'kids', 'children', 'picnic', 'beach', 'park'],
      'eco_living': ['eco', 'sustainable', 'environment', 'green', 'reusable', 'zero-waste'],
      'medical_use': ['medical', 'health', 'therapy', 'treatment', 'relief', 'wellness']
    };

    Object.entries(topicPatterns).forEach(([topic, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length >= 2) {
        topics.push(topic);
      }
    });

    return [...new Set(topics)];
  }

  // Identify use cases mentioned in the content
  private identifyUseCases(text: string): string[] {
    const useCases: string[] = [];

    const useCasePatterns = {
      'food_cooling': ['keep food cold', 'food storage', 'lunch box', 'meal prep', 'fresh food'],
      'beverage_cooling': ['cold drinks', 'beverage', 'water bottle', 'drink cold', 'refreshing'],
      'injury_treatment': ['ice therapy', 'injury', 'sprain', 'bruise', 'pain relief', 'swelling'],
      'outdoor_activities': ['camping trip', 'hiking', 'outdoor adventure', 'trail', 'wilderness'],
      'sports_activities': ['after workout', 'sports', 'athletic', 'exercise', 'training'],
      'travel_use': ['vacation', 'travel', 'road trip', 'flight', 'hotel', 'portable'],
      'emergency_prep': ['emergency', 'first aid', 'preparedness', 'backup', 'power outage']
    };

    Object.entries(useCasePatterns).forEach(([useCase, patterns]) => {
      const hasMatch = patterns.some(pattern => text.includes(pattern.toLowerCase()));
      if (hasMatch) {
        useCases.push(useCase);
      }
    });

    return useCases;
  }

  // Identify target audience from content context
  private identifyTargetAudience(text: string): string[] {
    const audiences: string[] = [];

    const audiencePatterns = {
      'outdoor_enthusiasts': ['camping', 'hiking', 'outdoor', 'adventure', 'wilderness', 'trail'],
      'athletes': ['sports', 'athletic', 'workout', 'training', 'exercise', 'performance'],
      'families': ['family', 'kids', 'children', 'parents', 'picnic', 'school'],
      'professionals': ['work', 'office', 'professional', 'business', 'commute'],
      'travelers': ['travel', 'vacation', 'trip', 'journey', 'flight', 'hotel'],
      'health_conscious': ['health', 'wellness', 'natural', 'organic', 'medical', 'therapy'],
      'eco_conscious': ['eco', 'sustainable', 'environment', 'green', 'planet', 'waste']
    };

    Object.entries(audiencePatterns).forEach(([audience, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length >= 2) {
        audiences.push(audience);
      }
    });

    return audiences;
  }

  // Simple sentiment analysis
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = [
      'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'perfect', 'best',
      'love', 'enjoy', 'happy', 'satisfied', 'recommend', 'effective', 'reliable',
      'convenient', 'easy', 'simple', 'quality', 'durable', 'comfortable'
    ];

    const negativeWords = [
      'bad', 'terrible', 'awful', 'worst', 'hate', 'difficult', 'hard', 'problem',
      'issue', 'fail', 'broken', 'poor', 'cheap', 'uncomfortable', 'unreliable'
    ];

    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;

    if (positiveCount > negativeCount + 1) return 'positive';
    if (negativeCount > positiveCount + 1) return 'negative';
    return 'neutral';
  }

  // Calculate relevance score between product and blog content
  private calculateRelevanceScore(product: any, blogPost: IBlogPost, analysis: ContentAnalysis): number {
    let score = 0;

    const productText = `${product.name} ${product.description} ${product.tags?.join(' ') || ''} ${product.category || ''}`.toLowerCase();
    const blogText = `${blogPost.title} ${blogPost.excerpt} ${blogPost.tags.join(' ')}`.toLowerCase();

    // Keyword matching (40% weight)
    const keywordMatches = analysis.keywords.filter(keyword => 
      productText.includes(keyword) || product.name.toLowerCase().includes(keyword)
    );
    score += (keywordMatches.length / Math.max(analysis.keywords.length, 1)) * 0.4;

    // Product category matching (25% weight)
    const categoryMatch = this.checkCategoryMatch(product, blogPost, analysis);
    score += categoryMatch * 0.25;

    // Use case alignment (20% weight)
    const useCaseMatch = this.checkUseCaseAlignment(product, analysis.useCase);
    score += useCaseMatch * 0.20;

    // Direct mentions in content (10% weight)
    const directMentions = this.checkDirectMentions(product, blogText);
    score += directMentions * 0.10;

    // Size/type appropriateness (5% weight)
    const sizeMatch = this.checkSizeAppropriate(product, analysis);
    score += sizeMatch * 0.05;

    return Math.min(score, 1.0); // Cap at 1.0
  }

  // Check if product category matches blog content
  private checkCategoryMatch(product: any, blogPost: IBlogPost, analysis: ContentAnalysis): number {
    // Direct product category matching
    if (product.category) {
      const productCategory = product.category.toLowerCase();
      
      // Check against blog categories
      const blogCategories = blogPost.categories.map((cat: any) => cat.name?.toLowerCase() || '');
      if (blogCategories.some(cat => cat.includes(productCategory) || productCategory.includes(cat))) {
        return 1.0;
      }

      // Check against identified topics
      if (analysis.topics.some(topic => topic.includes(productCategory) || productCategory.includes(topic))) {
        return 0.8;
      }
    }

    // Ice pack specific matching
    if (product.name.toLowerCase().includes('ice') || product.name.toLowerCase().includes('pack')) {
      if (analysis.keywords.some(k => ['ice', 'cool', 'cold', 'freeze', 'chill'].includes(k))) {
        return 0.9;
      }
    }

    return 0.3; // Default moderate relevance for cooling products
  }

  // Check if product aligns with identified use cases
  private checkUseCaseAlignment(product: any, useCases: string[]): number {
    const productName = product.name.toLowerCase();
    const productDesc = (product.description || '').toLowerCase();
    
    const productUseCases = {
      'food_cooling': ['lunch', 'meal', 'food', 'kitchen'],
      'beverage_cooling': ['drink', 'beverage', 'bottle'],
      'injury_treatment': ['medical', 'therapy', 'relief', 'recovery'],
      'outdoor_activities': ['outdoor', 'camping', 'hiking', 'adventure'],
      'sports_activities': ['sport', 'athletic', 'gym', 'training'],
      'travel_use': ['travel', 'portable', 'compact', 'carry'],
      'emergency_prep': ['emergency', 'first aid', 'backup']
    };

    let maxMatch = 0;
    useCases.forEach(useCase => {
      const keywords = productUseCases[useCase] || [];
      const matches = keywords.filter(keyword => 
        productName.includes(keyword) || productDesc.includes(keyword)
      );
      const matchScore = matches.length > 0 ? Math.min(matches.length / keywords.length, 1) : 0;
      maxMatch = Math.max(maxMatch, matchScore);
    });

    return maxMatch;
  }

  // Check for direct product mentions in blog content
  private checkDirectMentions(product: any, blogText: string): number {
    const productName = product.name.toLowerCase();
    const productWords = productName.split(' ');
    
    // Check for partial name matches
    const mentionedWords = productWords.filter(word => 
      word.length > 2 && blogText.includes(word)
    );
    
    if (mentionedWords.length === productWords.length) {
      return 1.0; // Full product name mentioned
    } else if (mentionedWords.length > 0) {
      return mentionedWords.length / productWords.length;
    }

    // Check for brand mention
    if (blogText.includes('icepaca')) {
      return 0.5;
    }

    return 0;
  }

  // Check if product size/type is appropriate for the context
  private checkSizeAppropriate(product: any, analysis: ContentAnalysis): number {
    const productName = product.name.toLowerCase();
    
    // Size matching logic
    const sizeIndicators = {
      'small': ['small', 'compact', 'portable', 'travel', 'personal'],
      'medium': ['medium', 'standard', 'regular', 'family', 'daily'],
      'large': ['large', 'bulk', 'group', 'extended', 'long-term'],
      'bundle': ['bundle', 'set', 'kit', 'complete', 'collection']
    };

    // Determine content context size needs
    const contextSizeNeeds = this.determineContextSizeNeeds(analysis);
    
    // Check if product size matches context
    for (const [size, indicators] of Object.entries(sizeIndicators)) {
      const hasSize = indicators.some(indicator => productName.includes(indicator));
      if (hasSize && contextSizeNeeds.includes(size)) {
        return 1.0;
      }
    }

    return 0.5; // Default moderate appropriateness
  }

  // Determine what size products would be appropriate for the content context
  private determineContextSizeNeeds(analysis: ContentAnalysis): string[] {
    const sizeNeeds: string[] = [];

    // Analyze use cases for size needs
    if (analysis.useCase.includes('travel_use')) sizeNeeds.push('small');
    if (analysis.useCase.includes('food_cooling')) sizeNeeds.push('medium');
    if (analysis.useCase.includes('outdoor_activities')) sizeNeeds.push('medium', 'large');
    if (analysis.useCase.includes('sports_activities')) sizeNeeds.push('small', 'medium');

    // Analyze target audience for size preferences
    if (analysis.targetAudience.includes('families')) sizeNeeds.push('medium', 'large');
    if (analysis.targetAudience.includes('travelers')) sizeNeeds.push('small');
    if (analysis.targetAudience.includes('professionals')) sizeNeeds.push('small', 'medium');

    // Default to all sizes if unclear
    if (sizeNeeds.length === 0) {
      return ['small', 'medium', 'large'];
    }

    return [...new Set(sizeNeeds)];
  }

  // Generate human-readable reason for why product was matched
  private generateMatchReason(product: any, blogPost: IBlogPost, analysis: ContentAnalysis): string {
    const reasons: string[] = [];

    // Check keyword matches
    const productText = `${product.name} ${product.description || ''}`.toLowerCase();
    const keywordMatches = analysis.keywords.filter(keyword => productText.includes(keyword));
    
    if (keywordMatches.length > 0) {
      reasons.push(`Perfect for ${keywordMatches.slice(0, 2).join(' and ')} mentioned in the article`);
    }

    // Check use case alignment
    if (analysis.useCase.includes('food_cooling') && productText.includes('food')) {
      reasons.push('Ideal for food storage and cooling needs');
    }
    if (analysis.useCase.includes('outdoor_activities') && (productText.includes('outdoor') || productText.includes('portable'))) {
      reasons.push('Great for outdoor adventures and camping');
    }
    if (analysis.useCase.includes('injury_treatment') && productText.includes('therapy')) {
      reasons.push('Excellent for injury treatment and recovery');
    }

    // Check audience alignment
    if (analysis.targetAudience.includes('families') && productText.includes('family')) {
      reasons.push('Perfect size for family activities');
    }
    if (analysis.targetAudience.includes('travelers') && productText.includes('portable')) {
      reasons.push('Compact and travel-friendly design');
    }

    // Default reason if no specific matches
    if (reasons.length === 0) {
      reasons.push('Recommended cooling solution for your needs');
    }

    return reasons[0]; // Return the most relevant reason
  }

  // Determine where the product should be suggested in the content
  private determineSuggestedPosition(relevanceScore: number): 'inline' | 'sidebar' | 'footer' {
    if (relevanceScore > 0.8) return 'inline'; // High relevance - inline mention
    if (relevanceScore > 0.6) return 'sidebar'; // Medium relevance - sidebar
    return 'footer'; // Lower relevance - footer recommendation
  }

  // Update blog post with related products
  async updateBlogPostWithProducts(blogPostId: string): Promise<void> {
    try {
      const blogPost = await BlogPost.findById(blogPostId);
      if (!blogPost) {
        console.log(`Blog post ${blogPostId} not found`);
        return;
      }

      const productMatches = await this.findRelatedProducts(blogPost, 5);
      const relatedProductIds = productMatches.map(match => match.product._id);

      await BlogPost.findByIdAndUpdate(blogPostId, {
        relatedProducts: relatedProductIds,
        'cro.relatedProducts': productMatches.map(match => ({
          productId: match.product._id,
          relevanceScore: match.relevanceScore,
          matchReason: match.matchReason,
          suggestedPosition: match.suggestedPosition
        }))
      });

      console.log(`Updated blog post ${blogPostId} with ${productMatches.length} related products`);
    } catch (error) {
      console.error(`Error updating blog post ${blogPostId} with products:`, error);
    }
  }

  // Batch update all blog posts with related products
  async updateAllBlogPostsWithProducts(): Promise<void> {
    console.log('Starting batch update of all blog posts with related products...');

    try {
      const blogPosts = await BlogPost.find({
        status: 'published',
        isActive: true
      }).select('_id title');

      console.log(`Found ${blogPosts.length} published blog posts to update`);

      for (const post of blogPosts) {
        try {
          await this.updateBlogPostWithProducts(post._id.toString());
          // Add small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to update blog post ${post._id}:`, error);
        }
      }

      console.log('Batch update completed');
    } catch (error) {
      console.error('Error in batch update:', error);
    }
  }
}

export default ProductMatchingService;
export { ProductMatch, ContentAnalysis };