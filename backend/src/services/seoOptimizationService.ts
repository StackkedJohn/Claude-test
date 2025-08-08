import { IBlogPost } from '../models/Blog';

interface SEOAnalysis {
  score: number;
  issues: SEOIssue[];
  recommendations: SEORecommendation[];
  metaData: {
    title: string;
    description: string;
    keywords: string[];
    readabilityScore: number;
    wordCount: number;
    headingStructure: HeadingAnalysis;
    imageOptimization: ImageAnalysis;
    linkAnalysis: LinkAnalysis;
  };
}

interface SEOIssue {
  type: 'critical' | 'warning' | 'minor';
  message: string;
  element?: string;
  suggestion: string;
}

interface SEORecommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'content' | 'technical' | 'keywords' | 'meta';
  title: string;
  description: string;
  implementation: string;
}

interface HeadingAnalysis {
  h1Count: number;
  h2Count: number;
  h3Count: number;
  missingH1: boolean;
  properHierarchy: boolean;
  headingsWithKeywords: number;
}

interface ImageAnalysis {
  totalImages: number;
  missingAlt: number;
  oversizedImages: number;
  optimizationScore: number;
}

interface LinkAnalysis {
  internalLinks: number;
  externalLinks: number;
  brokenLinks: string[];
  linkDiversity: number;
}

interface KeywordDensity {
  keyword: string;
  density: number;
  count: number;
  isOptimal: boolean;
}

class SEOOptimizationService {
  // Analyze blog post for SEO optimization
  async analyzeBlogPost(post: IBlogPost): Promise<SEOAnalysis> {
    const issues: SEOIssue[] = [];
    const recommendations: SEORecommendation[] = [];
    
    // Analyze title
    const titleAnalysis = this.analyzeTitleSEO(post.title, post.excerpt);
    issues.push(...titleAnalysis.issues);
    recommendations.push(...titleAnalysis.recommendations);

    // Analyze meta description
    const metaAnalysis = this.analyzeMetaDescription(post.excerpt);
    issues.push(...metaAnalysis.issues);
    recommendations.push(...metaAnalysis.recommendations);

    // Analyze content
    const contentAnalysis = this.analyzeContent(post.content);
    issues.push(...contentAnalysis.issues);
    recommendations.push(...contentAnalysis.recommendations);

    // Analyze keywords
    const keywordAnalysis = this.analyzeKeywords(post.content, post.tags);
    issues.push(...keywordAnalysis.issues);
    recommendations.push(...keywordAnalysis.recommendations);

    // Analyze heading structure
    const headingAnalysis = this.analyzeHeadingStructure(post.content);
    issues.push(...headingAnalysis.issues);
    recommendations.push(...headingAnalysis.recommendations);

    // Analyze images
    const imageAnalysis = this.analyzeImages(post.content);
    issues.push(...imageAnalysis.issues);
    recommendations.push(...imageAnalysis.recommendations);

    // Analyze internal/external links
    const linkAnalysis = this.analyzeLinks(post.content);
    issues.push(...linkAnalysis.issues);
    recommendations.push(...linkAnalysis.recommendations);

    // Calculate readability score
    const readabilityScore = this.calculateReadabilityScore(post.content);

    // Calculate overall SEO score
    const score = this.calculateOverallSEOScore(issues, recommendations);

    return {
      score,
      issues,
      recommendations,
      metaData: {
        title: this.generateOptimizedTitle(post.title, post.tags),
        description: this.generateOptimizedDescription(post.excerpt, post.tags),
        keywords: this.extractOptimizedKeywords(post.content, post.tags),
        readabilityScore,
        wordCount: this.getWordCount(post.content),
        headingStructure: headingAnalysis.analysis,
        imageOptimization: imageAnalysis.analysis,
        linkAnalysis: linkAnalysis.analysis
      }
    };
  }

