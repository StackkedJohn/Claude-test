import { Product } from '../models/Product';
import { BlogPost } from '../models/BlogPost';
import OpenAI from 'openai';
import axios from 'axios';

interface MetaData {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterCard: 'summary' | 'summary_large_image';
}

interface SchemaMarkup {
  type: 'Product' | 'Article' | 'Organization' | 'WebSite' | 'BreadcrumbList' | 'FAQPage';
  data: any;
}

interface SEOConfig {
  siteName: string;
  siteUrl: string;
  defaultOgImage: string;
  brandKeywords: string[];
  companyName: string;
}

class SEOService {
  private openai: OpenAI | null = null;
  private config: SEOConfig;

  constructor() {
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    this.config = {
      siteName: 'ICEPACA',
      siteUrl: process.env.FRONTEND_URL || 'https://icepaca.com',
      defaultOgImage: '/images/og-default.jpg',
      brandKeywords: ['ICEPACA', 'ice packs', 'reusable ice packs', 'cooler ice packs', 'eco-friendly cooling'],
      companyName: 'ICEPACA LLC'
    };
  }

  // Generate meta data for products
  async generateProductMeta(productId: string): Promise<MetaData> {
    try {
      const product = await Product.findById(productId).lean();
      if (!product) {
        throw new Error('Product not found');
      }

      // AI-generated description if OpenAI is available
      let aiDescription = '';
      if (this.openai && product.description) {
        try {
          const prompt = `Create a compelling 150-character SEO meta description for this ice pack product:
          
Product: ${product.name}
Description: ${product.description}
Features: ${product.features?.join(', ') || 'N/A'}
Use Cases: ${product.recommendations?.useCases?.join(', ') || 'N/A'}

Focus on benefits, sustainability, and specific use cases. Make it compelling for search engines.`;

          const response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100,
            temperature: 0.7
          });

          aiDescription = response.choices[0]?.message?.content?.trim() || '';
        } catch (error) {
          console.error('OpenAI meta description generation failed:', error);
        }
      }

      // Fallback to manual description
      const description = aiDescription || this.generateManualDescription(product);
      
      // Generate keywords
      const keywords = this.generateProductKeywords(product);

      // Generate title
      const title = `${product.name} - ${this.config.siteName}`;
      const ogTitle = `${product.name} | ${this.config.siteName} Reusable Ice Packs`;

