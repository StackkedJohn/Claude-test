import axios from 'axios';
import OpenAI from 'openai';
import { BlogPost, ContentQueue, ResearchSource, IBlogPost, IContentQueue } from '../models/Blog';
import { Product } from '../models/Product';
import ProductMatchingService from './productMatchingService';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

interface ResearchResult {
  title: string;
  content: string;
  url: string;
  relevanceScore: number;
  credibilityScore: number;
  publishedDate?: Date;
  source: string;
}

interface GeneratedContent {
  title: string;
  excerpt: string;
  content: string;
  seoData: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  featuredImagePrompt: string;
  relatedProducts: string[];
  confidence: number;
}

interface WebSearchResult {
  title: string;
  snippet: string;
  link: string;
  displayLink: string;
  formattedUrl: string;
}

class AIContentService {
  private openai: OpenAI;
  private xaiApiKey: string;
  private serpApiKey: string;
  private unsplashApiKey: string;
  private dalleEnabled: boolean;
  private productMatchingService: ProductMatchingService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.xaiApiKey = process.env.XAI_API_KEY || '';
    this.serpApiKey = process.env.SERP_API_KEY || '';
    this.unsplashApiKey = process.env.UNSPLASH_API_KEY || '';
    this.dalleEnabled = process.env.ENABLE_DALLE === 'true';
    this.productMatchingService = new ProductMatchingService();
  }

  // Main method to generate content for a topic
  async generateContentForTopic(topic: string, category: string, keywords: string[] = []): Promise<GeneratedContent> {
    console.log(`Starting content generation for topic: ${topic}`);

    try {
      // Step 1: Research the topic
      const researchResults = await this.conductWebResearch(topic, keywords);
      console.log(`Found ${researchResults.length} research sources`);

      // Step 2: Generate content using AI
      const generatedContent = await this.generateArticleContent(topic, category, keywords, researchResults);
      console.log('Content generation completed');

      return generatedContent;
    } catch (error) {
      console.error('Error in content generation:', error);
      throw error;
    }
  }

  // Conduct web research using multiple sources
  private async conductWebResearch(topic: string, keywords: string[]): Promise<ResearchResult[]> {
    const researchResults: ResearchResult[] = [];
    const searchQueries = this.generateSearchQueries(topic, keywords);

    for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries to avoid rate limits
      try {
        console.log(`Researching query: ${query}`);
        
        // Use SerpAPI for Google search results
        const searchResults = await this.searchGoogle(query);
        
        // Process each search result
        for (const result of searchResults.slice(0, 5)) { // Top 5 results per query
          try {
            const scrapedContent = await this.scrapeWebContent(result.link);
            if (scrapedContent) {
              const researchResult: ResearchResult = {
                title: result.title,
                content: scrapedContent,
                url: result.link,
                relevanceScore: this.calculateRelevanceScore(scrapedContent, topic, keywords),
                credibilityScore: this.calculateCredibilityScore(result.displayLink),
                source: result.displayLink,
              };
              
              // Only add if relevance score is high enough
              if (researchResult.relevanceScore > 0.3) {
                researchResults.push(researchResult);
                
                // Save research source to database
                await this.saveResearchSource(researchResult);
              }
            }
          } catch (error) {
            console.warn(`Failed to scrape ${result.link}:`, error.message);
          }
        }
      } catch (error) {
        console.warn(`Failed to research query "${query}":`, error.message);
      }
    }

    // Sort by relevance and credibility
    return researchResults
      .sort((a, b) => (b.relevanceScore + b.credibilityScore) - (a.relevanceScore + a.credibilityScore))
      .slice(0, 10); // Top 10 sources
  }

  // Generate search queries for comprehensive research
  private generateSearchQueries(topic: string, keywords: string[]): string[] {
    const baseQueries = [
      `${topic} 2025 trends`,
      `${topic} benefits guide`,
      `${topic} best practices`,
      `${topic} sustainability`,
      `${topic} reviews comparison`,
    ];

    // Add keyword-specific queries
    const keywordQueries = keywords.map(keyword => `${topic} ${keyword}`);
    
    // Add ICEPACA-specific queries
    const brandQueries = [
      `reusable ice packs ${topic}`,
      `non-toxic cooling products ${topic}`,
      `eco-friendly ice packs ${topic}`,
    ];

    return [...baseQueries, ...keywordQueries.slice(0, 3), ...brandQueries];
  }

  // Search Google using SerpAPI
  private async searchGoogle(query: string): Promise<WebSearchResult[]> {
    if (!this.serpApiKey) {
      console.warn('SerpAPI key not configured, using mock results');
      return this.getMockSearchResults(query);
    }

    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          q: query,
          api_key: this.serpApiKey,
          engine: 'google',
          num: 10,
          gl: 'us',
          hl: 'en'
        },
        timeout: 10000
      });

      return response.data.organic_results?.map((result: any) => ({
        title: result.title || '',
        snippet: result.snippet || '',
        link: result.link || '',
        displayLink: result.displayed_link || new URL(result.link).hostname,
        formattedUrl: result.link || ''
      })) || [];
    } catch (error) {
      console.warn('SerpAPI search failed, using mock results:', error.message);
      return this.getMockSearchResults(query);
    }
  }

  // Mock search results for development/testing
  private getMockSearchResults(query: string): WebSearchResult[] {
    return [
      {
        title: `${query} - Complete Guide 2025`,
        snippet: `Comprehensive guide about ${query} with latest trends and best practices.`,
        link: 'https://example.com/guide',
        displayLink: 'example.com',
        formattedUrl: 'https://example.com/guide'
      },
      {
        title: `Benefits of ${query} for Outdoor Activities`,
        snippet: `Learn about the benefits and applications of ${query} in outdoor settings.`,
        link: 'https://outdoorlife.com/article',
        displayLink: 'outdoorlife.com',
        formattedUrl: 'https://outdoorlife.com/article'
      }
    ];
  }

  // Scrape content from web pages
  private async scrapeWebContent(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();
      
      // Extract main content
      let content = '';
      const contentSelectors = ['article', 'main', '.content', '.post-content', '.entry-content', 'body'];
      
      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length) {
          content = element.text().trim();
          break;
        }
      }
      
      // Clean up the content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      // Return only if content is substantial
      return content.length > 200 ? content.substring(0, 2000) : null; // Limit to 2000 chars
    } catch (error) {
      console.warn(`Failed to scrape ${url}:`, error.message);
      return null;
    }
  }

  // Calculate relevance score based on keyword matching
  private calculateRelevanceScore(content: string, topic: string, keywords: string[]): number {
    const contentLower = content.toLowerCase();
    const topicWords = topic.toLowerCase().split(' ');
    const allKeywords = [...topicWords, ...keywords.map(k => k.toLowerCase())];
    
    let score = 0;
    let totalPossible = 0;
    
    allKeywords.forEach(keyword => {
      totalPossible += 1;
      if (contentLower.includes(keyword)) {
        score += 1;
      }
    });
    
    return totalPossible > 0 ? score / totalPossible : 0;
  }

  // Calculate credibility score based on domain reputation
  private calculateCredibilityScore(domain: string): number {
    const highCredibilityDomains = [
      'gov', 'edu', 'org', 'wikipedia.org', 'britannica.com', 'nationalgeographic.com',
      'scientificamerican.com', 'nature.com', 'techcrunch.com', 'wired.com'
    ];
    
    const mediumCredibilityDomains = [
      'com', 'net', 'co.uk', 'medium.com', 'forbes.com', 'bloomberg.com'
    ];
    
    const domainLower = domain.toLowerCase();
    
    if (highCredibilityDomains.some(d => domainLower.includes(d))) {
      return 0.9;
    }
    
    if (mediumCredibilityDomains.some(d => domainLower.includes(d))) {
      return 0.7;
    }
    
    return 0.5; // Default score
  }

  // Save research source to database
  private async saveResearchSource(research: ResearchResult): Promise<void> {
    try {
      const existingSource = await ResearchSource.findOne({ url: research.url });
      if (!existingSource) {
        const source = new ResearchSource({
          url: research.url,
          title: research.title,
          content: research.content,
          relevanceScore: research.relevanceScore,
          credibilityScore: research.credibilityScore,
          publishedDate: research.publishedDate,
          source: research.source,
          keywords: [] // Will be populated later if needed
        });
        await source.save();
      }
    } catch (error) {
      console.warn('Failed to save research source:', error.message);
    }
  }

  // Generate article content using AI
  private async generateArticleContent(
    topic: string,
    category: string,
    keywords: string[],
    researchResults: ResearchResult[]
  ): Promise<GeneratedContent> {
    const researchSummary = researchResults
      .slice(0, 5)
      .map(r => `Source: ${r.source}\nContent: ${r.content.substring(0, 300)}...`)
      .join('\n\n');

    const prompt = this.buildContentGenerationPrompt(topic, category, keywords, researchSummary);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a professional content writer specializing in eco-friendly cooling products and outdoor lifestyle. Write engaging, SEO-optimized articles that naturally incorporate product recommendations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      });

      const generatedText = response.choices[0]?.message?.content || '';
      return this.parseGeneratedContent(generatedText, topic, keywords);
    } catch (error) {
      console.error('OpenAI content generation failed:', error);
      // Fallback to structured template
      return this.generateFallbackContent(topic, category, keywords, researchResults);
    }
  }

  // Build the content generation prompt
  private buildContentGenerationPrompt(
    topic: string,
    category: string,
    keywords: string[],
    researchSummary: string
  ): string {
    return `
Create a comprehensive, SEO-optimized blog article about "${topic}" for the ${category} category.

Target keywords: ${keywords.join(', ')}

Research findings:
${researchSummary}

Requirements:
1. 800-1200 words
2. Engaging headline (H1)
3. Clear subheadings (H2, H3)
4. Bullet points for key information
5. Natural keyword integration
6. Include ICEPACA product recommendations where relevant
7. Call-to-action at the end
8. SEO meta title (max 60 chars)
9. SEO meta description (max 160 chars)
10. Featured image description for DALL-E

Format the response as JSON with these fields:
{
  "title": "Article title",
  "excerpt": "Brief summary (200-300 chars)",
  "content": "Full article content with HTML formatting",
  "seoData": {
    "metaTitle": "SEO title",
    "metaDescription": "SEO description",
    "keywords": ["keyword1", "keyword2"]
  },
  "featuredImagePrompt": "DALL-E prompt for featured image",
  "relatedProducts": ["product-slug-1", "product-slug-2"],
  "confidence": 0.85
}
`;
  }

  // Parse the generated content from AI response
  private parseGeneratedContent(generatedText: string, topic: string, keywords: string[]): GeneratedContent {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(generatedText);
      return {
        title: parsed.title || `Ultimate Guide to ${topic}`,
        excerpt: parsed.excerpt || `Discover everything you need to know about ${topic}.`,
        content: parsed.content || this.generateBasicContent(topic),
        seoData: {
          metaTitle: parsed.seoData?.metaTitle || parsed.title?.substring(0, 60) || topic,
          metaDescription: parsed.seoData?.metaDescription || parsed.excerpt?.substring(0, 160) || '',
          keywords: parsed.seoData?.keywords || keywords
        },
        featuredImagePrompt: parsed.featuredImagePrompt || `Professional photo of ${topic} in outdoor setting`,
        relatedProducts: parsed.relatedProducts || ['small-pack', 'medium-pack'],
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      // If JSON parsing fails, extract content manually
      return this.extractContentFromText(generatedText, topic, keywords);
    }
  }

  // Extract content from plain text response
  private extractContentFromText(text: string, topic: string, keywords: string[]): GeneratedContent {
    const lines = text.split('\n').filter(line => line.trim());
    const title = lines[0] || `Complete Guide to ${topic}`;
    const content = text || this.generateBasicContent(topic);
    
    return {
      title,
      excerpt: `Learn everything about ${topic} with our comprehensive guide.`,
      content,
      seoData: {
        metaTitle: title.substring(0, 60),
        metaDescription: `Discover the benefits and applications of ${topic}. Expert tips and product recommendations.`,
        keywords
      },
      featuredImagePrompt: `Professional lifestyle photo showing ${topic} in use`,
      relatedProducts: ['small-pack', 'medium-pack'],
      confidence: 0.6
    };
  }

  // Generate fallback content if AI fails
  private generateFallbackContent(
    topic: string,
    category: string,
    keywords: string[],
    researchResults: ResearchResult[]
  ): GeneratedContent {
    const keyInsights = researchResults
      .slice(0, 3)
      .map(r => r.content.substring(0, 100))
      .join(' ');

    const content = this.generateBasicContent(topic, keyInsights);
    
    return {
      title: `The Ultimate Guide to ${topic} in 2025`,
      excerpt: `Discover the latest trends and best practices for ${topic}. Expert insights and product recommendations.`,
      content,
      seoData: {
        metaTitle: `${topic} Guide 2025 | ICEPACA`,
        metaDescription: `Complete guide to ${topic}. Learn benefits, best practices, and find the perfect cooling solution.`,
        keywords: [...keywords, 'icepaca', '2025', 'guide']
      },
      featuredImagePrompt: `Modern lifestyle photo of ${topic} being used outdoors`,
      relatedProducts: ['small-pack', 'medium-pack', 'adventure-bundle'],
      confidence: 0.5
    };
  }

  // Generate basic content structure
  private generateBasicContent(topic: string, insights: string = ''): string {
    return `
<h1>${topic}: Your Complete Guide</h1>

<p>Welcome to the ultimate guide on ${topic}. In this comprehensive article, we'll explore everything you need to know about this important topic.</p>

<h2>What You Need to Know About ${topic}</h2>

<p>${insights || `Understanding ${topic} is essential for making informed decisions. Let's dive into the key aspects you should consider.`}</p>

<h3>Key Benefits</h3>
<ul>
<li>Improved efficiency and performance</li>
<li>Cost-effective solution</li>
<li>Environmentally friendly option</li>
<li>Versatile applications</li>
</ul>

<h2>Best Practices and Tips</h2>

<p>To get the most out of ${topic}, consider these expert recommendations:</p>

<h3>Getting Started</h3>
<p>Begin with the basics and gradually build your understanding and application.</p>

<h3>Advanced Techniques</h3>
<p>Once you're comfortable with the fundamentals, explore these advanced strategies.</p>

<h2>Product Recommendations</h2>

<p>For the best results with ${topic}, we recommend our ICEPACA cooling products:</p>

<ul>
<li><strong>ICEPACA Small Pack</strong> - Perfect for everyday use</li>
<li><strong>ICEPACA Medium Pack</strong> - Ideal for longer activities</li>
<li><strong>ICEPACA Adventure Bundle</strong> - Complete solution for serious adventurers</li>
</ul>

<h2>Conclusion</h2>

<p>Understanding ${topic} can significantly improve your experience and outcomes. With the right knowledge and tools, you'll be well-equipped to succeed.</p>

<p><strong>Ready to get started?</strong> <a href="/shop">Shop our cooling products now</a> and discover the ICEPACA difference!</p>
`;
  }

  // Generate featured image using DALL-E
  async generateFeaturedImage(prompt: string): Promise<string | null> {
    if (!this.dalleEnabled) {
      return await this.getStockImage(prompt);
    }

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: `${prompt}, high quality, professional photography style, bright lighting, clean composition`,
        size: '1792x1024',
        quality: 'hd',
        n: 1,
      });

      return response.data[0]?.url || null;
    } catch (error) {
      console.error('DALL-E image generation failed:', error);
      return await this.getStockImage(prompt);
    }
  }

  // Get stock image as fallback
  private async getStockImage(prompt: string): Promise<string | null> {
    if (!this.unsplashApiKey) {
      return '/images/blog-placeholder.jpg'; // Default placeholder
    }

    try {
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query: prompt,
          per_page: 1,
          orientation: 'landscape'
        },
        headers: {
          'Authorization': `Client-ID ${this.unsplashApiKey}`
        }
      });

      return response.data.results[0]?.urls?.regular || '/images/blog-placeholder.jpg';
    } catch (error) {
      console.warn('Unsplash API failed:', error.message);
      return '/images/blog-placeholder.jpg';
    }
  }

  // Process content queue items
  async processContentQueue(): Promise<void> {
    console.log('Processing content generation queue...');

    const queueItems = await ContentQueue.find({
      status: 'queued',
      scheduledFor: { $lte: new Date() }
    }).limit(5); // Process 5 items at a time

    for (const item of queueItems) {
      try {
        await this.processQueueItem(item);
      } catch (error) {
        console.error(`Failed to process queue item ${item._id}:`, error);
        await this.handleQueueError(item, error.message);
      }
    }
  }

  // Process individual queue item
  private async processQueueItem(item: IContentQueue): Promise<void> {
    console.log(`Processing queue item: ${item.topic}`);

    // Update status to researching
    item.status = 'researching';
    await item.save();

    // Generate content
    const generatedContent = await this.generateContentForTopic(
      item.topic,
      item.category.toString(),
      item.keywords
    );

    // Generate featured image
    const featuredImageUrl = await this.generateFeaturedImage(generatedContent.featuredImagePrompt);

    // Update queue item with generated content
    item.status = 'reviewing';
    item.generatedContent = generatedContent;
    await item.save();

    // Create blog post (pending approval)
    const blogPost = new BlogPost({
      title: generatedContent.title,
      excerpt: generatedContent.excerpt,
      content: generatedContent.content,
      featuredImage: {
        url: featuredImageUrl || '/images/blog-placeholder.jpg',
        alt: generatedContent.title,
        source: featuredImageUrl?.includes('openai') ? 'dalle' : 'stock',
        generationPrompt: generatedContent.featuredImagePrompt
      },
      author: process.env.AI_AUTHOR_ID || '000000000000000000000000', // Default AI author
      categories: [item.category],
      tags: item.keywords,
      seoData: generatedContent.seoData,
      status: 'pending_approval',
      scheduledFor: item.scheduledFor,
      readingTime: Math.ceil(generatedContent.content.length / 1000), // Rough estimate
      relatedProducts: [], // Will be populated based on product matching
      aiGenerated: {
        isAIGenerated: true,
        researchSources: [], // Could populate from research results
        generationPrompt: item.topic,
        model: 'openai',
        confidence: generatedContent.confidence,
        reviewStatus: 'pending'
      }
    });

    await blogPost.save();
    console.log(`Created blog post: ${blogPost.title}`);
    
    // Automatically generate product recommendations
    try {
      console.log('Generating product recommendations for new blog post...');
      const productMatches = await this.productMatchingService.findRelatedProducts(blogPost, 5);
      
      if (productMatches.length > 0) {
        const relatedProductIds = productMatches.map(match => match.product._id);
        
        blogPost.relatedProducts = relatedProductIds;
        blogPost.cro = {
          relatedProducts: productMatches.map(match => ({
            productId: match.product._id,
            relevanceScore: match.relevanceScore,
            matchReason: match.matchReason,
            suggestedPosition: match.suggestedPosition,
            clicks: 0,
            conversions: 0,
            lastUpdated: new Date()
          })),
          productClickThroughs: 0,
          productConversions: 0,
          revenueGenerated: 0
        };
        
        await blogPost.save();
        console.log(`Added ${productMatches.length} product recommendations to blog post`);
      }
    } catch (error) {
      console.warn('Failed to generate product recommendations:', error);
      // Don't fail the entire process if product matching fails
    }
  }

  // Handle queue processing errors
  private async handleQueueError(item: IContentQueue, error: string): Promise<void> {
    item.retryCount += 1;
    item.errorLog = item.errorLog || [];
    item.errorLog.push(`${new Date().toISOString()}: ${error}`);

    if (item.retryCount >= item.maxRetries) {
      item.status = 'failed';
    } else {
      item.status = 'queued'; // Retry later
    }

    await item.save();
  }
}

export default AIContentService;
export { AIContentService, GeneratedContent, ResearchResult };