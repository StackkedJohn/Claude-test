import nodemailer from 'nodemailer';
import { BlogPost, IBlogPost } from '../models/Blog';
import { User } from '../models/User';

interface BlogNotificationOptions {
  to: string[];
  subject: string;
  template: 'new-post-approval' | 'post-approved' | 'post-rejected' | 'batch-generation-complete';
  data: any;
}

class BlogNotificationService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter(): void {
    try {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('Blog email notifications disabled: SMTP credentials not configured');
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      this.isConfigured = true;
      console.log('Blog email notifications configured successfully');
    } catch (error) {
      console.error('Failed to configure blog email notifications:', error);
    }
  }

  // Send notification for new post awaiting approval
  async notifyNewPostForApproval(post: IBlogPost): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const admins = await User.find({ role: 'admin', isActive: true }).select('email firstName lastName').lean();
      if (admins.length === 0) return;

      const adminEmails = admins.map(admin => admin.email);
      const postUrl = `${process.env.FRONTEND_URL}/admin/blog?tab=approval`;

      await this.sendNotification({
        to: adminEmails,
        subject: `New ${post.aiGenerated.isAIGenerated ? 'AI-Generated' : 'Manual'} Post Awaiting Approval`,
        template: 'new-post-approval',
        data: {
          post: {
            title: post.title,
            excerpt: post.excerpt,
            author: await User.findById(post.author).select('firstName lastName').lean(),
            isAIGenerated: post.aiGenerated.isAIGenerated,
            confidence: post.aiGenerated.confidence,
            createdAt: post.createdAt,
            categories: post.categories
          },
          approvalUrl: postUrl,
          adminName: 'Admin'
        }
      });
    } catch (error) {
      console.error('Failed to send new post approval notification:', error);
    }
  }

  // Send notification when post is approved
  async notifyPostApproved(post: IBlogPost, adminNotes?: string): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const author = await User.findById(post.author).select('email firstName lastName').lean();
      if (!author) return;

      const postUrl = `${process.env.FRONTEND_URL}/blog/${post.slug}`;

      await this.sendNotification({
        to: [author.email],
        subject: `Your Blog Post "${post.title}" Has Been Approved`,
        template: 'post-approved',
        data: {
          post: {
            title: post.title,
            publishedAt: post.publishedAt || new Date()
          },
          author: {
            firstName: author.firstName,
            lastName: author.lastName
          },
          postUrl,
          adminNotes
        }
      });
    } catch (error) {
      console.error('Failed to send post approved notification:', error);
    }
  }

  // Send notification when post is rejected
  async notifyPostRejected(post: IBlogPost, adminNotes?: string): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const author = await User.findById(post.author).select('email firstName lastName').lean();
      if (!author) return;

      await this.sendNotification({
        to: [author.email],
        subject: `Your Blog Post "${post.title}" Needs Revision`,
        template: 'post-rejected',
        data: {
          post: {
            title: post.title,
            excerpt: post.excerpt
          },
          author: {
            firstName: author.firstName,
            lastName: author.lastName
          },
          adminNotes,
          editUrl: `${process.env.FRONTEND_URL}/admin/blog`
        }
      });
    } catch (error) {
      console.error('Failed to send post rejected notification:', error);
    }
  }

  // Send notification using template
  private async sendNotification(options: BlogNotificationOptions): Promise<void> {
    if (!this.transporter || !this.isConfigured) return;

    try {
      const htmlContent = this.generateEmailContent(options.template, options.data);
      const textContent = this.generateTextContent(options.template, options.data);

      const mailOptions = {
        from: `"ICEPACA Blog" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: options.to.join(', '),
        subject: options.subject,
        text: textContent,
        html: htmlContent
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Blog email notification sent: ${options.subject}`);
    } catch (error) {
      console.error('Failed to send blog email notification:', error);
    }
  }

  // Generate HTML email content based on template
  private generateEmailContent(template: string, data: any): string {
    const baseStyles = `
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e1e5e9; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .meta { background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
        .ai-badge { background: #8b5cf6; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; }
      </style>
    `;

    switch (template) {
      case 'new-post-approval':
        return `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="header">
              <h1>New Blog Post Awaiting Approval</h1>
            </div>
            <div class="content">
              <p>Hi ${data.adminName},</p>
              <p>A new ${data.post.isAIGenerated ? '<span class="ai-badge">AI-Generated</span>' : 'manual'} blog post is ready for your review:</p>
              
              <div class="meta">
                <h3>${data.post.title}</h3>
                <p><strong>Excerpt:</strong> ${data.post.excerpt}</p>
                <p><strong>Author:</strong> ${data.post.author?.firstName} ${data.post.author?.lastName}</p>
                ${data.post.isAIGenerated ? `<p><strong>AI Confidence:</strong> ${Math.round(data.post.confidence * 100)}%</p>` : ''}
                <p><strong>Created:</strong> ${new Date(data.post.createdAt).toLocaleDateString()}</p>
              </div>
              
              <p>Please review this post and approve or reject it for publication.</p>
              
              <a href="${data.approvalUrl}" class="button">Review Post</a>
            </div>
            <div class="footer">
              <p>This is an automated notification from the ICEPACA Blog system.</p>
            </div>
          </body>
          </html>
        `;

      case 'post-approved':
        return `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="header">
              <h1>Your Blog Post Has Been Approved!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.author.firstName},</p>
              <p>Great news! Your blog post "${data.post.title}" has been approved and is now live on the ICEPACA blog.</p>
              
              ${data.adminNotes ? `
                <div class="meta">
                  <h4>Admin Notes:</h4>
                  <p>${data.adminNotes}</p>
                </div>
              ` : ''}
              
              <p>Your post is now accessible to readers and will help drive engagement and sales.</p>
              
              <a href="${data.postUrl}" class="button">View Published Post</a>
            </div>
            <div class="footer">
              <p>Keep up the excellent work creating valuable content for our readers!</p>
            </div>
          </body>
          </html>
        `;

      case 'post-rejected':
        return `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="header" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
              <h1>Blog Post Needs Revision</h1>
            </div>
            <div class="content">
              <p>Hi ${data.author.firstName},</p>
              <p>Your blog post "${data.post.title}" requires some revisions before it can be published.</p>
              
              ${data.adminNotes ? `
                <div class="meta">
                  <h4>Revision Notes:</h4>
                  <p>${data.adminNotes}</p>
                </div>
              ` : ''}
              
              <p>Please review the feedback and make the necessary changes. You can then resubmit the post for approval.</p>
              
              <a href="${data.editUrl}" class="button">Edit Post</a>
            </div>
            <div class="footer">
              <p>We appreciate your understanding and commitment to quality content.</p>
            </div>
          </body>
          </html>
        `;

      default:
        return '<p>Notification content not available.</p>';
    }
  }

  // Generate plain text email content
  private generateTextContent(template: string, data: any): string {
    switch (template) {
      case 'new-post-approval':
        return `
New Blog Post Awaiting Approval

Hi ${data.adminName},

A new ${data.post.isAIGenerated ? 'AI-generated' : 'manual'} blog post is ready for your review:

Title: ${data.post.title}
Author: ${data.post.author?.firstName} ${data.post.author?.lastName}
${data.post.isAIGenerated ? `AI Confidence: ${Math.round(data.post.confidence * 100)}%` : ''}

Please review this post at: ${data.approvalUrl}
        `;

      case 'post-approved':
        return `
Your Blog Post Has Been Approved!

Hi ${data.author.firstName},

Your blog post "${data.post.title}" has been approved and is now live.

${data.adminNotes ? `Admin Notes: ${data.adminNotes}` : ''}

View your published post: ${data.postUrl}
        `;

      case 'post-rejected':
        return `
Blog Post Needs Revision

Hi ${data.author.firstName},

Your blog post "${data.post.title}" requires revisions before publication.

${data.adminNotes ? `Revision Notes: ${data.adminNotes}` : ''}

Edit your post: ${data.editUrl}
        `;

      default:
        return 'Notification content not available.';
    }
  }

  // Test email configuration
  async testConfiguration(): Promise<boolean> {
    if (!this.transporter || !this.isConfigured) return false;

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Blog email configuration test failed:', error);
      return false;
    }
  }
}

// Global instance
const blogNotificationService = new BlogNotificationService();

export default blogNotificationService;
export { BlogNotificationService };