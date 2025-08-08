import { Page } from '@playwright/test';

interface ABTestVariant {
  id: string;
  variant: 'A' | 'B' | 'C';
  weight: number;
  config: any;
}

interface ABTestMetrics {
  testId: string;
  variant: string;
  event: string;
  timestamp: Date;
  sessionId: string;
  userAgent: string;
  conversionValue?: number;
}

export class ABTestManager {
  private page: Page;
  private sessionId: string;
  private metrics: ABTestMetrics[] = [];

  constructor(page: Page) {
    this.page = page;
    this.sessionId = this.generateSessionId();
  }

  // Set A/B test variant for current session
  async setVariant(testId: string, variant: 'A' | 'B' | 'C'): Promise<void> {
    await this.page.addInitScript((data) => {
      window.localStorage.setItem(`abtest_${data.testId}`, JSON.stringify({
        variant: data.variant,
        timestamp: Date.now(),
        sessionId: data.sessionId
      }));
    }, { testId, variant, sessionId: this.sessionId });
  }

  // Get current variant for a test
  async getVariant(testId: string): Promise<string | null> {
    return await this.page.evaluate((testId) => {
      const data = window.localStorage.getItem(`abtest_${testId}`);
      return data ? JSON.parse(data).variant : null;
    }, testId);
  }

