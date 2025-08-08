import QRCode from 'qrcode';
import crypto from 'crypto';
import { Product } from '../models/Product';

interface QRCodeData {
  id: string;
  type: 'product' | 'store' | 'promotion' | 'subscription' | 'review';
  targetUrl: string;
  metadata: {
    productId?: string;
    storeId?: string;
    campaignId?: string;
    location?: string;
    timestamp: Date;
  };
  isActive: boolean;
  analytics: {
    scans: number;
    conversions: number;
    lastScanned?: Date;
  };
}

interface InStoreExperience {
  storeId: string;
  storeName: string;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  features: {
    digitalCatalog: boolean;
    qrCheckout: boolean;
    productComparison: boolean;
    virtualTryOn: boolean;
    inventoryCheck: boolean;
    appointmentBooking: boolean;
  };
  operatingHours: {
    [day: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  staff: Array<{
    id: string;
    name: string;
    role: string;
    expertise: string[];
  }>;
}

interface OmnichannelCampaign {
  id: string;
  name: string;
  description: string;
  type: 'cross_channel' | 'store_to_online' | 'online_to_store';
  channels: ('online' | 'retail' | 'social' | 'email' | 'mobile')[];
  startDate: Date;
  endDate: Date;
  targetAudience: string[];
  touchpoints: Array<{
    channel: string;
    action: string;
    trigger: string;
    content: any;
  }>;
  metrics: {
    reach: number;
    engagement: number;
    conversions: number;
    revenue: number;
  };
  isActive: boolean;
}

class OmnichannelService {
  private baseUrl: string;
  private qrCodeCache: Map<string, string> = new Map();

  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'https://icepaca.com';
  }

  // QR Code Generation and Management
  async generateQRCode(data: Omit<QRCodeData, 'id' | 'analytics'>): Promise<{ id: string; qrCodeUrl: string; qrCodeSVG: string }> {
    try {
      const qrId = `qr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      const qrData: QRCodeData = {
        id: qrId,
        ...data,
        analytics: {
          scans: 0,
          conversions: 0
        }
      };

      // Create tracking URL
      const trackingUrl = `${this.baseUrl}/qr/${qrId}`;
      
      // Generate QR code as data URL
      const qrCodeUrl = await QRCode.toDataURL(trackingUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      // Generate QR code as SVG
      const qrCodeSVG = await QRCode.toString(trackingUrl, {
        type: 'svg',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Cache the QR data
      this.qrCodeCache.set(qrId, JSON.stringify(qrData));

      // In production, save to database
      console.log('Generated QR code:', qrData);

      return {
        id: qrId,
        qrCodeUrl,
        qrCodeSVG
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Product-specific QR codes for in-store displays
  async generateProductQRCode(productId: string, storeId?: string): Promise<{ id: string; qrCodeUrl: string; qrCodeSVG: string }> {
    try {
      const product = await Product.findById(productId).lean();
      if (!product) {
        throw new Error('Product not found');
      }

      const targetUrl = `${this.baseUrl}/products/${productId}?source=qr_instore${storeId ? `&store=${storeId}` : ''}`;

      return await this.generateQRCode({
        type: 'product',
        targetUrl,
        metadata: {
          productId,
          storeId,
          location: storeId ? 'in_store' : 'general',
          timestamp: new Date()
        },
        isActive: true
      });
    } catch (error) {
      console.error('Error generating product QR code:', error);
      throw error;
    }
  }

  // Store-specific QR codes
  async generateStoreQRCode(storeId: string, action: 'catalog' | 'checkout' | 'reviews' | 'appointment'): Promise<{ id: string; qrCodeUrl: string; qrCodeSVG: string }> {
    try {
      const targetUrls = {
        catalog: `${this.baseUrl}/store/${storeId}/catalog`,
        checkout: `${this.baseUrl}/store/${storeId}/checkout`,
        reviews: `${this.baseUrl}/store/${storeId}/reviews`,
        appointment: `${this.baseUrl}/store/${storeId}/appointment`
      };

      return await this.generateQRCode({
        type: 'store',
        targetUrl: targetUrls[action],
        metadata: {
          storeId,
          location: 'in_store',
          timestamp: new Date()
        },
        isActive: true
      });
    } catch (error) {
      console.error('Error generating store QR code:', error);
      throw error;
    }
  }

  // Subscription QR code
  async generateSubscriptionQRCode(campaignId?: string): Promise<{ id: string; qrCodeUrl: string; qrCodeSVG: string }> {
    const targetUrl = `${this.baseUrl}/subscription${campaignId ? `?campaign=${campaignId}` : ''}`;

    return await this.generateQRCode({
      type: 'subscription',
      targetUrl,
      metadata: {
        campaignId,
        location: 'in_store',
        timestamp: new Date()
      },
      isActive: true
    });
  }

  // Track QR code scan
  async trackQRScan(qrId: string, userAgent: string, ipAddress: string, location?: string): Promise<QRCodeData | null> {
    try {
      const qrDataStr = this.qrCodeCache.get(qrId);
      if (!qrDataStr) {
        console.error('QR code not found:', qrId);
        return null;
      }

      const qrData: QRCodeData = JSON.parse(qrDataStr);
      qrData.analytics.scans += 1;
      qrData.analytics.lastScanned = new Date();

      // Update cache
      this.qrCodeCache.set(qrId, JSON.stringify(qrData));

      // In production, update database and track detailed analytics
      console.log(`QR scan tracked: ${qrId} from ${ipAddress} (${location || 'unknown location'})`);

      // Log detailed analytics
      const analyticsData = {
        qrId,
        scannedAt: new Date(),
        userAgent,
        ipAddress,
        location,
        type: qrData.type,
        metadata: qrData.metadata
      };
      
      console.log('QR Analytics:', analyticsData);

      return qrData;
    } catch (error) {
      console.error('Error tracking QR scan:', error);
      return null;
    }
  }

  // Generate ICEPACA in-store QR code kit
  async generateInStoreQRKit(storeId: string): Promise<{
    productCodes: Array<{ productId: string; productName: string; qrCode: any }>;
    storeCodes: Array<{ action: string; description: string; qrCode: any }>;
    promotionCodes: Array<{ name: string; description: string; qrCode: any }>;
  }> {
    try {
      // Get active products for QR generation
      const products = await Product.find({ isActive: true }).limit(10).lean();

      // Generate product QR codes
      const productCodes = await Promise.all(
        products.map(async (product) => {
          const qr = await this.generateProductQRCode(product._id.toString(), storeId);
          return {
            productId: product._id.toString(),
            productName: product.name,
            qrCode: qr
          };
        })
      );

      // Generate store action QR codes
      const storeActions = [
        { action: 'catalog', description: 'Browse Full Catalog Online' },
        { action: 'checkout', description: 'Quick Mobile Checkout' },
        { action: 'reviews', description: 'Leave a Review' },
        { action: 'appointment', description: 'Book Consultation' }
      ];

      const storeCodes = await Promise.all(
        storeActions.map(async (action) => {
          const qr = await this.generateStoreQRCode(storeId, action.action as any);
          return {
            action: action.action,
            description: action.description,
            qrCode: qr
          };
        })
      );

      // Generate promotion QR codes
      const promotions = [
        {
          name: 'Newsletter Signup',
          description: 'Get 10% off your first online order',
          targetUrl: `${this.baseUrl}/newsletter?source=instore&store=${storeId}`
        },
        {
          name: 'Adventure Kit Subscription',
          description: 'Subscribe to monthly ice pack deliveries',
          targetUrl: `${this.baseUrl}/subscription?source=instore&store=${storeId}`
        },
        {
          name: 'Product Care Guide',
          description: 'Learn how to maximize your ice pack lifespan',
          targetUrl: `${this.baseUrl}/care-guide?source=instore&store=${storeId}`
        }
      ];

      const promotionCodes = await Promise.all(
        promotions.map(async (promo) => {
          const qr = await this.generateQRCode({
            type: 'promotion',
            targetUrl: promo.targetUrl,
            metadata: {
              storeId,
              location: 'in_store',
              timestamp: new Date()
            },
            isActive: true
          });
          return {
            name: promo.name,
            description: promo.description,
            qrCode: qr
          };
        })
      );

      return {
        productCodes,
        storeCodes,
        promotionCodes
      };
    } catch (error) {
      console.error('Error generating in-store QR kit:', error);
      throw error;
    }
  }

  // In-store experience management
  async createInStoreExperience(experienceData: Omit<InStoreExperience, 'storeId'>): Promise<string> {
    try {
      const storeId = `store_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      const experience: InStoreExperience = {
        storeId,
        ...experienceData
      };

      // In production, save to database
      console.log('Created in-store experience:', experience);

      // Generate initial QR code kit for the store
      await this.generateInStoreQRKit(storeId);

      return storeId;
    } catch (error) {
      console.error('Error creating in-store experience:', error);
      throw error;
    }
  }

  // Initialize ICEPACA store experiences
  async initializeICEPACAStores(): Promise<string[]> {
    const stores = [
      {
        storeName: 'ICEPACA Flagship - Seattle',
        location: {
          address: '123 Adventure Way',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          coordinates: { lat: 47.6062, lng: -122.3321 }
        },
        features: {
          digitalCatalog: true,
          qrCheckout: true,
          productComparison: true,
          virtualTryOn: false,
          inventoryCheck: true,
          appointmentBooking: true
        },
        operatingHours: {
          monday: { open: '09:00', close: '19:00', isOpen: true },
          tuesday: { open: '09:00', close: '19:00', isOpen: true },
          wednesday: { open: '09:00', close: '19:00', isOpen: true },
          thursday: { open: '09:00', close: '21:00', isOpen: true },
          friday: { open: '09:00', close: '21:00', isOpen: true },
          saturday: { open: '08:00', close: '20:00', isOpen: true },
          sunday: { open: '10:00', close: '18:00', isOpen: true }
        },
        staff: [
          {
            id: 'staff_001',
            name: 'Sarah Johnson',
            role: 'Store Manager',
            expertise: ['Product Knowledge', 'Customer Service', 'Outdoor Adventures']
          },
          {
            id: 'staff_002',
            name: 'Mike Chen',
            role: 'Adventure Specialist',
            expertise: ['Camping', 'Hiking', 'Cooling Solutions', 'Gear Recommendations']
          }
        ]
      },
      {
        storeName: 'ICEPACA Outdoor Hub - Denver',
        location: {
          address: '456 Mountain View Blvd',
          city: 'Denver',
          state: 'CO',
          zipCode: '80202',
          coordinates: { lat: 39.7392, lng: -104.9903 }
        },
        features: {
          digitalCatalog: true,
          qrCheckout: true,
          productComparison: true,
          virtualTryOn: true,
          inventoryCheck: true,
          appointmentBooking: true
        },
        operatingHours: {
          monday: { open: '08:00', close: '20:00', isOpen: true },
          tuesday: { open: '08:00', close: '20:00', isOpen: true },
          wednesday: { open: '08:00', close: '20:00', isOpen: true },
          thursday: { open: '08:00', close: '20:00', isOpen: true },
          friday: { open: '08:00', close: '21:00', isOpen: true },
          saturday: { open: '07:00', close: '21:00', isOpen: true },
          sunday: { open: '09:00', close: '19:00', isOpen: true }
        },
        staff: [
          {
            id: 'staff_003',
            name: 'Jessica Rodriguez',
            role: 'Regional Manager',
            expertise: ['Business Operations', 'Customer Experience', 'Team Leadership']
          },
          {
            id: 'staff_004',
            name: 'Tom Wilson',
            role: 'Technical Specialist',
            expertise: ['Product Development', 'Materials Science', 'Quality Testing']
          }
        ]
      }
    ];

    const storeIds: string[] = [];
    for (const storeData of stores) {
      const id = await this.createInStoreExperience(storeData);
      storeIds.push(id);
    }

    return storeIds;
  }

  // Omnichannel campaign management
  async createOmnichannelCampaign(campaignData: Omit<OmnichannelCampaign, 'id' | 'metrics'>): Promise<string> {
    try {
      const campaignId = `campaign_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      const campaign: OmnichannelCampaign = {
        ...campaignData,
        id: campaignId,
        metrics: {
          reach: 0,
          engagement: 0,
          conversions: 0,
          revenue: 0
        }
      };

      // In production, save to database
      console.log('Created omnichannel campaign:', campaign);

      return campaignId;
    } catch (error) {
      console.error('Error creating omnichannel campaign:', error);
      throw error;
    }
  }

  // Create ICEPACA omnichannel campaigns
  async initializeICEPACACampaigns(): Promise<string[]> {
    const campaigns = [
      {
        name: 'Summer Adventure Bridge Campaign',
        description: 'Connect in-store customers to online summer content and subscriptions',
        type: 'store_to_online' as const,
        channels: ['retail', 'online', 'social', 'email'] as const,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31'),
        targetAudience: ['camping enthusiasts', 'outdoor adventurers', 'sustainability-minded consumers'],
        touchpoints: [
          {
            channel: 'retail',
            action: 'qr_scan',
            trigger: 'product_interest',
            content: {
              qrCodes: ['product_demo', 'subscription_offer', 'social_follow'],
              displays: ['summer_adventure_setup', 'cooling_comparison_demo'],
              staff_prompts: ['Ask about outdoor plans', 'Demonstrate product benefits', 'Explain subscription value']
            }
          },
          {
            channel: 'online',
            action: 'personalized_landing',
            trigger: 'qr_redirect',
            content: {
              landing_pages: ['summer_collection', 'first_time_buyer_discount', 'subscription_trial'],
              product_recommendations: 'based_on_store_interaction',
              exclusive_offers: '15% off first online purchase'
            }
          },
          {
            channel: 'email',
            action: 'follow_up_sequence',
            trigger: 'store_visit_detected',
            content: {
              sequence: [
                'Thank you for visiting our store',
                'Complete your purchase online',
                'Adventure tips and guides',
                'Exclusive subscriber benefits'
              ]
            }
          },
          {
            channel: 'social',
            action: 'retargeting_ads',
            trigger: 'product_viewed',
            content: {
              platforms: ['instagram', 'facebook', 'tiktok'],
              ad_types: ['product_showcase', 'user_generated_content', 'adventure_stories'],
              custom_audiences: 'store_visitors_not_purchased'
            }
          }
        ],
        isActive: true
      },
      {
        name: 'Online to Store Experience Campaign',
        description: 'Drive online customers to visit physical stores for enhanced experience',
        type: 'online_to_store' as const,
        channels: ['online', 'retail', 'mobile', 'email'] as const,
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-12-31'),
        targetAudience: ['repeat online customers', 'high-value subscribers', 'local market segments'],
        touchpoints: [
          {
            channel: 'online',
            action: 'store_locator_promotion',
            trigger: 'checkout_process',
            content: {
              prompts: ['Find a store near you', 'See products in person', 'Meet our adventure specialists'],
              incentives: ['Free in-store pickup', 'Exclusive store events', 'Personal consultation']
            }
          },
          {
            channel: 'email',
            action: 'store_invitation',
            trigger: 'subscription_milestone',
            content: {
              invitations: ['VIP store experience', 'Product testing events', 'Adventure planning sessions']
            }
          },
          {
            channel: 'mobile',
            action: 'location_based_alerts',
            trigger: 'near_store',
            content: {
              notifications: ['Store nearby notification', 'Current promotions', 'Book appointment'],
              features: ['Turn-by-turn directions', 'Store inventory check', 'Staff availability']
            }
          },
          {
            channel: 'retail',
            action: 'vip_experience',
            trigger: 'online_customer_visit',
            content: {
              services: ['Priority assistance', 'Extended product demos', 'Exclusive merchandise'],
              follow_up: ['Personalized recommendations', 'Adventure planning', 'Subscription optimization']
            }
          }
        ],
        isActive: true
      }
    ];

    const campaignIds: string[] = [];
    for (const campaignData of campaigns) {
      const id = await this.createOmnichannelCampaign(campaignData);
      campaignIds.push(id);
    }

    return campaignIds;
  }

  // Get omnichannel analytics
  async getOmnichannelAnalytics(): Promise<any> {
    try {
      // In production, fetch real analytics from database
      const mockAnalytics = {
        qrCodeMetrics: {
          totalCodes: 247,
          activeCodes: 198,
          totalScans: 15420,
          uniqueScans: 12330,
          conversionRate: 8.7,
          topPerformers: [
            { type: 'product', scans: 3450, conversions: 312 },
            { type: 'subscription', scans: 2890, conversions: 287 },
            { type: 'promotion', scans: 2234, conversions: 156 }
          ]
        },
        channelPerformance: {
          retail_to_online: {
            visitors: 5420,
            online_conversions: 1234,
            revenue_attributed: 42350
          },
          online_to_retail: {
            referrals: 2890,
            store_visits: 1456,
            in_store_purchases: 890
          },
          cross_channel: {
            customers: 3456,
            total_value: 87650,
            average_touchpoints: 4.2
          }
        },
        customerJourney: {
          single_channel: { percentage: 23, revenue_per_customer: 45.20 },
          dual_channel: { percentage: 45, revenue_per_customer: 127.80 },
          multi_channel: { percentage: 32, revenue_per_customer: 234.50 }
        },
        storeMetrics: [
          {
            storeId: 'store_001',
            name: 'Seattle Flagship',
            qr_scans: 8920,
            online_referrals: 2340,
            conversion_rate: 12.4
          },
          {
            storeId: 'store_002',
            name: 'Denver Hub',
            qr_scans: 6500,
            online_referrals: 1890,
            conversion_rate: 9.8
          }
        ]
      };

      return mockAnalytics;
    } catch (error) {
      console.error('Error fetching omnichannel analytics:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Test QR code generation
      const testQr = await this.generateQRCode({
        type: 'product',
        targetUrl: `${this.baseUrl}/test`,
        metadata: {
          location: 'test',
          timestamp: new Date()
        },
        isActive: true
      });

      return !!testQr.id;
    } catch (error) {
      console.error('Omnichannel service health check failed:', error);
      return false;
    }
  }
}

export default new OmnichannelService();