      return {
        title,
        description: description.slice(0, 160), // Ensure under 160 chars
        keywords,
        ogTitle,
        ogDescription: description,
        ogImage: product.images?.[0]?.url || this.config.defaultOgImage,
        ogUrl: `${this.config.siteUrl}/products/${product._id}`,
        twitterTitle: ogTitle,
        twitterDescription: description,
        twitterCard: 'summary_large_image'
      };
    } catch (error) {
      console.error('Error generating product meta:', error);
      return this.getDefaultProductMeta();
    }
  }

  // Generate meta data for blog posts
  async generateBlogMeta(blogId: string): Promise<MetaData> {
    try {
      const blog = await BlogPost.findById(blogId).lean();
      if (!blog) {
        throw new Error('Blog post not found');
      }

      // AI-generated description if available
      let aiDescription = '';
      if (this.openai && blog.content) {
        try {
          const contentPreview = blog.content.slice(0, 500);
          const prompt = `Create a compelling 150-character SEO meta description for this blog post about ice packs and cooling:
          
Title: ${blog.title}
Content Preview: ${contentPreview}...

Make it engaging and include relevant keywords like "ice packs", "cooling", "sustainable", etc.`;

          const response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 80,
            temperature: 0.7
          });

          aiDescription = response.choices[0]?.message?.content?.trim() || '';
        } catch (error) {
          console.error('OpenAI blog meta generation failed:', error);
        }
      }

      const description = aiDescription || blog.excerpt || blog.content.slice(0, 150);
      const keywords = this.generateBlogKeywords(blog);

      const title = `${blog.title} - ${this.config.siteName} Blog`;
      const ogTitle = blog.title;

      return {
        title,
        description: description.slice(0, 160),
        keywords,
        ogTitle,
        ogDescription: description,
        ogImage: blog.featuredImage || this.config.defaultOgImage,
        ogUrl: `${this.config.siteUrl}/blog/${blog.slug}`,
        twitterTitle: ogTitle,
        twitterDescription: description,
        twitterCard: 'summary_large_image'
      };
    } catch (error) {
      console.error('Error generating blog meta:', error);
      return this.getDefaultBlogMeta();
    }
  }

  // Generate product schema markup
  async generateProductSchema(productId: string): Promise<SchemaMarkup> {
    try {
      const product = await Product.findById(productId).populate('reviews').lean();
      if (!product) {
        throw new Error('Product not found');
      }

      // Calculate review statistics
      const reviews = (product as any).reviews || [];
      const reviewCount = reviews.length;
      const averageRating = reviewCount > 0 
        ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviewCount 
        : 0;

      const schemaData = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        brand: {
          '@type': 'Brand',
          name: this.config.companyName
        },
        category: product.category,
        image: product.images?.map(img => `${this.config.siteUrl}${img.url}`) || [],
        sku: product._id.toString(),
        offers: {
          '@type': 'Offer',
          url: `${this.config.siteUrl}/products/${product._id}`,
          priceCurrency: 'USD',
          price: product.price,
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          availability: product.stock?.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: this.config.companyName
          }
        },
        aggregateRating: reviewCount > 0 ? {
          '@type': 'AggregateRating',
          ratingValue: averageRating.toFixed(1),
          reviewCount: reviewCount
        } : undefined,
        review: reviews.slice(0, 5).map((review: any) => ({
          '@type': 'Review',
          author: {
            '@type': 'Person',
            name: review.author?.name || 'Anonymous'
          },
          reviewRating: {
            '@type': 'Rating',
            ratingValue: review.rating
          },
          reviewBody: review.comment
        })),
        additionalProperty: [
          {
            '@type': 'PropertyValue',
            name: 'Dimensions',
            value: `${product.dimensions?.width}"W × ${product.dimensions?.height}"H × ${product.dimensions?.depth}"D`
          },
          {
            '@type': 'PropertyValue',
            name: 'Weight',
            value: `${product.weight?.value} ${product.weight?.unit}`
          },
          {
            '@type': 'PropertyValue',
            name: 'Material',
            value: product.specifications?.material || 'Food-safe TPU'
          }
        ],
        sustainability: product.sustainability ? {
          '@type': 'PropertyValue',
          name: 'Sustainability',
          value: `Saves ${product.sustainability.carbonSavedPerUse}kg CO2 per use, reusable ${product.sustainability.reusabilityCount} times`
        } : undefined
      };

      return {
        type: 'Product',
        data: schemaData
      };
    } catch (error) {
      console.error('Error generating product schema:', error);
      return {
        type: 'Product',
        data: {}
      };
    }
  }

  // Generate blog article schema
  async generateBlogSchema(blogId: string): Promise<SchemaMarkup> {
    try {
      const blog = await BlogPost.findById(blogId).populate('author').lean();
      if (!blog) {
        throw new Error('Blog post not found');
      }

      const schemaData = {
        '@context': 'https://schema.org/',
        '@type': 'Article',
        headline: blog.title,
        description: blog.excerpt || blog.content.slice(0, 200),
        image: blog.featuredImage ? `${this.config.siteUrl}${blog.featuredImage}` : undefined,
        author: {
          '@type': 'Person',
          name: (blog as any).author?.name || 'ICEPACA Team',
          url: `${this.config.siteUrl}/authors/${(blog as any).author?._id || 'team'}`
        },
        publisher: {
          '@type': 'Organization',
          name: this.config.companyName,
          logo: {
            '@type': 'ImageObject',
            url: `${this.config.siteUrl}/images/logo.png`
          }
        },
        datePublished: blog.publishedAt?.toISOString() || blog.createdAt?.toISOString(),
        dateModified: blog.updatedAt?.toISOString(),
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${this.config.siteUrl}/blog/${blog.slug}`
        },
        articleSection: blog.category || 'Ice Pack Tips',
        keywords: blog.tags?.join(', ') || '',
        wordCount: blog.content.split(' ').length,
        about: {
          '@type': 'Thing',
          name: 'Reusable Ice Packs'
        }
      };

      return {
        type: 'Article',
        data: schemaData
      };
    } catch (error) {
      console.error('Error generating blog schema:', error);
      return {
        type: 'Article',
        data: {}
      };
    }
  }

  // Generate organization schema
  generateOrganizationSchema(): SchemaMarkup {
    const schemaData = {
      '@context': 'https://schema.org/',
      '@type': 'Organization',
      name: this.config.companyName,
      url: this.config.siteUrl,
      logo: `${this.config.siteUrl}/images/logo.png`,
      description: 'Leading manufacturer of eco-friendly, reusable ice packs for coolers, lunch boxes, and outdoor adventures.',
      foundingDate: '2020',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+1-555-ICEPACA',
        contactType: 'Customer Service',
        email: 'support@icepaca.com'
      },
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'US'
      },
      sameAs: [
        'https://www.facebook.com/icepaca',
        'https://www.instagram.com/icepaca',
        'https://twitter.com/icepaca'
      ],
      makesOffer: {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Product',
          name: 'Reusable Ice Packs',
          category: 'Cooling Products'
        }
      }
    };

    return {
      type: 'Organization',
      data: schemaData
    };
  }

  // Generate website schema
  generateWebsiteSchema(): SchemaMarkup {
    const schemaData = {
      '@context': 'https://schema.org/',
      '@type': 'WebSite',
      name: this.config.siteName,
      url: this.config.siteUrl,
      description: 'Premium reusable ice packs for eco-friendly cooling. Perfect for coolers, lunch boxes, and outdoor adventures.',
      publisher: {
        '@type': 'Organization',
        name: this.config.companyName
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.config.siteUrl}/search?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };

    return {
      type: 'WebSite',
      data: schemaData
    };
  }

  // Generate breadcrumb schema
  generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>): SchemaMarkup {
    const schemaData = {
      '@context': 'https://schema.org/',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: `${this.config.siteUrl}${crumb.url}`
      }))
    };

    return {
      type: 'BreadcrumbList',
      data: schemaData
    };
  }

  // Generate FAQ schema for product pages
  generateProductFAQSchema(productId: string): SchemaMarkup {
    const commonFAQs = [
      {
        question: 'How long do ICEPACA ice packs stay cold?',
        answer: 'Our ice packs stay cold for 6-24 hours depending on the size and environmental conditions. The large pack can maintain cooling for up to 24 hours in a well-insulated cooler.'
      },
      {
        question: 'Are ICEPACA ice packs safe and non-toxic?',
        answer: 'Yes, all ICEPACA ice packs are made with food-safe materials and contain non-toxic gel that is safe even if accidentally punctured. They are FDA approved for use with food products.'
      },
      {
        question: 'How many times can I reuse ICEPACA ice packs?',
        answer: 'Our ice packs are designed for over 1000 uses. With proper care, they can last for years, making them an eco-friendly and cost-effective alternative to single-use ice.'
      },
      {
        question: 'How do I clean and maintain my ice packs?',
        answer: 'Simply wipe clean with a damp cloth or wash with mild soap and water. Allow to dry completely before freezing. Store in freezer when not in use.'
      },
      {
        question: 'What sizes are available?',
        answer: 'We offer three sizes: Small (perfect for lunch boxes), Medium (ideal for coolers), and Large (great for extended trips). We also offer an Adventure Bundle with all three sizes.'
      }
    ];

    const schemaData = {
      '@context': 'https://schema.org/',
      '@type': 'FAQPage',
      mainEntity: commonFAQs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };

    return {
      type: 'FAQPage',
      data: schemaData
    };
  }

  // Generate keywords for products
  private generateProductKeywords(product: any): string[] {
    const keywords = [...this.config.brandKeywords];
    
    // Add product-specific keywords
    if (product.name) keywords.push(product.name.toLowerCase());
    if (product.category) keywords.push(product.category.toLowerCase());
    if (product.tags) keywords.push(...product.tags.map((tag: string) => tag.toLowerCase()));
    
    // Add use case keywords
    if (product.recommendations?.useCases) {
      keywords.push(...product.recommendations.useCases.map((useCase: string) => useCase.toLowerCase()));
    }

    // Add feature-based keywords
    keywords.push(
      'non-toxic ice pack',
      'reusable cooling pack',
      'eco-friendly ice pack',
      'food safe ice pack',
      'leak proof ice pack'
    );

    return [...new Set(keywords)]; // Remove duplicates
  }

  // Generate keywords for blog posts
  private generateBlogKeywords(blog: any): string[] {
    const keywords = [...this.config.brandKeywords];
    
    if (blog.tags) keywords.push(...blog.tags.map((tag: string) => tag.toLowerCase()));
    if (blog.category) keywords.push(blog.category.toLowerCase());
    
    // Add content-based keywords
    keywords.push(
      'ice pack tips',
      'cooling solutions',
      'outdoor cooling',
      'sustainable cooling',
      'cooler maintenance'
    );

    return [...new Set(keywords)];
  }

  // Generate manual description fallback
  private generateManualDescription(product: any): string {
    const useCases = product.recommendations?.useCases?.slice(0, 2).join(' and ') || 'cooling needs';
    const keyFeature = product.features?.[0] || 'premium quality';
    
    return `${product.name} - ${keyFeature}. Perfect for ${useCases}. Eco-friendly, reusable, and long-lasting cooling solution from ICEPACA.`;
  }

  // Default meta data fallbacks
  private getDefaultProductMeta(): MetaData {
    return {
      title: `Premium Reusable Ice Packs - ${this.config.siteName}`,
      description: 'Eco-friendly reusable ice packs for coolers, lunch boxes, and outdoor adventures. Long-lasting, non-toxic, and leak-proof cooling solutions.',
      keywords: this.config.brandKeywords,
      ogTitle: `Premium Reusable Ice Packs - ${this.config.siteName}`,
      ogDescription: 'Discover eco-friendly cooling solutions with ICEPACA reusable ice packs.',
      ogImage: this.config.defaultOgImage,
      ogUrl: this.config.siteUrl,
      twitterTitle: `Premium Reusable Ice Packs - ${this.config.siteName}`,
      twitterDescription: 'Eco-friendly cooling solutions for all your adventures.',
      twitterCard: 'summary_large_image'
    };
  }

  private getDefaultBlogMeta(): MetaData {
    return {
      title: `Ice Pack Tips & Cooling Solutions - ${this.config.siteName} Blog`,
      description: 'Expert tips, guides, and advice about reusable ice packs, cooling solutions, and outdoor adventures from the ICEPACA team.',
      keywords: [...this.config.brandKeywords, 'ice pack tips', 'cooling advice', 'outdoor cooling'],
      ogTitle: `Ice Pack Tips & Cooling Solutions - ${this.config.siteName} Blog`,
      ogDescription: 'Expert advice and tips for getting the most out of your cooling solutions.',
      ogImage: this.config.defaultOgImage,
      ogUrl: `${this.config.siteUrl}/blog`,
      twitterTitle: `Ice Pack Tips & Cooling Solutions - ${this.config.siteName} Blog`,
      twitterDescription: 'Expert cooling advice and ice pack tips.',
      twitterCard: 'summary_large_image'
    };
  }

  // Analyze competitor SEO (if URLs provided)
  async analyzeCompetitorSEO(competitorUrls: string[]): Promise<any> {
    const analyses = [];

    for (const url of competitorUrls) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SEO-Analyzer/1.0)'
          }
        });

        const html = response.data;
        
        // Extract basic SEO elements
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i);
        const keywordsMatch = html.match(/<meta[^>]*name=["\']keywords["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i);
        
        analyses.push({
          url,
          title: titleMatch ? titleMatch[1] : null,
          description: descMatch ? descMatch[1] : null,
          keywords: keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()) : [],
          titleLength: titleMatch ? titleMatch[1].length : 0,
          descriptionLength: descMatch ? descMatch[1].length : 0
        });
      } catch (error) {
        console.error(`Error analyzing ${url}:`, error);
        analyses.push({
          url,
          error: 'Failed to analyze'
        });
      }
    }

    return analyses;
  }

  // Generate SEO recommendations
  generateSEORecommendations(analysis: any): string[] {
    const recommendations = [];

    if (analysis.titleLength > 60) {
      recommendations.push('Consider shortening the page title to under 60 characters for better search display.');
    }

    if (analysis.descriptionLength > 160) {
      recommendations.push('Meta description should be under 160 characters for optimal search display.');
    }

    if (analysis.descriptionLength < 120) {
      recommendations.push('Consider expanding the meta description to 120-160 characters to provide more context.');
    }

    if (!analysis.keywords || analysis.keywords.length < 3) {
      recommendations.push('Add more relevant keywords to improve search visibility.');
    }

    return recommendations;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Test OpenAI connection if available
      if (this.openai) {
        await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5
        });
      }
      return true;
    } catch (error) {
      console.error('SEO service health check failed:', error);
      return false;
    }
  }
}

export default new SEOService();