  // Analyze title for SEO best practices
  private analyzeTitleSEO(title: string, excerpt: string) {
    const issues: SEOIssue[] = [];
    const recommendations: SEORecommendation[] = [];

    // Check title length
    if (title.length < 30) {
      issues.push({
        type: 'warning',
        message: 'Title is too short',
        element: 'title',
        suggestion: 'Consider expanding the title to 50-60 characters for better SEO'
      });
    } else if (title.length > 60) {
      issues.push({
        type: 'critical',
        message: 'Title is too long',
        element: 'title',
        suggestion: 'Shorten the title to under 60 characters to prevent truncation in search results'
      });
    }

    // Check for ICEPACA brand mention
    if (!title.toLowerCase().includes('icepaca')) {
      recommendations.push({
        priority: 'medium',
        category: 'keywords',
        title: 'Include Brand Name',
        description: 'Consider including "ICEPACA" in the title for brand recognition',
        implementation: 'Add "ICEPACA" naturally within the title structure'
      });
    }

    // Check for power words
    const powerWords = ['ultimate', 'complete', 'essential', 'best', 'top', 'revolutionary', 'innovative', 'expert'];
    const hasPowerWord = powerWords.some(word => title.toLowerCase().includes(word));
    
    if (!hasPowerWord) {
      recommendations.push({
        priority: 'low',
        category: 'content',
        title: 'Add Power Words',
        description: 'Include compelling words like "ultimate", "essential", or "complete" to increase click-through rates',
        implementation: 'Naturally incorporate power words that align with your content'
      });
    }

    return { issues, recommendations };
  }

  // Analyze meta description
  private analyzeMetaDescription(excerpt: string) {
    const issues: SEOIssue[] = [];
    const recommendations: SEORecommendation[] = [];

    if (excerpt.length < 120) {
      issues.push({
        type: 'warning',
        message: 'Meta description is too short',
        element: 'meta-description',
        suggestion: 'Expand meta description to 150-160 characters for optimal search result display'
      });
    } else if (excerpt.length > 160) {
      issues.push({
        type: 'critical',
        message: 'Meta description is too long',
        element: 'meta-description',
        suggestion: 'Shorten meta description to under 160 characters to prevent truncation'
      });
    }

    // Check for call-to-action
    const ctaWords = ['discover', 'learn', 'explore', 'find out', 'get started', 'shop now', 'read more'];
    const hasCTA = ctaWords.some(word => excerpt.toLowerCase().includes(word));
    
    if (!hasCTA) {
      recommendations.push({
        priority: 'medium',
        category: 'content',
        title: 'Add Call-to-Action',
        description: 'Include action words in meta description to improve click-through rates',
        implementation: 'Add phrases like "Discover how" or "Learn more about" to encourage clicks'
      });
    }

    return { issues, recommendations };
  }

  // Analyze content structure and quality
  private analyzeContent(content: string) {
    const issues: SEOIssue[] = [];
    const recommendations: SEORecommendation[] = [];
    const wordCount = this.getWordCount(content);

    // Check content length
    if (wordCount < 300) {
      issues.push({
        type: 'critical',
        message: 'Content is too short',
        element: 'content',
        suggestion: 'Expand content to at least 300 words for better search engine visibility'
      });
    } else if (wordCount < 600) {
      recommendations.push({
        priority: 'medium',
        category: 'content',
        title: 'Expand Content Length',
        description: 'Consider expanding to 800+ words for comprehensive coverage and better rankings',
        implementation: 'Add more detailed explanations, examples, or related subtopics'
      });
    }

    // Check for ICEPACA product mentions
    const icePackMentions = (content.match(/ice pack|cooling|freeze|cool/gi) || []).length;
    if (icePackMentions < 2) {
      recommendations.push({
        priority: 'high',
        category: 'keywords',
        title: 'Increase Product-Related Keywords',
        description: 'Mention ice pack related terms more frequently throughout the content',
        implementation: 'Naturally incorporate terms like "ice pack", "cooling solution", "reusable ice pack"'
      });
    }

    return { issues, recommendations };
  }

  // Analyze keywords and keyword density
  private analyzeKeywords(content: string, tags: string[]) {
    const issues: SEOIssue[] = [];
    const recommendations: SEORecommendation[] = [];
    
    const keywordAnalysis = this.calculateKeywordDensity(content, tags);
    
    keywordAnalysis.forEach(keyword => {
      if (keyword.density > 3) {
        issues.push({
          type: 'warning',
          message: `Keyword "${keyword.keyword}" density too high (${keyword.density.toFixed(1)}%)`,
          element: 'content',
          suggestion: 'Reduce keyword usage to avoid appearing spammy to search engines'
        });
      } else if (keyword.density < 0.5 && tags.includes(keyword.keyword)) {
        recommendations.push({
          priority: 'medium',
          category: 'keywords',
          title: `Increase "${keyword.keyword}" Usage`,
          description: `Consider using "${keyword.keyword}" more naturally throughout the content`,
          implementation: 'Include variations and synonyms of the keyword in different sections'
        });
      }
    });

    return { issues, recommendations };
  }

