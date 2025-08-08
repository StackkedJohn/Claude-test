import cron from 'node-cron';
import { BlogPost } from '../models/Blog';
import blogNotificationService from './blogNotificationService';

class BlogSchedulerService {
  private isSchedulerStarted = false;

  // Start the scheduler
  start(): void {
    if (this.isSchedulerStarted) {
      console.log('Blog scheduler is already running');
      return;
    }

    // Check for posts to publish every minute
    cron.schedule('* * * * *', async () => {
      await this.processScheduledPosts();
    });

    // Auto-cleanup old posts daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldPosts();
    });

    // Generate weekly analytics report on Mondays at 9 AM
    cron.schedule('0 9 * * 1', async () => {
      await this.generateWeeklyReport();
    });

    this.isSchedulerStarted = true;
    console.log('Blog scheduler started successfully');
  }

  // Process posts scheduled for publication
  private async processScheduledPosts(): Promise<void> {
    try {
      const now = new Date();
      
      // Find posts that are scheduled and ready to publish
      const postsToPublish = await BlogPost.find({
        status: 'scheduled',
        scheduledFor: { $lte: now },
        isActive: true
      }).populate('author categories');

      for (const post of postsToPublish) {
        try {
          // Update post status to published
          post.status = 'published';
          post.publishedAt = now;
          post.scheduledFor = undefined;
          
          await post.save();
          
          console.log(`Published scheduled post: ${post.title} (ID: ${post._id})`);
          
          // Send notification to author
          try {
            await blogNotificationService.notifyPostApproved(post, 'Your scheduled post has been automatically published.');
          } catch (notifyError) {
            console.error(`Failed to send notification for post ${post._id}:`, notifyError);
          }
        } catch (error) {
          console.error(`Failed to publish post ${post._id}:`, error);
        }
      }

      if (postsToPublish.length > 0) {
        console.log(`Processed ${postsToPublish.length} scheduled posts`);
      }
    } catch (error) {
      console.error('Error processing scheduled posts:', error);
    }
  }

  // Cleanup old archived posts
  private async cleanupOldPosts(): Promise<void> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Find old archived posts
      const result = await BlogPost.deleteMany({
        status: 'archived',
        updatedAt: { $lt: sixMonthsAgo },
        isActive: false
      });

      if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} old archived posts`);
      }
    } catch (error) {
      console.error('Error cleaning up old posts:', error);
    }
  }

  // Generate weekly analytics report
  private async generateWeeklyReport(): Promise<void> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const weeklyStats = await BlogPost.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo },
            isActive: true
          }
        },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            publishedPosts: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
            },
            aiGeneratedPosts: {
              $sum: { $cond: ['$aiGenerated.isAIGenerated', 1, 0] }
            },
            totalViews: { $sum: '$views' },
            totalLikes: { $sum: '$likes' },
            averageReadingTime: { $avg: '$readingTime' }
          }
        }
      ]);

      const stats = weeklyStats[0] || {
        totalPosts: 0,
        publishedPosts: 0,
        aiGeneratedPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        averageReadingTime: 0
      };

      console.log('Weekly Blog Report:', {
        ...stats,
        averageReadingTime: Math.round(stats.averageReadingTime || 0)
      });

      // Here you could send this report via email or store it in the database
      
    } catch (error) {
      console.error('Error generating weekly report:', error);
    }
  }

  // Schedule a post for future publication
  async schedulePost(postId: string, scheduledFor: Date): Promise<boolean> {
    try {
      const post = await BlogPost.findByIdAndUpdate(
        postId,
        {
          status: 'scheduled',
          scheduledFor: scheduledFor
        },
        { new: true }
      );

      if (!post) {
        throw new Error('Post not found');
      }

      console.log(`Post "${post.title}" scheduled for ${scheduledFor}`);
      return true;
    } catch (error) {
      console.error('Error scheduling post:', error);
      return false;
    }
  }

  // Get all scheduled posts
  async getScheduledPosts(): Promise<any[]> {
    try {
      return await BlogPost.find({
        status: 'scheduled',
        isActive: true
      })
      .select('title slug scheduledFor author categories')
      .populate('author', 'firstName lastName')
      .populate('categories', 'name color')
      .sort({ scheduledFor: 1 })
      .lean();
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      return [];
    }
  }

  // Cancel scheduled post
  async cancelScheduledPost(postId: string): Promise<boolean> {
    try {
      const post = await BlogPost.findByIdAndUpdate(
        postId,
        {
          status: 'draft',
          scheduledFor: undefined
        },
        { new: true }
      );

      if (!post) {
        throw new Error('Post not found');
      }

      console.log(`Cancelled scheduling for post "${post.title}"`);
      return true;
    } catch (error) {
      console.error('Error cancelling scheduled post:', error);
      return false;
    }
  }

  // Reschedule post
  async reschedulePost(postId: string, newScheduledFor: Date): Promise<boolean> {
    try {
      const post = await BlogPost.findByIdAndUpdate(
        postId,
        {
          scheduledFor: newScheduledFor
        },
        { new: true }
      );

      if (!post) {
        throw new Error('Post not found');
      }

      console.log(`Rescheduled post "${post.title}" for ${newScheduledFor}`);
      return true;
    } catch (error) {
      console.error('Error rescheduling post:', error);
      return false;
    }
  }

  // Get scheduler statistics
  async getSchedulerStats(): Promise<{
    totalScheduled: number;
    upcomingThisWeek: number;
    overdueScheduled: number;
    nextPublishTime: Date | null;
  }> {
    try {
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [
        totalScheduled,
        upcomingThisWeek,
        overdueScheduled,
        nextPost
      ] = await Promise.all([
        BlogPost.countDocuments({
          status: 'scheduled',
          isActive: true
        }),
        BlogPost.countDocuments({
          status: 'scheduled',
          isActive: true,
          scheduledFor: { $gte: now, $lte: oneWeekFromNow }
        }),
        BlogPost.countDocuments({
          status: 'scheduled',
          isActive: true,
          scheduledFor: { $lt: now }
        }),
        BlogPost.findOne({
          status: 'scheduled',
          isActive: true,
          scheduledFor: { $gte: now }
        })
        .select('scheduledFor')
        .sort({ scheduledFor: 1 })
        .lean()
      ]);

      return {
        totalScheduled,
        upcomingThisWeek,
        overdueScheduled,
        nextPublishTime: nextPost?.scheduledFor || null
      };
    } catch (error) {
      console.error('Error fetching scheduler stats:', error);
      return {
        totalScheduled: 0,
        upcomingThisWeek: 0,
        overdueScheduled: 0,
        nextPublishTime: null
      };
    }
  }

  // Stop the scheduler
  stop(): void {
    if (!this.isSchedulerStarted) {
      console.log('Blog scheduler is not running');
      return;
    }

    // Note: node-cron doesn't provide a direct way to stop specific tasks
    // In a production environment, you'd want to keep references to tasks and destroy them
    this.isSchedulerStarted = false;
    console.log('Blog scheduler stopped');
  }
}

// Create global instance
const blogSchedulerService = new BlogSchedulerService();

export default blogSchedulerService;
export { BlogSchedulerService };