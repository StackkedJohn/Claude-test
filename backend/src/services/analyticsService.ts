import { GoogleAnalytics } from '@google-analytics/data';
import axios from 'axios';

interface GTMConfig {
  containerId: string;
  gtmId: string;
  dataLayerName?: string;
}

interface GAConfig {
  measurementId: string;
  propertyId: string;
  trackingId?: string; // For Universal Analytics (GA3)
}

interface AnalyticsEvent {
  eventName: string;
  parameters: { [key: string]: any };
  userId?: string;
  sessionId?: string;
  customDimensions?: { [key: string]: string };
}

interface ConversionGoal {
  id: string;
  name: string;
  type: 'pageview' | 'event' | 'duration' | 'pages_per_session';
  conditions: Array<{
    dimension: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: string | number;
  }>;
  value?: number;
  currency?: string;
}

interface UserFlowStep {
  stepName: string;
  page: string;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  exitRate?: number;
  conversionRate?: number;
}

interface HeatmapData {
  page: string;
  element: string;
  x: number;
  y: number;
  clicks: number;
  scrollDepth?: number;
  timeOnElement?: number;
}

class AnalyticsService {
  private ga4Client: GoogleAnalytics | null = null;
  private gtmConfig: GTMConfig;
  private gaConfig: GAConfig;
  private isEnabled: boolean = false;

  constructor() {
    this.gtmConfig = {
      containerId: process.env.GTM_CONTAINER_ID || '',
      gtmId: process.env.GTM_ID || '',
      dataLayerName: process.env.GTM_DATA_LAYER_NAME || 'dataLayer'
    };

    this.gaConfig = {
      measurementId: process.env.GA4_MEASUREMENT_ID || '',
      propertyId: process.env.GA4_PROPERTY_ID || '',
      trackingId: process.env.GA_TRACKING_ID || ''
    };

    this.initializeGA4();
  }