  // Analyze heading structure (H1, H2, H3, etc.)
  private analyzeHeadingStructure(content: string) {
    const issues: SEOIssue[] = [];
    const recommendations: SEORecommendation[] = [];
    
    const h1Matches = content.match(/<h1[^>]*>/gi) || [];
    const h2Matches = content.match(/<h2[^>]*>/gi) || [];
    const h3Matches = content.match(/<h3[^>]*>/gi) || [];

    const analysis: HeadingAnalysis = {
      h1Count: h1Matches.length,
      h2Count: h2Matches.length,
      h3Count: h3Matches.length,
      missingH1: h1Matches.length === 0,
      properHierarchy: true,
      headingsWithKeywords: 0
    };

    // Check for missing H1
    if (analysis.missingH1) {
      issues.push({
        type: 'critical',
        message: 'Missing H1 heading',
        element: 'headings',
        suggestion: 'Add a clear H1 heading to establish the main topic of the content'
      });
    }

    // Check for multiple H1s
    if (analysis.h1Count > 1) {
      issues.push({
        type: 'warning',
        message: 'Multiple H1 headings detected',
        element: 'headings',
        suggestion: 'Use only one H1 heading per page for better SEO structure'
      });
    }

    // Check heading hierarchy
    if (analysis.h3Count > 0 && analysis.h2Count === 0) {
      issues.push({
        type: 'warning',
        message: 'Poor heading hierarchy - H3 without H2',
        element: 'headings',
        suggestion: 'Ensure proper heading hierarchy: H1 → H2 → H3'
      });
      analysis.properHierarchy = false;
    }

    // Recommend more subheadings for long content
    if (this.getWordCount(content) > 800 && analysis.h2Count < 3) {
      recommendations.push({
        priority: 'medium',
        category: 'content',
        title: 'Add More Subheadings',
        description: 'Break up long content with H2 and H3 subheadings for better readability',
        implementation: 'Add descriptive subheadings every 200-300 words'
      });
    }

    return { issues, recommendations, analysis };
  }

  // Analyze images for SEO optimization
  private analyzeImages(content: string) {
    const issues: SEOIssue[] = [];
    const recommendations: SEORecommendation[] = [];
    
    const imageMatches = content.match(/<img[^>]*>/gi) || [];
    const imagesWithoutAlt = content.match(/<img(?![^>]*alt=)[^>]*>/gi) || [];
    
    const analysis: ImageAnalysis = {
      totalImages: imageMatches.length,
      missingAlt: imagesWithoutAlt.length,
      oversizedImages: 0,
      optimizationScore: 0
    };

    // Check for missing alt text
    if (analysis.missingAlt > 0) {
      issues.push({
        type: 'critical',
        message: `${analysis.missingAlt} image(s) missing alt text`,
        element: 'images',
        suggestion: 'Add descriptive alt text to all images for accessibility and SEO'
      });
    }

    // Calculate optimization score
    if (analysis.totalImages > 0) {
      analysis.optimizationScore = ((analysis.totalImages - analysis.missingAlt) / analysis.totalImages) * 100;
    } else {
      analysis.optimizationScore = 100;
    }

    // Recommend adding images if none exist
    if (analysis.totalImages === 0 && this.getWordCount(content) > 300) {
      recommendations.push({
        priority: 'medium',
        category: 'content',
        title: 'Add Relevant Images',
        description: 'Include images to improve user engagement and break up text',
        implementation: 'Add product photos, infographics, or relevant illustrations with proper alt text'
      });
    }

    return { issues, recommendations, analysis };
  }

  // Analyze internal and external links
  private analyzeLinks(content: string) {
    const issues: SEOIssue[] = [];
    const recommendations: SEORecommendation[] = [];
    
    const allLinks = content.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi) || [];
    const internalLinks = allLinks.filter(link => 
      link.includes('icepaca.com') || link.startsWith('href="/')
    );
    const externalLinks = allLinks.filter(link => 
      link.includes('http') && !link.includes('icepaca.com')
    );