  // Track conversion events
  async trackConversion(testId: string, event: string, value?: number): Promise<void> {
    const variant = await this.getVariant(testId);
    if (!variant) return;

    const metric: ABTestMetrics = {
      testId,
      variant,
      event,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: await this.page.evaluate(() => navigator.userAgent),
      conversionValue: value
    };

    this.metrics.push(metric);

    // Send to analytics service
    await this.page.evaluate((metric) => {
      if (window.gtag) {
        window.gtag('event', 'ab_test_conversion', {
          test_id: metric.testId,
          variant: metric.variant,
          event_name: metric.event,
          session_id: metric.sessionId,
          value: metric.conversionValue || 0
        });
      }

      // Send to custom analytics
      fetch('/api/analytics/ab-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric)
      }).catch(err => console.error('Failed to track A/B test metric:', err));
    }, metric);
  }

  // Setup common A/B tests for e-commerce
  async setupCheckoutFlowTest(): Promise<void> {
    const variants: ABTestVariant[] = [
      {
        id: 'checkout_flow_A',
        variant: 'A',
        weight: 0.5,
        config: {
          type: 'multi_step',
          steps: ['customer_info', 'shipping', 'payment', 'review'],
          progressIndicator: true
        }
      },
      {
        id: 'checkout_flow_B',
        variant: 'B',
        weight: 0.5,
        config: {
          type: 'single_step',
          steps: ['all_in_one'],
          progressIndicator: false
        }
      }
    ];

    // Randomly assign variant based on weights
    const variant = this.selectVariantByWeight(variants);
    await this.setVariant('checkout_flow', variant.variant);

    // Configure page behavior based on variant
    await this.page.addInitScript((config) => {
      window.abTestConfig = window.abTestConfig || {};
      window.abTestConfig.checkout_flow = config;
    }, variant.config);
  }

  async setupProductPageTest(): Promise<void> {
    const variants: ABTestVariant[] = [
      {
        id: 'product_page_A',
        variant: 'A',
        weight: 0.33,
        config: {
          layout: 'traditional',
          imagePosition: 'left',
          ctaButton: 'Add to Cart'
        }
      },
      {
        id: 'product_page_B',
        variant: 'B',
        weight: 0.33,
        config: {
          layout: 'modern',
          imagePosition: 'top',
          ctaButton: 'Buy Now'
        }
      },
      {
        id: 'product_page_C',
        variant: 'C',
        weight: 0.34,
        config: {
          layout: 'minimalist',
          imagePosition: 'gallery',
          ctaButton: 'Add to Cart - Free Shipping'
        }
      }
    ];

    const variant = this.selectVariantByWeight(variants);
    await this.setVariant('product_page', variant.variant);
    
    await this.page.addInitScript((config) => {
      window.abTestConfig = window.abTestConfig || {};
      window.abTestConfig.product_page = config;
    }, variant.config);
  }

  async setupPricingTest(): Promise<void> {
    const variants: ABTestVariant[] = [
      {
        id: 'pricing_A',
        variant: 'A',
        weight: 0.5,
        config: {
          displayType: 'standard',
          showDiscount: false,
          priceFormat: '$XX.XX'
        }
      },
      {
        id: 'pricing_B',
        variant: 'B',
        weight: 0.5,
        config: {
          displayType: 'strikethrough',
          showDiscount: true,
          priceFormat: '$XX.XX (Save XX%)'
        }
      }
    ];

    const variant = this.selectVariantByWeight(variants);
    await this.setVariant('pricing', variant.variant);
    
    await this.page.addInitScript((config) => {
      window.abTestConfig = window.abTestConfig || {};
      window.abTestConfig.pricing = config;
    }, variant.config);
  }

  // Track page views for funnel analysis
  async trackPageView(testId: string, page: string): Promise<void> {
    await this.trackConversion(testId, `page_view_${page}`);
  }

  // Track form interactions
  async trackFormInteraction(testId: string, field: string, action: string): Promise<void> {
    await this.trackConversion(testId, `form_${field}_${action}`);
  }

  // Track button clicks
  async trackButtonClick(testId: string, buttonId: string): Promise<void> {
    await this.trackConversion(testId, `button_click_${buttonId}`);
  }

  // Generate statistical report
  getTestResults(testId: string): {
    variantA: { conversions: number; views: number; rate: number };
    variantB: { conversions: number; views: number; rate: number };
    variantC?: { conversions: number; views: number; rate: number };
    significance: number;
    winner: string | null;
  } {
    const testMetrics = this.metrics.filter(m => m.testId === testId);
    
    const variantStats = testMetrics.reduce((acc, metric) => {
      if (!acc[metric.variant]) {
        acc[metric.variant] = { conversions: 0, views: 0 };
      }
      
      if (metric.event.includes('conversion') || metric.event.includes('completed')) {
        acc[metric.variant].conversions++;
      }
      
      if (metric.event.includes('view')) {
        acc[metric.variant].views++;
      }
      
      return acc;
    }, {} as any);

    const results: any = {};
    
    Object.keys(variantStats).forEach(variant => {
      const stats = variantStats[variant];
      results[`variant${variant}`] = {
        conversions: stats.conversions,
        views: stats.views,
        rate: stats.views > 0 ? (stats.conversions / stats.views) * 100 : 0
      };
    });

    // Simple significance calculation (Chi-square test would be more accurate)
    const variantA = results.variantA || { rate: 0 };
    const variantB = results.variantB || { rate: 0 };
    
    const difference = Math.abs(variantA.rate - variantB.rate);
    results.significance = difference > 2 ? 95 : (difference > 1 ? 80 : 0);
    
    if (results.significance >= 95) {
      results.winner = variantA.rate > variantB.rate ? 'A' : 'B';
    } else {
      results.winner = null;
    }

    return results;
  }

  // Helper methods
  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  private selectVariantByWeight(variants: ABTestVariant[]): ABTestVariant {
    const random = Math.random();
    let cumulativeWeight = 0;
    
    for (const variant of variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        return variant;
      }
    }
    
    return variants[0]; // Fallback
  }

  // Export metrics for analysis
  exportMetrics(): ABTestMetrics[] {
    return [...this.metrics];
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = [];
  }

  // Setup real-time metrics collection
  async enableRealTimeTracking(): Promise<void> {
    await this.page.addInitScript(() => {
      // Track all clicks
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const testId = target.getAttribute('data-ab-test');
        const variant = target.getAttribute('data-ab-variant');
        
        if (testId && variant) {
          const metric = {
            testId,
            variant,
            event: 'click',
            element: target.tagName.toLowerCase(),
            elementId: target.id || 'unknown',
            timestamp: new Date().toISOString()
          };
          
          fetch('/api/analytics/ab-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metric)
          }).catch(() => {});
        }
      });

      // Track form submissions
      document.addEventListener('submit', (event) => {
        const form = event.target as HTMLFormElement;
        const testId = form.getAttribute('data-ab-test');
        const variant = form.getAttribute('data-ab-variant');
        
        if (testId && variant) {
          const metric = {
            testId,
            variant,
            event: 'form_submit',
            formId: form.id || 'unknown',
            timestamp: new Date().toISOString()
          };
          
          fetch('/api/analytics/ab-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metric)
          }).catch(() => {});
        }
      });
    });
  }
}