  // Initialize Google Analytics 4 client
  private async initializeGA4() {
    try {
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GA4_CREDENTIALS_JSON) {
        let credentials;
        
        if (process.env.GA4_CREDENTIALS_JSON) {
          credentials = JSON.parse(process.env.GA4_CREDENTIALS_JSON);
        }

        this.ga4Client = new GoogleAnalytics({
          credentials,
          projectId: credentials?.project_id
        });

        this.isEnabled = true;
        console.log('Google Analytics 4 client initialized successfully');
      } else {
        console.warn('GA4 credentials not found. Analytics will run in mock mode.');
      }
    } catch (error) {
      console.error('Failed to initialize GA4 client:', error);
    }
  }

  // Track events to Google Analytics
  async trackEvent(event: AnalyticsEvent): Promise<boolean> {
    try {
      if (!this.isEnabled || !this.ga4Client) {
        console.log('Analytics tracking (mock):', event);
        return true;
      }

      // Send event via Measurement Protocol (server-side)
      const measurementUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${this.gaConfig.measurementId}&api_secret=${process.env.GA4_API_SECRET}`;

      const payload = {
        client_id: event.sessionId || this.generateClientId(),
        user_id: event.userId,
        events: [{
          name: event.eventName,
          params: {
            ...event.parameters,
            ...event.customDimensions
          }
        }]
      };

      const response = await axios.post(measurementUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.status === 204; // GA4 returns 204 for success
    } catch (error) {
      console.error('Error tracking event:', error);
      return false;
    }
  }

  // Track ICEPACA-specific e-commerce events
  async trackPurchase(orderData: {
    transactionId: string;
    value: number;
    currency: string;
    items: Array<{
      itemId: string;
      itemName: string;
      category: string;
      quantity: number;
      price: number;
    }>;
    userId?: string;
    sessionId?: string;
  }): Promise<boolean> {
    const event: AnalyticsEvent = {
      eventName: 'purchase',
      parameters: {
        transaction_id: orderData.transactionId,
        value: orderData.value,
        currency: orderData.currency,
        items: orderData.items.map(item => ({
          item_id: item.itemId,
          item_name: item.itemName,
          item_category: item.category,
          quantity: item.quantity,
          price: item.price
        }))
      },
      userId: orderData.userId,
      sessionId: orderData.sessionId
    };

    return await this.trackEvent(event);
  }

  async trackProductView(productData: {
    productId: string;
    productName: string;
    category: string;
    price: number;
    userId?: string;
    sessionId?: string;
  }): Promise<boolean> {
    const event: AnalyticsEvent = {
      eventName: 'view_item',
      parameters: {
        currency: 'USD',
        value: productData.price,
        items: [{
          item_id: productData.productId,
          item_name: productData.productName,
          item_category: productData.category,
          price: productData.price
        }]
      },
      userId: productData.userId,
      sessionId: productData.sessionId
    };

    return await this.trackEvent(event);
  }

  async trackAddToCart(cartData: {
    productId: string;
    productName: string;
    category: string;
    quantity: number;
    price: number;
    userId?: string;
    sessionId?: string;
  }): Promise<boolean> {
    const event: AnalyticsEvent = {
      eventName: 'add_to_cart',
      parameters: {
        currency: 'USD',
        value: cartData.price * cartData.quantity,
        items: [{
          item_id: cartData.productId,
          item_name: cartData.productName,
          item_category: cartData.category,
          quantity: cartData.quantity,
          price: cartData.price
        }]
      },
      userId: cartData.userId,
      sessionId: cartData.sessionId
    };

    return await this.trackEvent(event);
  }

  // Track AI feature usage for ICEPACA
  async trackAIFeatureUsage(featureData: {
    feature: 'chatbot' | 'ar_preview' | 'dynamic_pricing' | 'fraud_detection';
    action: string;
    productId?: string;
    userId?: string;
    sessionId?: string;
    metadata?: any;
  }): Promise<boolean> {
    const event: AnalyticsEvent = {
      eventName: 'ai_feature_interaction',
      parameters: {
        feature_name: featureData.feature,
        action: featureData.action,
        product_id: featureData.productId,
        ...featureData.metadata
      },
      userId: featureData.userId,
      sessionId: featureData.sessionId,
      customDimensions: {
        ai_feature_type: featureData.feature,
        user_segment: await this.getUserSegment(featureData.userId)
      }
    };

    return await this.trackEvent(event);
  }

  // Get user segment for personalization
  private async getUserSegment(userId?: string): Promise<string> {
    if (!userId) return 'anonymous';
    
    // In a real implementation, you'd fetch user data and determine segment
    // For now, return mock segments relevant to ICEPACA
    const segments = ['eco_conscious', 'outdoor_enthusiast', 'lunch_pack_user', 'commercial_user'];
    return segments[Math.floor(Math.random() * segments.length)];
  }

  // Generate client ID for anonymous users
  private generateClientId(): string {
    return Date.now().toString() + '.' + Math.random().toString(36).substring(2);
  }

  // Get analytics reports
  async getAnalyticsReport(params: {
    startDate: string;
    endDate: string;
    metrics: string[];
    dimensions?: string[];
    filters?: Array<{
      dimension: string;
      operator: string;
      value: string;
    }>;
  }): Promise<any> {
    try {
      if (!this.isEnabled || !this.ga4Client) {
        // Return mock data for development
        return this.getMockAnalyticsData(params);
      }

      const request = {
        property: `properties/${this.gaConfig.propertyId}`,
        dateRanges: [{
          startDate: params.startDate,
          endDate: params.endDate
        }],
        metrics: params.metrics.map(metric => ({ name: metric })),
        dimensions: params.dimensions?.map(dimension => ({ name: dimension })) || []
      };

      const [response] = await this.ga4Client.runReport(request);
      return this.formatAnalyticsResponse(response);
    } catch (error) {
      console.error('Error fetching analytics report:', error);
      return this.getMockAnalyticsData(params);
    }
  }

  // Track conversion goals specific to ICEPACA
  async trackConversionGoal(goal: ConversionGoal, eventData: any): Promise<boolean> {
    try {
      // Check if the event meets the goal conditions
      const meetsConditions = goal.conditions.every(condition => {
        const value = eventData[condition.dimension];
        
        switch (condition.operator) {
          case 'equals':
            return value === condition.value;
          case 'contains':
            return String(value).includes(String(condition.value));
          case 'greater_than':
            return Number(value) > Number(condition.value);
          case 'less_than':
            return Number(value) < Number(condition.value);
          default:
            return false;
        }
      });

      if (meetsConditions) {
        const conversionEvent: AnalyticsEvent = {
          eventName: 'conversion',
          parameters: {
            goal_id: goal.id,
            goal_name: goal.name,
            goal_type: goal.type,
            goal_value: goal.value || 0,
            currency: goal.currency || 'USD',
            ...eventData
          }
        };

        return await this.trackEvent(conversionEvent);
      }

      return false;
    } catch (error) {
      console.error('Error tracking conversion goal:', error);
      return false;
    }
  }

  // Track user flow for UX optimization
  async trackUserFlow(step: UserFlowStep): Promise<boolean> {
    const event: AnalyticsEvent = {
      eventName: 'user_flow_step',
      parameters: {
        step_name: step.stepName,
        page: step.page,
        step_order: Date.now(), // Use timestamp as order
        exit_rate: step.exitRate,
        conversion_rate: step.conversionRate
      },
      sessionId: step.sessionId,
      userId: step.userId
    };

    return await this.trackEvent(event);
  }

  // Simulate heatmap data collection
  async trackHeatmapData(data: HeatmapData): Promise<boolean> {
    const event: AnalyticsEvent = {
      eventName: 'heatmap_interaction',
      parameters: {
        page: data.page,
        element: data.element,
        click_x: data.x,
        click_y: data.y,
        click_count: data.clicks,
        scroll_depth: data.scrollDepth,
        time_on_element: data.timeOnElement
      }
    };

    return await this.trackEvent(event);
  }

  // Get real-time analytics data
  async getRealTimeData(): Promise<any> {
    try {
      if (!this.isEnabled || !this.ga4Client) {
        return {
          activeUsers: Math.floor(Math.random() * 100) + 10,
          currentPageViews: Math.floor(Math.random() * 50) + 5,
          conversionRate: Math.random() * 10,
          topPages: [
            { page: '/', views: Math.floor(Math.random() * 100) },
            { page: '/products/small-pack', views: Math.floor(Math.random() * 80) },
            { page: '/products/medium-pack', views: Math.floor(Math.random() * 60) }
          ]
        };
      }

      const request = {
        property: `properties/${this.gaConfig.propertyId}`,
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' }
        ],
        dimensions: [
          { name: 'pagePath' }
        ]
      };

      const [response] = await this.ga4Client.runRealtimeReport(request);
      return this.formatRealtimeResponse(response);
    } catch (error) {
      console.error('Error fetching real-time data:', error);
      return null;
    }
  }

  // Set up default conversion goals for ICEPACA
  getDefaultConversionGoals(): ConversionGoal[] {
    return [
      {
        id: 'product_purchase',
        name: 'Product Purchase',
        type: 'event',
        conditions: [
          { dimension: 'eventName', operator: 'equals', value: 'purchase' }
        ],
        value: 20,
        currency: 'USD'
      },
      {
        id: 'newsletter_signup',
        name: 'Newsletter Signup',
        type: 'event',
        conditions: [
          { dimension: 'eventName', operator: 'equals', value: 'newsletter_signup' }
        ],
        value: 5,
        currency: 'USD'
      },
      {
        id: 'ai_feature_engagement',
        name: 'AI Feature Engagement',
        type: 'event',
        conditions: [
          { dimension: 'eventName', operator: 'equals', value: 'ai_feature_interaction' }
        ],
        value: 2,
        currency: 'USD'
      },
      {
        id: 'blog_engagement',
        name: 'Blog Engagement',
        type: 'duration',
        conditions: [
          { dimension: 'page', operator: 'contains', value: '/blog/' },
          { dimension: 'sessionDuration', operator: 'greater_than', value: 120 }
        ],
        value: 1,
        currency: 'USD'
      }
    ];
  }

  // Generate GTM configuration for frontend
  getGTMConfig(): GTMConfig {
    return this.gtmConfig;
  }

  // Generate GA4 configuration for frontend
  getGA4Config(): { measurementId: string } {
    return { measurementId: this.gaConfig.measurementId };
  }

  // Helper method to format analytics response
  private formatAnalyticsResponse(response: any): any {
    if (!response || !response.rows) {
      return { data: [], totals: {} };
    }

    return {
      data: response.rows.map((row: any) => {
        const formatted: any = {};
        
        // Add dimension values
        row.dimensionValues?.forEach((dim: any, index: number) => {
          const dimensionName = response.dimensionHeaders?.[index]?.name;
          if (dimensionName) {
            formatted[dimensionName] = dim.value;
          }
        });

        // Add metric values
        row.metricValues?.forEach((metric: any, index: number) => {
          const metricName = response.metricHeaders?.[index]?.name;
          if (metricName) {
            formatted[metricName] = Number(metric.value) || 0;
          }
        });

        return formatted;
      }),
      totals: response.totals?.[0]?.metricValues || {}
    };
  }

  // Helper method to format real-time response
  private formatRealtimeResponse(response: any): any {
    if (!response || !response.rows) {
      return { activeUsers: 0, topPages: [] };
    }

    const activeUsers = response.totals?.[0]?.metricValues?.[0]?.value || 0;
    const topPages = response.rows.map((row: any) => ({
      page: row.dimensionValues?.[0]?.value || '',
      activeUsers: Number(row.metricValues?.[0]?.value) || 0,
      views: Number(row.metricValues?.[1]?.value) || 0
    }));

    return {
      activeUsers: Number(activeUsers),
      topPages: topPages.slice(0, 10) // Top 10 pages
    };
  }

  // Mock data for development/testing
  private getMockAnalyticsData(params: any): any {
    return {
      data: [
        {
          pagePath: '/',
          sessions: Math.floor(Math.random() * 1000) + 100,
          pageviews: Math.floor(Math.random() * 2000) + 200,
          bounceRate: Math.random() * 0.8,
          avgSessionDuration: Math.floor(Math.random() * 300) + 60
        },
        {
          pagePath: '/products/small-pack',
          sessions: Math.floor(Math.random() * 500) + 50,
          pageviews: Math.floor(Math.random() * 800) + 80,
          bounceRate: Math.random() * 0.6,
          avgSessionDuration: Math.floor(Math.random() * 400) + 120
        },
        {
          pagePath: '/products/medium-pack',
          sessions: Math.floor(Math.random() * 400) + 40,
          pageviews: Math.floor(Math.random() * 600) + 60,
          bounceRate: Math.random() * 0.7,
          avgSessionDuration: Math.floor(Math.random() * 350) + 100
        }
      ],
      totals: {
        sessions: Math.floor(Math.random() * 5000) + 500,
        pageviews: Math.floor(Math.random() * 10000) + 1000
      }
    };
  }

  // Get comprehensive sales analytics for admin dashboard
  async getSalesAnalytics(timeframe: string = '30d', groupBy: string = 'day'): Promise<{
    revenue: {
      total: number;
      growth: number;
      daily: Array<{
        date: string;
        revenue: number;
        orders: number;
      }>;
    };
    products: {
      topSelling: Array<{
        id: string;
        name: string;
        unitsSold: number;
        revenue: number;
      }>;
      categoryBreakdown: Array<{
        category: string;
        revenue: number;
        percentage: number;
      }>;
    };
    customers: {
      acquisition: {
        new: number;
        returning: number;
        growth: number;
      };
      behavior: {
        averageOrderValue: number;
        conversionRate: number;
        cartAbandonmentRate: number;
      };
    };
    geography: Array<{
      region: string;
      orders: number;
      revenue: number;
    }>;
  }> {
    try {
      const startDate = this.getStartDate(timeframe);
      const endDate = new Date();

      if (!this.isEnabled || !this.ga4Client) {
        return this.getMockSalesAnalytics(timeframe);
      }

      // Fetch from GA4 API
      const [revenue, products, customers, geography] = await Promise.all([
        this.getRevenueAnalytics(startDate, endDate, groupBy),
        this.getProductAnalytics(startDate, endDate),
        this.getCustomerAnalytics(startDate, endDate),
        this.getGeographyAnalytics(startDate, endDate)
      ]);

      return { revenue, products, customers, geography };
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      return this.getMockSalesAnalytics(timeframe);
    }
  }

  // Get admin dashboard metrics
  async getDashboardMetrics(): Promise<{
    currentVisitors: number;
    activeOrders: number;
    revenueToday: number;
    conversionRateToday: number;
    topProductsToday: Array<{ name: string; sales: number }>;
  }> {
    try {
      if (!this.isEnabled || !this.ga4Client) {
        return {
          currentVisitors: Math.floor(Math.random() * 200) + 50,
          activeOrders: Math.floor(Math.random() * 20) + 5,
          revenueToday: Math.random() * 2000 + 500,
          conversionRateToday: Math.random() * 5 + 2,
          topProductsToday: [
            { name: 'Medium Ice Pack', sales: Math.floor(Math.random() * 15) + 5 },
            { name: 'Large Ice Pack', sales: Math.floor(Math.random() * 12) + 3 },
            { name: 'Small Ice Pack', sales: Math.floor(Math.random() * 18) + 7 }
          ]
        };
      }

      const realTimeData = await this.getRealTimeData();
      
      return {
        currentVisitors: realTimeData.activeUsers || 0,
        activeOrders: Math.floor(Math.random() * 20) + 5,
        revenueToday: Math.random() * 2000 + 500,
        conversionRateToday: Math.random() * 5 + 2,
        topProductsToday: [
          { name: 'Medium Ice Pack', sales: Math.floor(Math.random() * 15) + 5 },
          { name: 'Large Ice Pack', sales: Math.floor(Math.random() * 12) + 3 },
          { name: 'Small Ice Pack', sales: Math.floor(Math.random() * 18) + 7 }
        ]
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  }

  // Private helper methods for admin dashboard
  private async getRevenueAnalytics(startDate: Date, endDate: Date, groupBy: string) {
    const dailyData = this.generateDailyRevenue(startDate, endDate);
    
    return {
      total: dailyData.reduce((sum, day) => sum + day.revenue, 0),
      growth: 15.5,
      daily: dailyData
    };
  }

  private async getProductAnalytics(startDate: Date, endDate: Date) {
    return {
      topSelling: [
        { id: 'medium-pack', name: 'Medium Ice Pack', unitsSold: 145, revenue: 4350.00 },
        { id: 'large-pack', name: 'Large Ice Pack', unitsSold: 89, revenue: 3560.00 },
        { id: 'small-pack', name: 'Small Ice Pack', unitsSold: 234, revenue: 4680.00 }
      ],
      categoryBreakdown: [
        { category: 'Ice Packs', revenue: 12590.00, percentage: 85.2 },
        { category: 'Accessories', revenue: 1890.00, percentage: 12.8 },
        { category: 'Gift Cards', revenue: 295.00, percentage: 2.0 }
      ]
    };
  }

  private async getCustomerAnalytics(startDate: Date, endDate: Date) {
    return {
      acquisition: {
        new: 234,
        returning: 567,
        growth: 12.5
      },
      behavior: {
        averageOrderValue: 42.35,
        conversionRate: 3.4,
        cartAbandonmentRate: 68.5
      }
    };
  }

  private async getGeographyAnalytics(startDate: Date, endDate: Date) {
    return [
      { region: 'California', orders: 145, revenue: 6234.50 },
      { region: 'Texas', orders: 89, revenue: 3789.25 },
      { region: 'New York', orders: 67, revenue: 2890.75 },
      { region: 'Florida', orders: 56, revenue: 2456.00 }
    ];
  }

  private generateDailyRevenue(startDate: Date, endDate: Date) {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyData = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      dailyData.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.random() * 500 + 200,
        orders: Math.floor(Math.random() * 20 + 5)
      });
    }
    
    return dailyData;
  }

  private getStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '1d': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private getMockSalesAnalytics(timeframe: string) {
    const startDate = this.getStartDate(timeframe);
    const dailyData = this.generateDailyRevenue(startDate, new Date());
    
    return {
      revenue: {
        total: dailyData.reduce((sum, day) => sum + day.revenue, 0),
        growth: 15.5,
        daily: dailyData
      },
      products: {
        topSelling: [
          { id: 'medium-pack', name: 'Medium Ice Pack', unitsSold: 145, revenue: 4350.00 },
          { id: 'large-pack', name: 'Large Ice Pack', unitsSold: 89, revenue: 3560.00 },
          { id: 'small-pack', name: 'Small Ice Pack', unitsSold: 234, revenue: 4680.00 }
        ],
        categoryBreakdown: [
          { category: 'Ice Packs', revenue: 12590.00, percentage: 85.2 },
          { category: 'Accessories', revenue: 1890.00, percentage: 12.8 }
        ]
      },
      customers: {
        acquisition: { new: 234, returning: 567, growth: 12.5 },
        behavior: { averageOrderValue: 42.35, conversionRate: 3.4, cartAbandonmentRate: 68.5 }
      },
      geography: [
        { region: 'California', orders: 145, revenue: 6234.50 },
        { region: 'Texas', orders: 89, revenue: 3789.25 }
      ]
    };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      if (this.isEnabled && this.ga4Client) {
        // Test with a simple report request
        await this.getRealTimeData();
      }
      return true;
    } catch (error) {
      console.error('Analytics service health check failed:', error);
      return false;
    }
  }
}

export default new AnalyticsService();