// Advanced Analytics and Heatmap System for ICEPACA
import { nanoid } from 'nanoid';

interface ClickEvent {
  id: string;
  timestamp: Date;
  x: number;
  y: number;
  elementTag: string;
  elementId?: string;
  elementClass?: string;
  elementText?: string;
  pageUrl: string;
  viewportWidth: number;
  viewportHeight: number;
  userId: string;
  sessionId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  metadata?: Record<string, any>;
}

interface ScrollEvent {
  id: string;
  timestamp: Date;
  scrollY: number;
  maxScroll: number;
  pageUrl: string;
  userId: string;
  sessionId: string;
  documentHeight: number;
  viewportHeight: number;
}

interface SessionEvent {
  id: string;
  type: 'pageview' | 'click' | 'scroll' | 'hover' | 'form_interaction' | 'video_play' | 'purchase' | 'add_to_cart' | 'custom';
  timestamp: Date;
  data: any;
  userId: string;
  sessionId: string;
  pageUrl: string;
}

interface HeatmapData {
  clicks: ClickEvent[];
  scrollDepth: { [pageUrl: string]: number[] };
  elementInteractions: { [selector: string]: number };
}

interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  pageViews: string[];
  events: SessionEvent[];
  deviceInfo: {
    userAgent: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    screenWidth: number;
    screenHeight: number;
    viewportWidth: number;
    viewportHeight: number;
  };
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

class AdvancedAnalytics {
  private userId: string;
  private sessionId: string;
  private currentSession: UserSession | null = null;
  private events: SessionEvent[] = [];
  private clickEvents: ClickEvent[] = [];
  private scrollEvents: ScrollEvent[] = [];
  private isRecording: boolean = true;
  private heatmapData: HeatmapData = {
    clicks: [],
    scrollDepth: {},
    elementInteractions: {}
  };

  // Performance tracking
  private performanceObserver?: PerformanceObserver;
  private intersectionObserver?: IntersectionObserver;
  
  // Real-time tracking
  private eventQueue: SessionEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.userId = this.getUserId();
    this.sessionId = nanoid();
    
    this.initializeSession();
    this.setupEventListeners();
    this.startPerformanceTracking();
    this.startRealTimeSync();
    
