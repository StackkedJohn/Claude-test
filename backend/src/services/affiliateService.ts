import { User } from '../models/User';
import { Product } from '../models/Product';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

interface AffiliateApplication {
  userId?: string;
  email: string;
  name: string;
  website?: string;
  socialMedia: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    blog?: string;
  };
  audienceSize: number;
  niche: string;
  promotionMethods: string[];
  reasonForJoining: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date;
  reviewedAt?: Date;
  reviewNotes?: string;
}

interface AffiliateProfile {
  userId: string;
  affiliateId: string;
  status: 'active' | 'inactive' | 'suspended';
  commissionRate: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  joinDate: Date;
  totalEarnings: number;
  unpaidEarnings: number;
  totalSales: number;
  totalClicks: number;
  conversionRate: number;
  paymentInfo: {
    method: 'paypal' | 'bank' | 'stripe';
    details: { [key: string]: any };
  };
  socialProfiles: AffiliateApplication['socialMedia'];
  performanceMetrics: {
    last30Days: {
      clicks: number;
      sales: number;
      earnings: number;
      conversionRate: number;
    };
    allTime: {
      clicks: number;
      sales: number;
      earnings: number;
      topProduct: string;
    };
  };
}

interface AffiliateLink {
  id: string;
  affiliateId: string;
  productId?: string;
  campaignId?: string;
  originalUrl: string;
  affiliateUrl: string;
  shortCode: string;
  clickCount: number;
  conversionCount: number;
  createdAt: Date;
  isActive: boolean;
  customName?: string;
  utmParams: {
    source: string;
    medium: string;
    campaign: string;
    content?: string;
    term?: string;
  };
}

interface AffiliateCommission {
  id: string;
  affiliateId: string;
  orderId: string;
  productId: string;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  createdAt: Date;
  paidAt?: Date;
  paymentId?: string;
}

interface AffiliateCampaign {
  id: string;
  name: string;
  description: string;
  productIds: string[];
  commissionRate: number;
  bonusCommission?: number;
  startDate: Date;
  endDate: Date;
  targetAudience: string[];
  materials: {
    banners: string[];
    productImages: string[];
    copyTemplates: string[];
    videoContent?: string[];
  };
  requirements: string[];
  isActive: boolean;
  participantCount: number;
  totalSales: number;
}

class AffiliateService {
  private baseUrl: string;
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'https://icepaca.com';
    
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Affiliate Application Management
  async submitApplication(applicationData: Omit<AffiliateApplication, 'status' | 'appliedAt'>): Promise<string> {
    try {
      const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const application: AffiliateApplication = {
        ...applicationData,
        status: 'pending',
        appliedAt: new Date()
      };

      // In production, save to database
      console.log('Affiliate application submitted:', application);

      // Send confirmation email
      await this.sendApplicationConfirmationEmail(application);

      // Notify admin
      await this.notifyAdminOfNewApplication(application);

      return applicationId;
    } catch (error) {
      console.error('Error submitting affiliate application:', error);
      throw error;
    }
  }

  async reviewApplication(applicationId: string, decision: 'approved' | 'rejected', notes?: string): Promise<boolean> {
    try {
      // In production, update application in database
      const application: AffiliateApplication = {
        userId: 'user123',
        email: 'affiliate@example.com',
        name: 'Sample Affiliate',
        socialMedia: {},
        audienceSize: 10000,
        niche: 'outdoor',
        promotionMethods: ['social media'],
        reasonForJoining: 'Love the products',
        status: decision,
        appliedAt: new Date(),
        reviewedAt: new Date(),
        reviewNotes: notes
      };

      if (decision === 'approved') {
        // Create affiliate profile
        const affiliateProfile = await this.createAffiliateProfile(application);
        await this.sendApprovalEmail(application, affiliateProfile);
      } else {
        await this.sendRejectionEmail(application, notes);
      }

      return true;
    } catch (error) {
      console.error('Error reviewing affiliate application:', error);
      return false;
    }
  }

