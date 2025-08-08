import { useEffect, useCallback, useState } from 'react';
import axios from 'axios';

interface AnalyticsEvent {
  eventName: string;
  parameters: { [key: string]: any };
  userId?: string;
  sessionId?: string;
  customDimensions?: { [key: string]: string };
}

interface ProductViewData {
  productId: string;
  productName: string;
  category: string;
  price: number;
}

interface AddToCartData extends ProductViewData {
  quantity: number;
}

interface PurchaseData {
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
}

interface AIFeatureData {
  feature: 'chatbot' | 'ar_preview' | 'dynamic_pricing' | 'fraud_detection';
  action: string;
  productId?: string;
  metadata?: any;
}

interface UserFlowData {
  stepName: string;
  page: string;
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

export const useAnalytics = (userId?: string) => {
  const [sessionId] = useState(() => 
    `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Track generic events
  const trackEvent = useCallback(async (
    eventName: string,
    parameters: { [key: string]: any } = {},
    customDimensions: { [key: string]: string } = {}
  ): Promise<boolean> => {
    try {
      // Send to backend for server-side tracking
      const response = await axios.post('/api/analytics/track/event', {
        eventName,
        parameters,
        userId,
        sessionId,
        customDimensions
      });

      // Also send to frontend gtag if available
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, {
          ...parameters,
          user_id: userId,
          session_id: sessionId,
          ...customDimensions
        });
      }

      return response.data.success;
    } catch (error) {
      console.error('Error tracking event:', error);
      return false;
    }
  }, [userId, sessionId]);

  // Track page views
  const trackPageView = useCallback(async (
    page: string,
    title?: string,
    customDimensions: { [key: string]: string } = {}
  ) => {
    try {
      // Track via gtag for immediate processing
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', 'GA_MEASUREMENT_ID', {
          page_path: page,
          page_title: title,
          user_id: userId,
          ...customDimensions
        });
      }

      // Also track via our API for server-side processing
      return await trackEvent('page_view', {
        page_path: page,
        page_title: title || document.title,
        page_location: window.location.href
      }, customDimensions);
    } catch (error) {
      console.error('Error tracking page view:', error);
      return false;
    }
  }, [trackEvent, userId]);

  // Track product views
  const trackProductView = useCallback(async (data: ProductViewData) => {
    try {
      const response = await axios.post('/api/analytics/track/product-view', {
        ...data,
        userId,
        sessionId
      });

      // Also track via gtag
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'view_item', {
          currency: 'USD',
          value: data.price,
          items: [{
            item_id: data.productId,
            item_name: data.productName,
            item_category: data.category,
            price: data.price
          }]
        });
      }

      return response.data.success;
    } catch (error) {
      console.error('Error tracking product view:', error);
      return false;
    }
  }, [userId, sessionId]);

  // Track add to cart events
  const trackAddToCart = useCallback(async (data: AddToCartData) => {
    try {
      const response = await axios.post('/api/analytics/track/add-to-cart', {
        ...data,
        userId,
        sessionId
      });

      // Also track via gtag
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'add_to_cart', {
          currency: 'USD',
          value: data.price * data.quantity,
          items: [{
            item_id: data.productId,
            item_name: data.productName,
            item_category: data.category,
            quantity: data.quantity,
            price: data.price
          }]
        });
      }

      return response.data.success;
    } catch (error) {
      console.error('Error tracking add to cart:', error);
      return false;
    }
  }, [userId, sessionId]);

  // Track purchases
  const trackPurchase = useCallback(async (data: PurchaseData) => {
    try {
      const response = await axios.post('/api/analytics/track/purchase', {
        ...data,
        userId,
        sessionId
      });

      // Also track via gtag
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'purchase', {
          transaction_id: data.transactionId,
          value: data.value,
          currency: data.currency,
          items: data.items.map(item => ({
            item_id: item.itemId,
            item_name: item.itemName,
            item_category: item.category,
            quantity: item.quantity,
            price: item.price
          }))
        });
      }

      return response.data.success;
    } catch (error) {
      console.error('Error tracking purchase:', error);
      return false;
    }
  }, [userId, sessionId]);

  // Track AI feature usage (ICEPACA-specific)
  const trackAIFeature = useCallback(async (data: AIFeatureData) => {
    try {
      const response = await axios.post('/api/analytics/track/ai-feature', {
        ...data,
        userId,
        sessionId
      });

      // Track via gtag with custom event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'ai_feature_interaction', {
          feature_name: data.feature,
          action: data.action,
          product_id: data.productId,
          custom_parameters: data.metadata
        });
      }

      return response.data.success;
    } catch (error) {
      console.error('Error tracking AI feature:', error);
      return false;
    }
  }, [userId, sessionId]);

  // Track user flow steps
  const trackUserFlow = useCallback(async (data: UserFlowData) => {
    try {
      const response = await axios.post('/api/analytics/track/user-flow', {
        ...data,
        userId,
        sessionId
      });

      return response.data.success;
    } catch (error) {
      console.error('Error tracking user flow:', error);
      return false;
    }
  }, [userId, sessionId]);

  // Track heatmap interactions
  const trackHeatmap = useCallback(async (data: HeatmapData) => {
    try {
      const response = await axios.post('/api/analytics/track/heatmap', data);
      return response.data.success;
    } catch (error) {
      console.error('Error tracking heatmap data:', error);
      return false;
    }
  }, []);

  // Track newsletter signup
  const trackNewsletterSignup = useCallback(async (email: string, segments: string[] = []) => {
    return await trackEvent('newsletter_signup', {
      email_domain: email.split('@')[1] || 'unknown',
      segments: segments.join(','),
      signup_source: window.location.pathname
    });
  }, [trackEvent]);

  // Track search events
  const trackSearch = useCallback(async (query: string, resultsCount: number = 0) => {
    return await trackEvent('search', {
      search_term: query,
      results_count: resultsCount,
      search_source: window.location.pathname
    });
  }, [trackEvent]);

  // Track blog engagement
  const trackBlogEngagement = useCallback(async (
    blogId: string,
    blogTitle: string,
    engagementType: 'read_time' | 'share' | 'comment' | 'like',
    value?: number
  ) => {
    return await trackEvent('blog_engagement', {
      blog_id: blogId,
      blog_title: blogTitle,
      engagement_type: engagementType,
      engagement_value: value,
      reading_time: value // For read_time events
    });
  }, [trackEvent]);

  // Track conversion goals
  const trackConversion = useCallback(async (goalId: string, eventData: any = {}) => {
    try {
      const response = await axios.post('/api/analytics/track/conversion', {
        goalId,
        eventData: {
          ...eventData,
          userId,
          sessionId,
          timestamp: new Date().toISOString()
        }
      });

      return response.data.success;
    } catch (error) {
      console.error('Error tracking conversion:', error);
      return false;
    }
  }, [userId, sessionId]);

  // ICEPACA-specific tracking helpers
  const icepacaTracking = {
    // Track ice pack size preference
    trackSizePreference: (size: 'small' | 'medium' | 'large' | 'bundle') => {
      return trackEvent('size_preference', { preferred_size: size });
    },

    // Track use case interest
    trackUseCaseInterest: (useCase: string) => {
      return trackEvent('use_case_interest', { use_case: useCase });
    },

    // Track sustainability engagement
    trackSustainabilityEngagement: (action: 'view_impact' | 'calculate_savings' | 'share_impact') => {
      return trackEvent('sustainability_engagement', { action });
    },

    // Track cooling performance queries
    trackCoolingQuery: (query: string, productId?: string) => {
      return trackEvent('cooling_performance_query', { 
        query, 
        product_id: productId 
      });
    },

    // Track outdoor activity association
    trackOutdoorActivity: (activity: string) => {
      return trackEvent('outdoor_activity_interest', { activity });
    }
  };

  // Auto-track page views on route changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      trackPageView(window.location.pathname, document.title);
    }
  }, [trackPageView]);

  return {
    // Core tracking functions
    trackEvent,
    trackPageView,
    trackProductView,
    trackAddToCart,
    trackPurchase,
    trackAIFeature,
    trackUserFlow,
    trackHeatmap,
    trackNewsletterSignup,
    trackSearch,
    trackBlogEngagement,
    trackConversion,
    
    // ICEPACA-specific tracking
    icepacaTracking,
    
    // Session info
    sessionId,
    userId
  };
};

// Hook for admin analytics
export const useAdminAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getReport = useCallback(async (params: {
    startDate: string;
    endDate: string;
    metrics: string[];
    dimensions?: string[];
    filters?: any;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        startDate: params.startDate,
        endDate: params.endDate,
        metrics: params.metrics.join(','),
        ...(params.dimensions && { dimensions: params.dimensions.join(',') }),
        ...(params.filters && { filters: JSON.stringify(params.filters) })
      });

      const response = await axios.get(`/api/analytics/report?${queryParams}`);
      return response.data;
    } catch (err) {
      const errorMsg = 'Failed to fetch analytics report';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRealTimeData = useCallback(async () => {
    try {
      const response = await axios.get('/api/analytics/realtime');
      return response.data;
    } catch (err) {
      console.error('Error fetching real-time data:', err);
      throw err;
    }
  }, []);

  const getICEPACADashboard = useCallback(async (days: number = 30) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/analytics/dashboard/icepaca?days=${days}`);
      return response.data;
    } catch (err) {
      const errorMsg = 'Failed to fetch ICEPACA dashboard data';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getReport,
    getRealTimeData,
    getICEPACADashboard,
    loading,
    error
  };
};