    const analysis: LinkAnalysis = {
      internalLinks: internalLinks.length,
      externalLinks: externalLinks.length,
      brokenLinks: [], // Would need actual link checking
      linkDiversity: (new Set(allLinks)).size / allLinks.length || 0
    };

    // Check for sufficient internal linking
    if (analysis.internalLinks < 2 && this.getWordCount(content) > 500) {
      recommendations.push({
        priority: 'high',
        category: 'technical',
        title: 'Add Internal Links',
        description: 'Link to related products, blog posts, or relevant pages to improve SEO and user engagement',
        implementation: 'Add 2-3 contextual links to relevant ICEPACA products or content'
      });
    }

    // Check for external authority links
    if (analysis.externalLinks === 0 && this.getWordCount(content) > 600) {
      recommendations.push({
        priority: 'medium',
        category: 'technical',
        title: 'Add Authority Links',
        description: 'Link to authoritative sources to support your claims and improve content credibility',
        implementation: 'Add 1-2 links to reputable sources that support your content claims'
      });
    }

    return { issues, recommendations, analysis };
  }

  // Calculate readability score (simplified Flesch Reading Ease)
  private calculateReadabilityScore(content: string): number {
    const text = this.stripHtml(content);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = this.getWordCount(content);
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, score));
  }

  // Generate optimized title suggestions
  private generateOptimizedTitle(currentTitle: string, tags: string[]): string {
    const icpacaKeywords = ['reusable ice pack', 'cooling solution', 'eco-friendly', 'ice pack'];
    const relevantTag = tags.find(tag => icpacaKeywords.some(keyword => tag.toLowerCase().includes(keyword.toLowerCase())));
    
    if (relevantTag && !currentTitle.toLowerCase().includes('icepaca')) {
      return `${currentTitle} | ICEPACA ${relevantTag}`;
    }
    
    return currentTitle.length < 60 ? `${currentTitle} | ICEPACA` : currentTitle;
  }

  // Generate optimized meta description
  private generateOptimizedDescription(currentDescription: string, tags: string[]): string {
    const cta = currentDescription.includes('Discover') ? '' : ' Discover more about ICEPACA\'s innovative solutions.';
    return currentDescription.length + cta.length <= 160 ? currentDescription + cta : currentDescription;
  }

  // Extract and optimize keywords
  private extractOptimizedKeywords(content: string, tags: string[]): string[] {
    const baseKeywords = ['ICEPACA', 'reusable ice pack', 'eco-friendly cooling', 'sustainable ice pack'];
    const contentKeywords = this.extractKeywords(content);
    const allKeywords = [...baseKeywords, ...tags, ...contentKeywords];
    
    return [...new Set(allKeywords)].slice(0, 10);
  }

  // Calculate keyword density
  private calculateKeywordDensity(content: string, keywords: string[]): KeywordDensity[] {
    const text = this.stripHtml(content).toLowerCase();
    const wordCount = this.getWordCount(content);
    
    return keywords.map(keyword => {
      const keywordCount = (text.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      const density = (keywordCount / wordCount) * 100;
      
      return {
        keyword,
        density,
        count: keywordCount,
        isOptimal: density >= 0.5 && density <= 2.5
      };
    });
  }

  // Calculate overall SEO score
  private calculateOverallSEOScore(issues: SEOIssue[], recommendations: SEORecommendation[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.type) {
        case 'critical':
          score -= 15;
          break;
        case 'warning':
          score -= 8;
          break;
        case 'minor':
          score -= 3;
          break;
      }
    });

    // Bonus points for following best practices (fewer recommendations = better)
    const highPriorityRecommendations = recommendations.filter(r => r.priority === 'high').length;
    score -= highPriorityRecommendations * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  // Helper methods
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  private getWordCount(content: string): number {
    return this.stripHtml(content).split(/\s+/).filter(word => word.length > 0).length;
  }

  private countSyllables(text: string): number {
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiouy]+/g, 'a')
      .replace(/a{2,}/g, 'a')
      .split('a').length - 1 || 1;
  }

  private extractKeywords(content: string): string[] {
    const text = this.stripHtml(content).toLowerCase();
    const words = text.split(/\s+/);
    const wordFreq: { [key: string]: number } = {};
    
    // Count word frequency (excluding common stop words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those']);
    
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }
}

export default new SEOOptimizationService();
export { SEOOptimizationService, SEOAnalysis, SEOIssue, SEORecommendation };