  // Affiliate Profile Management
  async createAffiliateProfile(application: AffiliateApplication): Promise<AffiliateProfile> {
    const affiliateId = this.generateAffiliateId();
    
    const profile: AffiliateProfile = {
      userId: application.userId || 'temp_user',
      affiliateId,
      status: 'active',
      commissionRate: this.getInitialCommissionRate(application.audienceSize, application.niche),
      tier: this.getInitialTier(application.audienceSize),
      joinDate: new Date(),
      totalEarnings: 0,
      unpaidEarnings: 0,
      totalSales: 0,
      totalClicks: 0,
      conversionRate: 0,
      paymentInfo: {
        method: 'paypal',
        details: {}
      },
      socialProfiles: application.socialMedia,
      performanceMetrics: {
        last30Days: {
          clicks: 0,
          sales: 0,
          earnings: 0,
          conversionRate: 0
        },
        allTime: {
          clicks: 0,
          sales: 0,
          earnings: 0,
          topProduct: ''
        }
      }
    };

    // In production, save to database
    console.log('Created affiliate profile:', profile);

    return profile;
  }

  private generateAffiliateId(): string {
    return `ICE${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private getInitialCommissionRate(audienceSize: number, niche: string): number {
    let baseRate = 10; // 10% base commission

    // Audience size bonus
    if (audienceSize > 100000) baseRate += 5;
    else if (audienceSize > 50000) baseRate += 3;
    else if (audienceSize > 10000) baseRate += 2;

    // Niche relevance bonus
    const relevantNiches = ['outdoor', 'camping', 'sustainability', 'zero-waste', 'eco-friendly'];
    if (relevantNiches.includes(niche.toLowerCase())) {
      baseRate += 3;
    }

    return Math.min(baseRate, 20); // Cap at 20%
  }

  private getInitialTier(audienceSize: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (audienceSize > 100000) return 'gold';
    if (audienceSize > 50000) return 'silver';
    return 'bronze';
  }

  // Affiliate Link Management
  async generateAffiliateLink(affiliateId: string, productId?: string, campaignId?: string, customName?: string): Promise<AffiliateLink> {
    try {
      const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const shortCode = crypto.randomBytes(4).toString('hex');
      
      let originalUrl = this.baseUrl;
      if (productId) {
        originalUrl += `/products/${productId}`;
      }

      const utmParams = {
        source: 'affiliate',
        medium: 'referral',
        campaign: campaignId || 'general',
        content: affiliateId,
        term: productId
      };

      const queryString = new URLSearchParams(utmParams as any).toString();
      const affiliateUrl = `${originalUrl}?${queryString}`;

      const link: AffiliateLink = {
        id: linkId,
        affiliateId,
        productId,
        campaignId,
        originalUrl,
        affiliateUrl,
        shortCode,
        clickCount: 0,
        conversionCount: 0,
        createdAt: new Date(),
        isActive: true,
        customName,
        utmParams
      };

      // In production, save to database
      console.log('Generated affiliate link:', link);

      return link;
    } catch (error) {
      console.error('Error generating affiliate link:', error);
      throw error;
    }
  }

  async trackClick(shortCode: string, userAgent: string, ipAddress: string): Promise<void> {
    try {
      // In production, update click count and track analytics
      console.log(`Affiliate click tracked: ${shortCode} from ${ipAddress}`);
      
      // Could implement click fraud detection here
      // Could store detailed analytics (location, device, etc.)
    } catch (error) {
      console.error('Error tracking affiliate click:', error);
    }
  }

  // Commission Management
  async calculateCommission(orderId: string, affiliateId: string): Promise<AffiliateCommission | null> {
    try {
      // In production, fetch order and affiliate details from database
      const mockOrder = {
        id: orderId,
        total: 45.99,
        productId: 'product123',
        affiliateId
      };

      const mockAffiliate: AffiliateProfile = {
        userId: 'user123',
        affiliateId,
        commissionRate: 12,
        status: 'active' as const,
        tier: 'silver',
        joinDate: new Date(),
        totalEarnings: 0,
        unpaidEarnings: 0,
        totalSales: 0,
        totalClicks: 0,
        conversionRate: 0,
        paymentInfo: { method: 'paypal', details: {} },
        socialProfiles: {},
        performanceMetrics: {
          last30Days: { clicks: 0, sales: 0, earnings: 0, conversionRate: 0 },
          allTime: { clicks: 0, sales: 0, earnings: 0, topProduct: '' }
        }
      };

      const commissionAmount = (mockOrder.total * mockAffiliate.commissionRate) / 100;

      const commission: AffiliateCommission = {
        id: `comm_${Date.now()}`,
        affiliateId,
        orderId,
        productId: mockOrder.productId,
        saleAmount: mockOrder.total,
        commissionRate: mockAffiliate.commissionRate,
        commissionAmount,
        status: 'pending',
        createdAt: new Date()
      };

      // In production, save to database
      console.log('Commission calculated:', commission);

      return commission;
    } catch (error) {
      console.error('Error calculating commission:', error);
      return null;
    }
  }

  async processCommissionPayments(affiliateIds: string[]): Promise<{ successful: string[]; failed: string[] }> {
    const successful: string[] = [];
    const failed: string[] = [];

    for (const affiliateId of affiliateIds) {
      try {
        // In production, integrate with payment processor
        const paymentResult = await this.processAffiliatePayment(affiliateId);
        
        if (paymentResult.success) {
          successful.push(affiliateId);
          await this.sendPaymentConfirmationEmail(affiliateId, paymentResult.amount);
        } else {
          failed.push(affiliateId);
        }
      } catch (error) {
        console.error(`Error processing payment for ${affiliateId}:`, error);
        failed.push(affiliateId);
      }
    }

    return { successful, failed };
  }

  private async processAffiliatePayment(affiliateId: string): Promise<{ success: boolean; amount: number; paymentId?: string }> {
    // Mock payment processing
    const amount = Math.random() * 500 + 50; // Random amount between $50-$550
    
    return {
      success: Math.random() > 0.1, // 90% success rate for demo
      amount,
      paymentId: `pay_${Date.now()}`
    };
  }

  // Campaign Management
  async createCampaign(campaignData: Omit<AffiliateCampaign, 'id' | 'participantCount' | 'totalSales'>): Promise<string> {
    try {
      const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      const campaign: AffiliateCampaign = {
        ...campaignData,
        id: campaignId,
        participantCount: 0,
        totalSales: 0
      };

      // In production, save to database
      console.log('Created affiliate campaign:', campaign);

      // Notify eligible affiliates
      await this.notifyAffiliatesOfCampaign(campaign);

      return campaignId;
    } catch (error) {
      console.error('Error creating affiliate campaign:', error);
      throw error;
    }
  }

  // ICEPACA-Specific Campaign Templates
  async createICEPACACampaigns(): Promise<string[]> {
    const campaigns = [
      {
        name: 'Summer Adventure Campaign',
        description: 'Promote ICEPACA ice packs for summer camping and outdoor activities',
        productIds: ['small-pack', 'medium-pack', 'large-pack', 'adventure-bundle'],
        commissionRate: 15,
        bonusCommission: 5, // Extra 5% for hitting targets
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31'),
        targetAudience: ['outdoor enthusiasts', 'campers', 'adventure bloggers'],
        materials: {
          banners: [
            '/affiliate/banners/summer-adventure-728x90.jpg',
            '/affiliate/banners/summer-adventure-300x250.jpg'
          ],
          productImages: [
            '/affiliate/products/icepaca-camping-lifestyle.jpg',
            '/affiliate/products/icepaca-cooler-demo.jpg'
          ],
          copyTemplates: [
            'Keep your adventures cool with ICEPACA! No more soggy sandwiches or warm drinks.',
            'Ditch the messy ice and upgrade to ICEPACA reusable cooling packs.',
            '1000+ uses, zero waste. The sustainable choice for outdoor lovers.'
          ],
          videoContent: [
            '/affiliate/videos/icepaca-camping-demo.mp4'
          ]
        },
        requirements: [
          'Must create authentic content showing real usage',
          'Include sustainability messaging',
          'Minimum 48-hour posting schedule',
          'Must disclose affiliate relationship'
        ],
        isActive: true
      },
      {
        name: 'Back to School Lunch Pack',
        description: 'Target parents looking for reliable lunch box cooling solutions',
        productIds: ['small-pack'],
        commissionRate: 12,
        bonusCommission: 3,
        startDate: new Date('2024-08-01'),
        endDate: new Date('2024-09-30'),
        targetAudience: ['parenting bloggers', 'family influencers', 'school-focused content'],
        materials: {
          banners: [
            '/affiliate/banners/back-to-school-728x90.jpg',
            '/affiliate/banners/lunch-pack-300x250.jpg'
          ],
          productImages: [
            '/affiliate/products/icepaca-lunchbox.jpg',
            '/affiliate/products/icepaca-kids-lunch.jpg'
          ],
          copyTemplates: [
            'Keep school lunches fresh all day with ICEPACA!',
            'No more soggy sandwiches! Parents love ICEPACA for lunch boxes.',
            'Safe, non-toxic, and reusable - perfect for growing families.'
          ]
        },
        requirements: [
          'Focus on family-friendly messaging',
          'Emphasize safety and non-toxic materials',
          'Include money-saving benefits',
          'Target parent demographics'
        ],
        isActive: true
      },
      {
        name: 'Sustainability Champions',
        description: 'Partner with eco-influencers to promote environmental benefits',
        productIds: ['small-pack', 'medium-pack', 'large-pack', 'adventure-bundle'],
        commissionRate: 18,
        bonusCommission: 7,
        startDate: new Date('2024-04-22'), // Earth Day
        endDate: new Date('2024-06-05'), // World Environment Day
        targetAudience: ['sustainability influencers', 'zero-waste advocates', 'eco bloggers'],
        materials: {
          banners: [
            '/affiliate/banners/sustainability-728x90.jpg',
            '/affiliate/banners/eco-friendly-300x250.jpg'
          ],
          productImages: [
            '/affiliate/products/icepaca-sustainability-infographic.jpg',
            '/affiliate/products/icepaca-co2-savings.jpg'
          ],
          copyTemplates: [
            'Save the planet one cooling pack at a time! ICEPACA prevents plastic waste.',
            'Calculate your carbon savings with ICEPACA reusable ice packs.',
            'Join the zero-waste movement with ICEPACA sustainable cooling.'
          ]
        },
        requirements: [
          'Must include environmental impact statistics',
          'Highlight carbon footprint reduction',
          'Show long-term cost savings',
          'Educational content about sustainability'
        ],
        isActive: true
      }
    ];

    const campaignIds: string[] = [];
    for (const campaignData of campaigns) {
      const id = await this.createCampaign(campaignData);
      campaignIds.push(id);
    }

    return campaignIds;
  }

  // Analytics and Reporting
  async getAffiliateAnalytics(affiliateId: string, days: number = 30): Promise<any> {
    try {
      // In production, fetch real analytics from database
      const mockAnalytics = {
        overview: {
          totalClicks: Math.floor(Math.random() * 1000) + 100,
          totalConversions: Math.floor(Math.random() * 50) + 5,
          totalEarnings: Math.floor(Math.random() * 500) + 50,
          conversionRate: Math.random() * 10 + 2,
          averageOrderValue: Math.random() * 100 + 30
        },
        topProducts: [
          { name: 'ICEPACA Medium Pack', sales: 12, earnings: 36.50 },
          { name: 'Adventure Bundle', sales: 8, earnings: 72.00 },
          { name: 'ICEPACA Small Pack', sales: 15, earnings: 22.50 }
        ],
        recentActivity: [
          { date: new Date(), type: 'sale', amount: 15.99, product: 'Small Pack' },
          { date: new Date(Date.now() - 86400000), type: 'click', product: 'Medium Pack' },
          { date: new Date(Date.now() - 172800000), type: 'sale', amount: 45.99, product: 'Adventure Bundle' }
        ],
        monthlyTrend: Array.from({ length: 12 }, (_, i) => ({
          month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' }),
          earnings: Math.floor(Math.random() * 200) + 50,
          sales: Math.floor(Math.random() * 20) + 5
        }))
      };

      return mockAnalytics;
    } catch (error) {
      console.error('Error fetching affiliate analytics:', error);
      throw error;
    }
  }

  // Email Notifications
  private async sendApplicationConfirmationEmail(application: AffiliateApplication): Promise<void> {
    const mailOptions = {
      from: '"ICEPACA Affiliate Team" <affiliates@icepaca.com>',
      to: application.email,
      subject: 'Thank you for applying to the ICEPACA Affiliate Program!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Thank you for your interest in partnering with ICEPACA!</h2>
          <p>Hi ${application.name},</p>
          <p>We've received your application to join the ICEPACA Affiliate Program. Our team will review your application and get back to you within 3-5 business days.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>What happens next?</h3>
            <ul>
              <li>Our team reviews your application and social media presence</li>
              <li>We'll check the alignment with ICEPACA's sustainability values</li>
              <li>If approved, you'll receive your affiliate dashboard access</li>
              <li>Start earning commissions on every sale you generate!</li>
            </ul>
          </div>
          
          <p>Thank you for choosing to partner with us in promoting sustainable cooling solutions!</p>
          <p>Best regards,<br>The ICEPACA Affiliate Team</p>
        </div>
      `
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  private async sendApprovalEmail(application: AffiliateApplication, profile: AffiliateProfile): Promise<void> {
    const mailOptions = {
      from: '"ICEPACA Affiliate Team" <affiliates@icepaca.com>',
      to: application.email,
      subject: 'Welcome to the ICEPACA Affiliate Program! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Welcome to the ICEPACA Affiliate Program!</h2>
          <p>Hi ${application.name},</p>
          <p>Congratulations! Your application has been approved. We're excited to have you as an ICEPACA affiliate partner!</p>
          
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your Affiliate Details:</h3>
            <ul>
              <li><strong>Affiliate ID:</strong> ${profile.affiliateId}</li>
              <li><strong>Commission Rate:</strong> ${profile.commissionRate}%</li>
              <li><strong>Tier:</strong> ${profile.tier.toUpperCase()}</li>
            </ul>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Getting Started:</h3>
            <ol>
              <li>Log into your affiliate dashboard: <a href="${this.baseUrl}/affiliate/dashboard">${this.baseUrl}/affiliate/dashboard</a></li>
              <li>Generate your unique affiliate links</li>
              <li>Download marketing materials and product images</li>
              <li>Start promoting and earning commissions!</li>
            </ol>
          </div>
          
          <p>We can't wait to see the amazing content you create!</p>
          <p>Best regards,<br>The ICEPACA Affiliate Team</p>
        </div>
      `
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  private async sendRejectionEmail(application: AffiliateApplication, reason?: string): Promise<void> {
    const mailOptions = {
      from: '"ICEPACA Affiliate Team" <affiliates@icepaca.com>',
      to: application.email,
      subject: 'Update on your ICEPACA Affiliate Application',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Thank you for your interest in ICEPACA</h2>
          <p>Hi ${application.name},</p>
          <p>Thank you for applying to the ICEPACA Affiliate Program. After careful review, we've decided not to move forward with your application at this time.</p>
          
          ${reason ? `
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Feedback:</h3>
              <p>${reason}</p>
            </div>
          ` : ''}
          
          <p>We encourage you to reapply in the future as your content and audience grow. We're always looking for passionate advocates of sustainability and outdoor adventures!</p>
          
          <p>Best regards,<br>The ICEPACA Affiliate Team</p>
        </div>
      `
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  private async sendPaymentConfirmationEmail(affiliateId: string, amount: number): Promise<void> {
    // Mock email sending - in production, would send real payment confirmation
    console.log(`Payment confirmation sent to ${affiliateId}: $${amount.toFixed(2)}`);
  }

  private async notifyAdminOfNewApplication(application: AffiliateApplication): Promise<void> {
    // In production, notify admin team of new applications
    console.log('Admin notified of new affiliate application:', application.email);
  }

  private async notifyAffiliatesOfCampaign(campaign: AffiliateCampaign): Promise<void> {
    // In production, notify relevant affiliates about new campaigns
    console.log(`Notifying affiliates about new campaign: ${campaign.name}`);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Test email service
      await this.emailTransporter.verify();
      return true;
    } catch (error) {
      console.error('Affiliate service health check failed:', error);
      return false;
    }
  }
}

export default new AffiliateService();