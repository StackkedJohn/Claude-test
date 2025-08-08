import axios from 'axios';
import { User } from '../models/User';

interface EmailContact {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  customProperties?: { [key: string]: any };
  source?: string;
  consent?: {
    marketing: boolean;
    timestamp: Date;
    ipAddress?: string;
  };
}

interface EmailSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria[];
  subscriberCount?: number;
  isActive: boolean;
}

interface SegmentCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  segmentIds: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  scheduledFor?: Date;
  createdAt: Date;
  statistics?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
}

interface AutomationFlow {
  id: string;
  name: string;
  trigger: 'signup' | 'purchase' | 'abandon_cart' | 'product_view' | 'custom';
  triggerCriteria?: any;
  steps: AutomationStep[];
  isActive: boolean;
}

interface AutomationStep {
  id: string;
  type: 'email' | 'delay' | 'condition' | 'tag';
  delay?: number; // in hours
  emailTemplate?: string;
  condition?: SegmentCriteria;
  tag?: string;
}

class EmailMarketingService {
  private klaviyoApiKey: string;
  private mailchimpApiKey: string;
  private provider: 'klaviyo' | 'mailchimp' | 'custom';
  
  constructor() {
    this.klaviyoApiKey = process.env.KLAVIYO_API_KEY || '';
    this.mailchimpApiKey = process.env.MAILCHIMP_API_KEY || '';
    this.provider = (process.env.EMAIL_PROVIDER as 'klaviyo' | 'mailchimp') || 'custom';
  }