    // Load existing data from storage
    this.loadFromStorage();
  }

  private getUserId(): string {
    let userId = localStorage.getItem('analytics_user_id');
    if (!userId) {
      userId = nanoid();
      localStorage.setItem('analytics_user_id', userId);
    }
    return userId;
  }

  private initializeSession(): void {
    const urlParams = new URLSearchParams(window.location.search);
    
    this.currentSession = {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: new Date(),
      pageViews: [window.location.pathname],
      events: [],
      deviceInfo: this.getDeviceInfo(),
      referrer: document.referrer || undefined,
      utm: {
        source: urlParams.get('utm_source') || undefined,
        medium: urlParams.get('utm_medium') || undefined,
        campaign: urlParams.get('utm_campaign') || undefined,
        term: urlParams.get('utm_term') || undefined,
        content: urlParams.get('utm_content') || undefined,
      }
    };

    this.trackEvent('pageview', {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
    });
  }

  private getDeviceInfo() {
    const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
      const width = window.innerWidth;
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    };

    return {
      userAgent: navigator.userAgent,
      deviceType: getDeviceType(),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  }

  private setupEventListeners(): void {
    // Click tracking with detailed information
    document.addEventListener('click', (event) => {
      if (!this.isRecording) return;

      const target = event.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      
      const clickEvent: ClickEvent = {
        id: nanoid(),
        timestamp: new Date(),
        x: event.clientX,
        y: event.clientY,
        elementTag: target.tagName.toLowerCase(),
        elementId: target.id || undefined,
        elementClass: target.className || undefined,
        elementText: target.textContent?.slice(0, 100) || undefined,
        pageUrl: window.location.pathname,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        userId: this.userId,
        sessionId: this.sessionId,
        deviceType: this.currentSession?.deviceInfo.deviceType || 'desktop',
        metadata: {
          elementBounds: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
          modifierKeys: {
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey,
          }
        }
      };

      this.clickEvents.push(clickEvent);
      this.heatmapData.clicks.push(clickEvent);
      
      // Track element interactions
      const selector = this.getElementSelector(target);
      this.heatmapData.elementInteractions[selector] = 
        (this.heatmapData.elementInteractions[selector] || 0) + 1;

      this.trackEvent('click', {
        element: selector,
        text: target.textContent?.slice(0, 50),
        coordinates: { x: event.clientX, y: event.clientY },
      });
    });

    // Scroll tracking
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', () => {
      if (!this.isRecording) return;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollY = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const maxScroll = documentHeight - viewportHeight;
        const scrollPercent = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;

        const scrollEvent: ScrollEvent = {
          id: nanoid(),
          timestamp: new Date(),
          scrollY,
          maxScroll,
          pageUrl: window.location.pathname,
          userId: this.userId,
          sessionId: this.sessionId,
          documentHeight,
          viewportHeight,
        };

        this.scrollEvents.push(scrollEvent);
        
        // Update scroll depth for heatmap
        if (!this.heatmapData.scrollDepth[window.location.pathname]) {
          this.heatmapData.scrollDepth[window.location.pathname] = [];
        }
        this.heatmapData.scrollDepth[window.location.pathname].push(scrollPercent);

        this.trackEvent('scroll', {
          scrollY,
          scrollPercent: Math.round(scrollPercent),
        });
      }, 100);
    });

    // Mouse movement tracking (sampled)
    let mouseMoveTimeout: NodeJS.Timeout;
    document.addEventListener('mousemove', (event) => {
      if (!this.isRecording) return;

      clearTimeout(mouseMoveTimeout);
      mouseMoveTimeout = setTimeout(() => {
        this.trackEvent('hover', {
          x: event.clientX,
          y: event.clientY,
          element: this.getElementSelector(event.target as HTMLElement),
        });
      }, 500); // Sample every 500ms
    });

    // Form interactions
    document.addEventListener('input', (event) => {
      if (!this.isRecording) return;

      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        this.trackEvent('form_interaction', {
          element: this.getElementSelector(target),
          inputType: (target as HTMLInputElement).type,
          fieldName: (target as HTMLInputElement).name || target.id,
        });
      }
    });

    // Page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
      this.saveToStorage();
      this.flush();
    });

    // Visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      this.trackEvent('visibility_change', {
        hidden: document.hidden,
      });
    });

    // Resize tracking
    window.addEventListener('resize', () => {
      this.trackEvent('resize', {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
    });
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        return `${element.tagName.toLowerCase()}.${classes[0]}`;
      }
    }
    
    return element.tagName.toLowerCase();
  }

  private startPerformanceTracking(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackEvent('performance', {
            name: entry.name,
            type: entry.entryType,
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] 
      });
    }

    // Core Web Vitals tracking
    this.trackWebVitals();
  }

  private async trackWebVitals(): Promise<void> {
    try {
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');
      
      getCLS((metric) => {
        this.trackEvent('web_vital', {
          name: 'CLS',
          value: metric.value,
          rating: this.getWebVitalRating('CLS', metric.value),
        });
      });

      getFID((metric) => {
        this.trackEvent('web_vital', {
          name: 'FID',
          value: metric.value,
          rating: this.getWebVitalRating('FID', metric.value),
        });
      });

      getFCP((metric) => {
        this.trackEvent('web_vital', {
          name: 'FCP',
          value: metric.value,
          rating: this.getWebVitalRating('FCP', metric.value),
        });
      });

      getLCP((metric) => {
        this.trackEvent('web_vital', {
          name: 'LCP',
          value: metric.value,
          rating: this.getWebVitalRating('LCP', metric.value),
        });
      });

      getTTFB((metric) => {
        this.trackEvent('web_vital', {
          name: 'TTFB',
          value: metric.value,
          rating: this.getWebVitalRating('TTFB', metric.value),
        });
      });
    } catch (error) {
      console.warn('Web Vitals not available:', error);
    }
  }

  private getWebVitalRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, [number, number]> = {
      CLS: [0.1, 0.25],
      FID: [100, 300],
      FCP: [1800, 3000],
      LCP: [2500, 4000],
      TTFB: [800, 1800],
    };

    const [good, poor] = thresholds[metric] || [0, 0];
    
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  private startRealTimeSync(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10000); // Flush every 10 seconds
  }

  public trackEvent(type: SessionEvent['type'], data: any): void {
    const event: SessionEvent = {
      id: nanoid(),
      type,
      timestamp: new Date(),
      data,
      userId: this.userId,
      sessionId: this.sessionId,
      pageUrl: window.location.pathname,
    };

    this.events.push(event);
    this.eventQueue.push(event);
    
    if (this.currentSession) {
      this.currentSession.events.push(event);
    }

    // Auto-flush for important events
    if (['purchase', 'add_to_cart', 'form_submit'].includes(type)) {
      this.flush();
    }
  }

  public trackCustomEvent(eventName: string, properties: Record<string, any>): void {
    this.trackEvent('custom', {
      eventName,
      properties,
    });
  }

  public trackConversion(goalName: string, value?: number, currency = 'USD'): void {
    this.trackEvent('custom', {
      eventName: 'conversion',
      properties: {
        goalName,
        value,
        currency,
      },
    });
  }

  // E-commerce specific tracking
  public trackPurchase(orderId: string, items: any[], total: number, currency = 'USD'): void {
    this.trackEvent('purchase', {
      orderId,
      items,
      total,
      currency,
    });
  }

  public trackAddToCart(productId: string, productName: string, price: number, quantity = 1): void {
    this.trackEvent('add_to_cart', {
      productId,
      productName,
      price,
      quantity,
    });
  }

  public trackProductView(productId: string, productName: string, category?: string): void {
    this.trackEvent('custom', {
      eventName: 'product_view',
      properties: {
        productId,
        productName,
        category,
      },
    });
  }

  // Heatmap generation
  public generateHeatmapData(pageUrl?: string): HeatmapData {
    const filteredData = pageUrl 
      ? {
          clicks: this.heatmapData.clicks.filter(c => c.pageUrl === pageUrl),
          scrollDepth: { [pageUrl]: this.heatmapData.scrollDepth[pageUrl] || [] },
          elementInteractions: this.heatmapData.elementInteractions,
        }
      : this.heatmapData;

    return filteredData;
  }

  // Session replay simulation
  public getSessionReplay(sessionId?: string): SessionEvent[] {
    const targetSessionId = sessionId || this.sessionId;
    return this.events.filter(e => e.sessionId === targetSessionId)
                     .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Analytics dashboard data
  public getAnalyticsSummary(timeRange: { start: Date; end: Date }) {
    const filteredEvents = this.events.filter(e => 
      e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
    );

    const pageViews = filteredEvents.filter(e => e.type === 'pageview');
    const uniqueUsers = new Set(filteredEvents.map(e => e.userId)).size;
    const sessions = new Set(filteredEvents.map(e => e.sessionId)).size;
    
    // Bounce rate calculation
    const sessionsWithMultiplePages = filteredEvents
      .reduce((acc, event) => {
        if (event.type === 'pageview') {
          acc[event.sessionId] = (acc[event.sessionId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
    
    const bounces = Object.values(sessionsWithMultiplePages).filter(count => count === 1).length;
    const bounceRate = sessions > 0 ? (bounces / sessions) * 100 : 0;

    return {
      pageViews: pageViews.length,
      uniqueUsers,
      sessions,
      bounceRate: Math.round(bounceRate * 100) / 100,
      averageSessionDuration: this.calculateAverageSessionDuration(filteredEvents),
      topPages: this.getTopPages(filteredEvents),
      deviceBreakdown: this.getDeviceBreakdown(),
      conversionEvents: filteredEvents.filter(e => 
        e.type === 'purchase' || 
        (e.type === 'custom' && e.data?.eventName === 'conversion')
      ).length,
    };
  }

  private calculateAverageSessionDuration(events: SessionEvent[]): number {
    const sessionDurations = new Map<string, { start: Date; end: Date }>();
    
    events.forEach(event => {
      if (!sessionDurations.has(event.sessionId)) {
        sessionDurations.set(event.sessionId, { start: event.timestamp, end: event.timestamp });
      } else {
        const session = sessionDurations.get(event.sessionId)!;
        if (event.timestamp < session.start) session.start = event.timestamp;
        if (event.timestamp > session.end) session.end = event.timestamp;
      }
    });

    const durations = Array.from(sessionDurations.values())
      .map(session => session.end.getTime() - session.start.getTime());

    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length / 1000 : 0;
  }

  private getTopPages(events: SessionEvent[]): Array<{ page: string; views: number }> {
    const pageViews = events
      .filter(e => e.type === 'pageview')
      .reduce((acc, event) => {
        const page = event.data.url || event.pageUrl;
        acc[page] = (acc[page] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(pageViews)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  private getDeviceBreakdown() {
    const devices = this.clickEvents.reduce((acc, click) => {
      acc[click.deviceType] = (acc[click.deviceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(devices).reduce((a, b) => a + b, 0);
    
    return Object.entries(devices).map(([device, count]) => ({
      device,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // In production, send to your analytics endpoint
      console.log('Flushing analytics events:', eventsToSend);
      
      // Example API call:
      // await fetch('/api/analytics/events', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ events: eventsToSend }),
      // });

    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Re-queue failed events
      this.eventQueue.unshift(...eventsToSend);
    }
  }

  private endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('analytics_events', JSON.stringify(this.events.slice(-1000))); // Keep last 1000 events
      localStorage.setItem('analytics_clicks', JSON.stringify(this.clickEvents.slice(-500))); // Keep last 500 clicks
      localStorage.setItem('analytics_heatmap', JSON.stringify(this.heatmapData));
    } catch (error) {
      console.error('Error saving analytics to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const storedEvents = localStorage.getItem('analytics_events');
      const storedClicks = localStorage.getItem('analytics_clicks');
      const storedHeatmap = localStorage.getItem('analytics_heatmap');

      if (storedEvents) {
        this.events = JSON.parse(storedEvents).map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp),
        }));
      }

      if (storedClicks) {
        this.clickEvents = JSON.parse(storedClicks).map((click: any) => ({
          ...click,
          timestamp: new Date(click.timestamp),
        }));
      }

      if (storedHeatmap) {
        this.heatmapData = JSON.parse(storedHeatmap);
      }
    } catch (error) {
      console.error('Error loading analytics from storage:', error);
    }
  }

  // Control methods
  public startRecording(): void {
    this.isRecording = true;
  }

  public stopRecording(): void {
    this.isRecording = false;
  }

  public clearData(): void {
    this.events = [];
    this.clickEvents = [];
    this.heatmapData = { clicks: [], scrollDepth: {}, elementInteractions: {} };
    localStorage.removeItem('analytics_events');
    localStorage.removeItem('analytics_clicks');
    localStorage.removeItem('analytics_heatmap');
  }
}

// Global instance
const analytics = new AdvancedAnalytics();

export { analytics, AdvancedAnalytics };
export type { SessionEvent, ClickEvent, HeatmapData, UserSession };