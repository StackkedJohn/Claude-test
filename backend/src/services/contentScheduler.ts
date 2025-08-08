import cron from 'node-cron';
import { ContentQueue, BlogCategory } from '../models/Blog';
import AIContentService from './aiContentService';
import { logger } from '../utils/logger';

interface ContentTemplate {
  topic: string;
  category: string;
  keywords: string[];
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: number; // 0-6, where 0 is Sunday
  timeOfDay: string; // '09:00' format
}

class ContentScheduler {
  private aiContentService: AIContentService;
  private isRunning: boolean = false;
  private contentTemplates: ContentTemplate[] = [];
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.aiContentService = new AIContentService();
    this.initializeContentTemplates();
    this.setupCronJobs();
  }

  // Initialize predefined content templates
  private async initializeContentTemplates(): Promise<void> {
    try {
      // Get category IDs
      const categories = await BlogCategory.find({ isActive: true }).lean();
      const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c._id.toString()]));

      this.contentTemplates = [
        // Cooling Tips Category
        {
          topic: '2025 trends in reusable cooling products',
          category: categoryMap.get('cooling tips') || '',
          keywords: ['reusable ice packs', 'cooling trends 2025', 'eco cooling', 'icepaca review 2025'],
          frequency: 'weekly',
          dayOfWeek: 1, // Monday
          timeOfDay: '09:00'
        },
        {
          topic: 'benefits of non-toxic ice packs for camping',
          category: categoryMap.get('cooling tips') || '',
          keywords: ['non-toxic ice packs', 'camping cooling', 'safe ice packs', 'outdoor cooling'],
          frequency: 'weekly',
          dayOfWeek: 3, // Wednesday
          timeOfDay: '10:00'
        },
        {
          topic: 'how to keep food fresh during long hiking trips',
          category: categoryMap.get('cooling tips') || '',
          keywords: ['hiking food storage', 'trail cooling', 'backpacking ice packs', 'food safety hiking'],
          frequency: 'biweekly',
          dayOfWeek: 5, // Friday
          timeOfDay: '11:00'
        },
        
        // Adventure Stories Category
        {
          topic: 'epic outdoor adventures with reliable cooling gear',
          category: categoryMap.get('adventure stories') || '',
          keywords: ['outdoor adventures', 'camping stories', 'cooling gear adventures', 'wilderness cooling'],
          frequency: 'weekly',
          dayOfWeek: 2, // Tuesday
          timeOfDay: '14:00'
        },
        {
          topic: 'summer camping tips for hot weather destinations',
          category: categoryMap.get('adventure stories') || '',
          keywords: ['summer camping', 'hot weather camping', 'desert camping', 'cooling strategies'],
          frequency: 'monthly',
          dayOfWeek: 0, // Sunday
          timeOfDay: '15:00'
        },
        
        // Eco Living Category
        {
          topic: 'sustainable cooling solutions for environmentally conscious consumers',
          category: categoryMap.get('eco living') || '',
          keywords: ['sustainable cooling', 'eco-friendly products', 'green cooling', 'environmental cooling'],
          frequency: 'weekly',
          dayOfWeek: 4, // Thursday
          timeOfDay: '08:00'
        },
        {
          topic: 'reducing plastic waste with reusable cooling products',
          category: categoryMap.get('eco living') || '',
          keywords: ['plastic waste reduction', 'reusable products', 'eco alternatives', 'sustainable living'],
          frequency: 'biweekly',
          dayOfWeek: 6, // Saturday
          timeOfDay: '12:00'
        },
        
        // Seasonal Content
        {
          topic: 'preparing your cooling gear for summer adventures',
          category: categoryMap.get('cooling tips') || '',
          keywords: ['summer preparation', 'cooling gear maintenance', 'summer cooling tips', 'gear prep'],
          frequency: 'monthly',
          dayOfWeek: 1, // Monday
          timeOfDay: '07:00'
        },
        {
          topic: 'winter storage and maintenance of ice packs',
          category: categoryMap.get('cooling tips') || '',
          keywords: ['winter storage', 'ice pack maintenance', 'off-season care', 'gear storage'],
          frequency: 'monthly',
          dayOfWeek: 3, // Wednesday
          timeOfDay: '16:00'
        },
        
        // Product-focused Content
        {
          topic: 'comparing ice pack sizes for different outdoor activities',
          category: categoryMap.get('cooling tips') || '',
          keywords: ['ice pack sizes', 'activity cooling', 'icepaca comparison', 'cooling capacity'],
          frequency: 'monthly',
          dayOfWeek: 2, // Tuesday
          timeOfDay: '13:00'
        }
      ];

      logger.info(`Initialized ${this.contentTemplates.length} content templates`);
    } catch (error) {
      logger.error('Failed to initialize content templates:', error);
    }
  }

  // Setup cron jobs for content generation
  private setupCronJobs(): void {
    try {
      // Main content processing job - runs every hour
      const processingJob = cron.schedule('0 * * * *', async () => {
        if (!this.isRunning) {
          this.isRunning = true;
          try {
            await this.processContentQueue();
            await this.scheduleNewContent();
          } catch (error) {
            logger.error('Error in content processing cron:', error);
          } finally {
            this.isRunning = false;
          }
        }
      }, {
        scheduled: true,
        timezone: 'America/New_York'
      });

      this.scheduledJobs.set('processing', processingJob);
      
      // Daily content planning job - runs at midnight
      const planningJob = cron.schedule('0 0 * * *', async () => {
        try {
          await this.planDailyContent();
        } catch (error) {
          logger.error('Error in daily planning cron:', error);
        }
      }, {
        scheduled: true,
        timezone: 'America/New_York'
      });

      this.scheduledJobs.set('planning', planningJob);
      
      // Weekly content strategy review - runs on Sundays at 6 AM
      const strategyJob = cron.schedule('0 6 * * 0', async () => {
        try {
          await this.reviewContentStrategy();
        } catch (error) {
          logger.error('Error in strategy review cron:', error);
        }
      }, {
        scheduled: true,
        timezone: 'America/New_York'
      });

      this.scheduledJobs.set('strategy', strategyJob);

      // Cleanup job - runs daily at 2 AM
      const cleanupJob = cron.schedule('0 2 * * *', async () => {
        try {
          await this.cleanupOldData();
        } catch (error) {
          logger.error('Error in cleanup cron:', error);
        }
      }, {
        scheduled: true,
        timezone: 'America/New_York'
      });

      this.scheduledJobs.set('cleanup', cleanupJob);

      logger.info('Content scheduler cron jobs initialized successfully');
    } catch (error) {
      logger.error('Failed to setup cron jobs:', error);
    }
  }

  // Process existing content queue
  private async processContentQueue(): Promise<void> {
    logger.info('Processing content generation queue...');
    try {
      await this.aiContentService.processContentQueue();
    } catch (error) {
      logger.error('Error processing content queue:', error);
    }
  }

  // Schedule new content based on templates
  private async scheduleNewContent(): Promise<void> {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    logger.info(`Checking for content to schedule (Day: ${currentDay}, Hour: ${currentHour}:${currentMinute})`);

    for (const template of this.contentTemplates) {
      try {
        if (await this.shouldScheduleContent(template, now)) {
          await this.scheduleContentFromTemplate(template, now);
        }
      } catch (error) {
        logger.error(`Error scheduling content for template "${template.topic}":`, error);
      }
    }
  }

  // Check if content should be scheduled based on template frequency
  private async shouldScheduleContent(template: ContentTemplate, now: Date): Promise<boolean> {
    const [hour, minute] = template.timeOfDay.split(':').map(n => parseInt(n));
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    
    // Check if it's the right day and time
    if (template.dayOfWeek !== undefined && template.dayOfWeek !== currentDay) {
      return false;
    }
    
    if (currentHour !== hour) {
      return false;
    }
    
    // Check if we already have recent content for this template
    const recentContentExists = await ContentQueue.findOne({
      topic: template.topic,
      createdAt: {
        $gte: this.getLastScheduleDate(template.frequency, now)
      }
    });
    
    return !recentContentExists;
  }

  // Get the last date this content should have been scheduled
  private getLastScheduleDate(frequency: string, now: Date): Date {
    const date = new Date(now);
    
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() - 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() - 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() - 1);
        break;
    }
    
    return date;
  }

  // Schedule content from template
  private async scheduleContentFromTemplate(template: ContentTemplate, now: Date): Promise<void> {
    try {
      // Add some variation to the topic to keep content fresh
      const variations = await this.generateTopicVariations(template.topic);
      const selectedTopic = variations[0] || template.topic;
      
      // Schedule for immediate processing or slight delay
      const scheduledFor = new Date(now.getTime() + (Math.random() * 30 * 60 * 1000)); // 0-30 minutes delay
      
      const queueItem = new ContentQueue({
        topic: selectedTopic,
        category: template.category,
        keywords: template.keywords,
        scheduledFor,
        targetWordCount: 1000 + Math.floor(Math.random() * 200) // 1000-1200 words
      });
      
      await queueItem.save();
      
      logger.info(`Scheduled content: "${selectedTopic}" for ${scheduledFor.toISOString()}`);
    } catch (error) {
      logger.error(`Failed to schedule content from template:`, error);
    }
  }

  // Generate topic variations to keep content fresh
  private async generateTopicVariations(baseTopic: string): Promise<string[]> {
    const currentYear = new Date().getFullYear();
    const currentSeason = this.getCurrentSeason();
    
    const variations = [
      baseTopic, // Original topic
      `${baseTopic} - ${currentYear} edition`,
      `${currentSeason} guide to ${baseTopic.toLowerCase()}`,
      `expert tips on ${baseTopic.toLowerCase()}`,
      `ultimate ${currentYear} guide to ${baseTopic.toLowerCase()}`,
      `${baseTopic}: what you need to know in ${currentYear}`
    ];
    
    // Add seasonal variations
    const seasonalKeywords = this.getSeasonalKeywords(currentSeason);
    if (seasonalKeywords.length > 0) {
      variations.push(`${baseTopic} for ${seasonalKeywords[0]}`);
    }
    
    return variations;
  }

  // Get current season
  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  // Get seasonal keywords
  private getSeasonalKeywords(season: string): string[] {
    const keywordMap = {
      spring: ['spring activities', 'hiking season', 'camping prep'],
      summer: ['hot weather', 'summer adventures', 'vacation cooling'],
      fall: ['autumn camping', 'harvest season', 'fall activities'],
      winter: ['winter storage', 'off-season maintenance', 'gear care']
    };
    
    return keywordMap[season as keyof typeof keywordMap] || [];
  }

  // Plan daily content based on performance and trends
  private async planDailyContent(): Promise<void> {
    logger.info('Planning daily content...');
    
    try {
      // Analyze recent content performance
      const topPerformingContent = await this.analyzeContentPerformance();
      
      // Generate trending topic ideas
      const trendingTopics = await this.generateTrendingTopics();
      
      // Schedule high-priority content
      for (const topic of trendingTopics.slice(0, 2)) {
        const category = await this.selectBestCategory(topic);
        if (category) {
          const scheduledFor = new Date();
          scheduledFor.setHours(scheduledFor.getHours() + Math.floor(Math.random() * 24) + 1); // Next 1-24 hours
          
          const queueItem = new ContentQueue({
            topic,
            category: category._id,
            keywords: await this.extractKeywords(topic),
            scheduledFor,
            targetWordCount: 1000
          });
          
          await queueItem.save();
          logger.info(`Planned trending content: "${topic}"`);
        }
      }
    } catch (error) {
      logger.error('Error in daily content planning:', error);
    }
  }

  // Analyze content performance to inform future content
  private async analyzeContentPerformance(): Promise<any[]> {
    // This would analyze metrics like views, engagement, conversions
    // For now, return empty array - would be implemented with analytics data
    return [];
  }

  // Generate trending topics based on current events and seasonality
  private async generateTrendingTopics(): Promise<string[]> {
    const currentSeason = this.getCurrentSeason();
    const currentYear = new Date().getFullYear();
    
    // Generate topics based on current context
    const topics = [
      `${currentSeason} cooling solutions for outdoor enthusiasts`,
      `eco-friendly alternatives to traditional ice packs in ${currentYear}`,
      `sustainability trends in outdoor gear ${currentYear}`,
      `best practices for ${currentSeason} food storage while camping`,
      `innovations in reusable cooling technology ${currentYear}`
    ];
    
    return topics;
  }

  // Select the best category for a topic
  private async selectBestCategory(topic: string): Promise<any> {
    const categories = await BlogCategory.find({ isActive: true }).lean();
    
    // Simple keyword matching - could be enhanced with AI
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('tip') || topicLower.includes('cooling') || topicLower.includes('storage')) {
      return categories.find(c => c.name.toLowerCase().includes('cooling tips'));
    }
    
    if (topicLower.includes('adventure') || topicLower.includes('camping') || topicLower.includes('hiking')) {
      return categories.find(c => c.name.toLowerCase().includes('adventure'));
    }
    
    if (topicLower.includes('eco') || topicLower.includes('sustainable') || topicLower.includes('environment')) {
      return categories.find(c => c.name.toLowerCase().includes('eco'));
    }
    
    return categories[0]; // Default to first category
  }

  // Extract keywords from topic
  private async extractKeywords(topic: string): Promise<string[]> {
    const words = topic.toLowerCase().split(' ');
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
    
    const keywords = words
      .filter(word => !stopWords.includes(word) && word.length > 2)
      .slice(0, 5); // Max 5 keywords
    
    // Add ICEPACA brand keywords
    keywords.push('icepaca', 'cooling products', 'ice packs');
    
    return keywords;
  }

  // Review and adjust content strategy weekly
  private async reviewContentStrategy(): Promise<void> {
    logger.info('Reviewing content strategy...');
    
    try {
      // Analyze past week's content performance
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const recentQueue = await ContentQueue.find({
        createdAt: { $gte: weekAgo }
      }).populate('category');
      
      // Log statistics
      const stats = {
        totalGenerated: recentQueue.length,
        successful: recentQueue.filter(q => q.status === 'published').length,
        failed: recentQueue.filter(q => q.status === 'failed').length,
        pending: recentQueue.filter(q => q.status === 'reviewing').length
      };
      
      logger.info('Weekly content statistics:', stats);
      
      // Adjust content templates based on performance if needed
      await this.adjustContentTemplates(stats);
    } catch (error) {
      logger.error('Error in content strategy review:', error);
    }
  }

  // Adjust content templates based on performance
  private async adjustContentTemplates(stats: any): Promise<void> {
    // This could implement logic to adjust frequency, topics, or timing
    // based on performance metrics. For now, just log the stats.
    
    if (stats.failed / stats.totalGenerated > 0.5) {
      logger.warn('High failure rate detected. Consider reviewing content templates or API keys.');
    }
    
    if (stats.successful / stats.totalGenerated > 0.8) {
      logger.info('High success rate. Content generation is working well.');
    }
  }

  // Cleanup old data to prevent database bloat
  private async cleanupOldData(): Promise<void> {
    logger.info('Cleaning up old data...');
    
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      // Clean up old queue items
      const deletedQueue = await ContentQueue.deleteMany({
        status: { $in: ['published', 'failed'] },
        createdAt: { $lt: oneMonthAgo }
      });
      
      // Clean up old research sources
      const { ResearchSource } = await import('../models/Blog');
      const deletedSources = await ResearchSource.deleteMany({
        createdAt: { $lt: oneMonthAgo }
      });
      
      logger.info(`Cleanup completed: ${deletedQueue.deletedCount} queue items, ${deletedSources.deletedCount} research sources`);
    } catch (error) {
      logger.error('Error in data cleanup:', error);
    }
  }

  // Public methods for manual control
  
  public async scheduleContentManually(topic: string, category: string, keywords: string[], scheduledFor: Date): Promise<void> {
    const queueItem = new ContentQueue({
      topic,
      category,
      keywords,
      scheduledFor,
      targetWordCount: 1000
    });
    
    await queueItem.save();
    logger.info(`Manually scheduled content: "${topic}"`);
  }

  public async processQueueManually(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Content processing is already running');
    }
    
    this.isRunning = true;
    try {
      await this.processContentQueue();
    } finally {
      this.isRunning = false;
    }
  }

  public getSchedulerStatus(): any {
    return {
      isRunning: this.isRunning,
      templatesCount: this.contentTemplates.length,
      activeJobs: Array.from(this.scheduledJobs.keys()),
      nextRun: 'Next hour' // Simplified - could calculate actual next run time
    };
  }

  public async stopScheduler(): Promise<void> {
    logger.info('Stopping content scheduler...');
    
    for (const [name, job] of this.scheduledJobs) {
      job.stop();
      logger.info(`Stopped cron job: ${name}`);
    }
    
    this.scheduledJobs.clear();
  }

  public async startScheduler(): Promise<void> {
    logger.info('Starting content scheduler...');
    this.setupCronJobs();
  }
}

// Global instance
const contentScheduler = new ContentScheduler();

export default contentScheduler;
export { ContentScheduler };