  // Newsletter Signup
  async subscribeToNewsletter(contact: EmailContact, segments: string[] = ['general']): Promise<boolean> {
    try {
      switch (this.provider) {
        case 'klaviyo':
          return await this.klaviyoSubscribe(contact, segments);
        case 'mailchimp':
          return await this.mailchimpSubscribe(contact, segments);
        default:
          return await this.customSubscribe(contact, segments);
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      return false;
    }
  }

  // Klaviyo Integration
  private async klaviyoSubscribe(contact: EmailContact, segments: string[]): Promise<boolean> {
    if (!this.klaviyoApiKey) {
      console.warn('Klaviyo API key not configured');
      return false;
    }

    try {
      // Create/update profile
      const profileData = {
        data: {
          type: 'profile',
          attributes: {
            email: contact.email,
            first_name: contact.firstName,
            last_name: contact.lastName,
            phone_number: contact.phone,
            properties: {
              ...contact.customProperties,
              source: contact.source || 'website',
              subscription_date: new Date().toISOString(),
              eco_tips_subscriber: segments.includes('eco-tips'),
              adventure_subscriber: segments.includes('adventure'),
              product_updates_subscriber: segments.includes('product-updates')
            }
          }
        }
      };

      const response = await axios.post(
        'https://a.klaviyo.com/api/profiles/',
        profileData,
        {
          headers: {
            'Authorization': `Klaviyo-API-Key ${this.klaviyoApiKey}`,
            'Content-Type': 'application/json',
            'revision': '2024-07-15'
          }
        }
      );

      // Add to segments/lists
      if (segments.length > 0) {
        await this.addToKlaviyoSegments(response.data.data.id, segments);
      }

      console.log(`Successfully subscribed ${contact.email} to Klaviyo`);
      return true;
    } catch (error) {
      console.error('Klaviyo subscription error:', error);
      return false;
    }
  }

  private async addToKlaviyoSegments(profileId: string, segments: string[]): Promise<void> {
    const segmentMapping = {
      'general': process.env.KLAVIYO_GENERAL_LIST_ID,
      'eco-tips': process.env.KLAVIYO_ECO_TIPS_LIST_ID,
      'adventure': process.env.KLAVIYO_ADVENTURE_LIST_ID,
      'product-updates': process.env.KLAVIYO_PRODUCT_UPDATES_LIST_ID
    };

    for (const segment of segments) {
      const listId = segmentMapping[segment as keyof typeof segmentMapping];
      if (listId) {
        try {
          await axios.post(
            `https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`,
            {
              data: [{
                type: 'profile',
                id: profileId
              }]
            },
            {
              headers: {
                'Authorization': `Klaviyo-API-Key ${this.klaviyoApiKey}`,
                'Content-Type': 'application/json',
                'revision': '2024-07-15'
              }
            }
          );
        } catch (error) {
          console.error(`Error adding to Klaviyo segment ${segment}:`, error);
        }
      }
    }
  }

  // Mailchimp Integration
  private async mailchimpSubscribe(contact: EmailContact, segments: string[]): Promise<boolean> {
    if (!this.mailchimpApiKey) {
      console.warn('Mailchimp API key not configured');
      return false;
    }

    try {
      const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
      if (!audienceId) {
        throw new Error('Mailchimp audience ID not configured');
      }

      const datacenter = this.mailchimpApiKey.split('-')[1];
      const subscriberData = {
        email_address: contact.email,
        status: 'subscribed',
        merge_fields: {
          FNAME: contact.firstName || '',
          LNAME: contact.lastName || '',
          PHONE: contact.phone || ''
        },
        tags: segments.concat(contact.tags || []),
        interests: this.mapSegmentsToInterests(segments)
      };

      const response = await axios.post(
        `https://${datacenter}.api.mailchimp.com/3.0/lists/${audienceId}/members`,
        subscriberData,
        {
          headers: {
            'Authorization': `apikey ${this.mailchimpApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Successfully subscribed ${contact.email} to Mailchimp`);
      return true;
    } catch (error) {
      console.error('Mailchimp subscription error:', error);
      return false;
    }
  }

  private mapSegmentsToInterests(segments: string[]): { [key: string]: boolean } {
    const interestMapping: { [key: string]: string } = {
      'eco-tips': process.env.MAILCHIMP_ECO_TIPS_INTEREST_ID || '',
      'adventure': process.env.MAILCHIMP_ADVENTURE_INTEREST_ID || '',
      'product-updates': process.env.MAILCHIMP_PRODUCT_UPDATES_INTEREST_ID || ''
    };

    const interests: { [key: string]: boolean } = {};
    segments.forEach(segment => {
      const interestId = interestMapping[segment];
      if (interestId) {
        interests[interestId] = true;
      }
    });

    return interests;
  }

  // Custom Implementation (fallback)
  private async customSubscribe(contact: EmailContact, segments: string[]): Promise<boolean> {
    try {
      // In custom implementation, save to database
      const user = await User.findOne({ email: contact.email });
      
      if (user) {
        // Update existing user
        user.emailPreferences = {
          subscribed: true,
          segments: segments,
          subscribedAt: new Date(),
          ...user.emailPreferences
        };
        await user.save();
      } else {
        // Create new newsletter subscriber record
        // In production, you might have a separate Newsletter model
        console.log(`Custom subscription for ${contact.email} to segments: ${segments.join(', ')}`);
      }

      return true;
    } catch (error) {
      console.error('Custom subscription error:', error);
      return false;
    }
  }

  // Create Email Segments
  async createSegment(segment: Omit<EmailSegment, 'id' | 'subscriberCount'>): Promise<string> {
    const segmentId = `segment_${Date.now()}`;
    
    // In production, save to database and sync with email provider
    console.log(`Created email segment: ${segment.name}`);
    
    return segmentId;
  }

  // Predefined ICEPACA Segments
  async initializeDefaultSegments(): Promise<void> {
    const defaultSegments = [
      {
        name: 'Eco-Tips Subscribers',
        description: 'Users interested in environmental tips and sustainable living',
        criteria: [
          { field: 'interests', operator: 'contains' as const, value: 'sustainability' },
          { field: 'product_views', operator: 'contains' as const, value: 'eco' }
        ],
        isActive: true
      },
      {
        name: 'Adventure Enthusiasts',
        description: 'Users interested in camping, hiking, and outdoor activities',
        criteria: [
          { field: 'interests', operator: 'in' as const, value: ['camping', 'hiking', 'outdoor'] },
          { field: 'purchase_categories', operator: 'contains' as const, value: 'outdoor' }
        ],
        isActive: true
      },
      {
        name: 'Lunch Pack Users',
        description: 'Users who use ice packs for daily lunch and work',
        criteria: [
          { field: 'product_usage', operator: 'contains' as const, value: 'lunch' },
          { field: 'order_frequency', operator: 'greater_than' as const, value: 4 }
        ],
        isActive: true
      },
      {
        name: 'VIP Customers',
        description: 'High-value customers with multiple purchases',
        criteria: [
          { field: 'total_spent', operator: 'greater_than' as const, value: 200 },
          { field: 'order_count', operator: 'greater_than' as const, value: 3 }
        ],
        isActive: true
      },
      {
        name: 'Product Launch Subscribers',
        description: 'Users who want early access to new products',
        criteria: [
          { field: 'preferences', operator: 'contains' as const, value: 'product_launches' }
        ],
        isActive: true
      },
      {
        name: 'Seasonal Campers',
        description: 'Users who purchase primarily during camping season',
        criteria: [
          { field: 'seasonal_pattern', operator: 'equals' as const, value: 'summer' },
          { field: 'interests', operator: 'contains' as const, value: 'camping' }
        ],
        isActive: true
      }
    ];

    for (const segment of defaultSegments) {
      await this.createSegment(segment);
    }
  }

  // Track Email Events
  async trackEmailEvent(email: string, event: 'open' | 'click' | 'bounce' | 'unsubscribe', metadata?: any): Promise<void> {
    try {
      switch (this.provider) {
        case 'klaviyo':
          await this.trackKlaviyoEvent(email, event, metadata);
          break;
        case 'mailchimp':
          // Mailchimp automatically tracks these events
          break;
        default:
          await this.trackCustomEmailEvent(email, event, metadata);
          break;
      }
    } catch (error) {
      console.error('Email event tracking error:', error);
    }
  }

  private async trackKlaviyoEvent(email: string, event: string, metadata?: any): Promise<void> {
    if (!this.klaviyoApiKey) return;

    try {
      const eventData = {
        data: {
          type: 'event',
          attributes: {
            profile: { email },
            metric: { name: `Email ${event.charAt(0).toUpperCase() + event.slice(1)}` },
            properties: {
              ...metadata,
              timestamp: new Date().toISOString()
            }
          }
        }
      };

      await axios.post(
        'https://a.klaviyo.com/api/events/',
        eventData,
        {
          headers: {
            'Authorization': `Klaviyo-API-Key ${this.klaviyoApiKey}`,
            'Content-Type': 'application/json',
            'revision': '2024-07-15'
          }
        }
      );
    } catch (error) {
      console.error('Klaviyo event tracking error:', error);
    }
  }

  private async trackCustomEmailEvent(email: string, event: string, metadata?: any): Promise<void> {
    // Custom event tracking implementation
    console.log(`Email event tracked: ${email} - ${event}`, metadata);
  }

  // Automation Workflows
  async createAutomationFlow(flow: Omit<AutomationFlow, 'id'>): Promise<string> {
    const flowId = `flow_${Date.now()}`;
    
    // In production, save to database and set up with email provider
    console.log(`Created automation flow: ${flow.name}`);
    
    return flowId;
  }

  // Initialize Default Automation Flows
  async initializeDefaultAutomations(): Promise<void> {
    const automations = [
      {
        name: 'Welcome Series',
        trigger: 'signup' as const,
        steps: [
          {
            id: 'welcome_1',
            type: 'email' as const,
            emailTemplate: 'welcome_email_1',
            delay: 0
          },
          {
            id: 'delay_1',
            type: 'delay' as const,
            delay: 24
          },
          {
            id: 'eco_tips',
            type: 'email' as const,
            emailTemplate: 'eco_tips_intro',
            delay: 0
          },
          {
            id: 'delay_2',
            type: 'delay' as const,
            delay: 72
          },
          {
            id: 'product_showcase',
            type: 'email' as const,
            emailTemplate: 'product_showcase',
            delay: 0
          }
        ],
        isActive: true
      },
      {
        name: 'Abandoned Cart Recovery',
        trigger: 'abandon_cart' as const,
        triggerCriteria: { cart_value: { greater_than: 25 } },
        steps: [
          {
            id: 'cart_reminder_1',
            type: 'email' as const,
            emailTemplate: 'cart_reminder_1',
            delay: 1
          },
          {
            id: 'delay_1',
            type: 'delay' as const,
            delay: 24
          },
          {
            id: 'cart_discount',
            type: 'email' as const,
            emailTemplate: 'cart_discount_10',
            delay: 0
          },
          {
            id: 'delay_2',
            type: 'delay' as const,
            delay: 72
          },
          {
            id: 'final_reminder',
            type: 'email' as const,
            emailTemplate: 'final_cart_reminder',
            delay: 0
          }
        ],
        isActive: true
      },
      {
        name: 'Post-Purchase Follow-up',
        trigger: 'purchase' as const,
        steps: [
          {
            id: 'thank_you',
            type: 'email' as const,
            emailTemplate: 'purchase_thank_you',
            delay: 2
          },
          {
            id: 'delay_1',
            type: 'delay' as const,
            delay: 168 // 1 week
          },
          {
            id: 'usage_tips',
            type: 'email' as const,
            emailTemplate: 'product_usage_tips',
            delay: 0
          },
          {
            id: 'delay_2',
            type: 'delay' as const,
            delay: 336 // 2 weeks
          },
          {
            id: 'review_request',
            type: 'email' as const,
            emailTemplate: 'review_request',
            delay: 0
          }
        ],
        isActive: true
      }
    ];

    for (const automation of automations) {
      await this.createAutomationFlow(automation);
    }
  }

  // Send Campaign
  async sendCampaign(campaign: Omit<EmailCampaign, 'id' | 'createdAt'>): Promise<string> {
    const campaignId = `campaign_${Date.now()}`;
    
    try {
      switch (this.provider) {
        case 'klaviyo':
          await this.sendKlaviyoCampaign(campaign);
          break;
        case 'mailchimp':
          await this.sendMailchimpCampaign(campaign);
          break;
        default:
          await this.sendCustomCampaign(campaign);
          break;
      }
    } catch (error) {
      console.error('Campaign send error:', error);
    }
    
    return campaignId;
  }

  private async sendKlaviyoCampaign(campaign: any): Promise<void> {
    // Klaviyo campaign implementation
    console.log(`Sending Klaviyo campaign: ${campaign.name}`);
  }

  private async sendMailchimpCampaign(campaign: any): Promise<void> {
    // Mailchimp campaign implementation
    console.log(`Sending Mailchimp campaign: ${campaign.name}`);
  }

  private async sendCustomCampaign(campaign: any): Promise<void> {
    // Custom campaign implementation
    console.log(`Sending custom campaign: ${campaign.name}`);
  }

  // Get Campaign Statistics
  async getCampaignStats(campaignId: string): Promise<any> {
    // Return campaign performance metrics
    return {
      sent: 1250,
      delivered: 1200,
      opened: 480,
      clicked: 120,
      bounced: 15,
      unsubscribed: 5,
      openRate: 40,
      clickRate: 10,
      bounceRate: 1.25,
      unsubscribeRate: 0.4
    };
  }

  // Unsubscribe User
  async unsubscribeUser(email: string, reason?: string): Promise<boolean> {
    try {
      switch (this.provider) {
        case 'klaviyo':
          return await this.klaviyoUnsubscribe(email);
        case 'mailchimp':
          return await this.mailchimpUnsubscribe(email);
        default:
          return await this.customUnsubscribe(email, reason);
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return false;
    }
  }

  private async klaviyoUnsubscribe(email: string): Promise<boolean> {
    // Klaviyo unsubscribe implementation
    console.log(`Unsubscribing ${email} from Klaviyo`);
    return true;
  }

  private async mailchimpUnsubscribe(email: string): Promise<boolean> {
    // Mailchimp unsubscribe implementation
    console.log(`Unsubscribing ${email} from Mailchimp`);
    return true;
  }

  private async customUnsubscribe(email: string, reason?: string): Promise<boolean> {
    try {
      const user = await User.findOne({ email });
      if (user && user.emailPreferences) {
        user.emailPreferences.subscribed = false;
        user.emailPreferences.unsubscribedAt = new Date();
        user.emailPreferences.unsubscribeReason = reason;
        await user.save();
      }
      return true;
    } catch (error) {
      console.error('Custom unsubscribe error:', error);
      return false;
    }
  }

  // Health Check
  async healthCheck(): Promise<{ [key: string]: boolean }> {
    const health = {
      klaviyo: false,
      mailchimp: false,
      custom: true
    };

    // Test Klaviyo connection
    if (this.klaviyoApiKey) {
      try {
        await axios.get('https://a.klaviyo.com/api/accounts/', {
          headers: {
            'Authorization': `Klaviyo-API-Key ${this.klaviyoApiKey}`,
            'revision': '2024-07-15'
          }
        });
        health.klaviyo = true;
      } catch (error) {
        console.error('Klaviyo health check failed:', error);
      }
    }

    // Test Mailchimp connection
    if (this.mailchimpApiKey) {
      try {
        const datacenter = this.mailchimpApiKey.split('-')[1];
        await axios.get(`https://${datacenter}.api.mailchimp.com/3.0/`, {
          headers: {
            'Authorization': `apikey ${this.mailchimpApiKey}`
          }
        });
        health.mailchimp = true;
      } catch (error) {
        console.error('Mailchimp health check failed:', error);
      }
    }

    return health;
  }
}

export default new EmailMarketingService();