// A/B Testing Framework for ICEPACA
import { nanoid } from 'nanoid';

interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABVariant[];
  trafficAllocation: number; // Percentage of users to include (0-1)
  status: 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate?: Date;
  targeting?: {
    pages?: string[];
    userSegments?: string[];
    devices?: ('mobile' | 'desktop' | 'tablet')[];
  };
  conversionGoals: ConversionGoal[];
}

interface ABVariant {
  id: string;
  name: string;
  trafficSplit: number; // Percentage of test traffic (0-1)
  changes: VariantChange[];
}

interface VariantChange {
  type: 'text' | 'color' | 'layout' | 'component' | 'image';
  selector: string;
  content: any;
  metadata?: Record<string, any>;
}

interface ConversionGoal {
  id: string;
  name: string;
  type: 'click' | 'purchase' | 'signup' | 'custom';
  selector?: string;
  value?: number;
  eventName?: string;
}

interface ABTestResult {
  testId: string;
  variantId: string;
  userId: string;
  timestamp: Date;
  events: ABEvent[];
  metadata?: Record<string, any>;
}

interface ABEvent {
  type: 'impression' | 'click' | 'conversion' | 'custom';
  goalId?: string;
  value?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class ABTestingManager {
  private tests: Map<string, ABTest> = new Map();
  private userAssignments: Map<string, Map<string, string>> = new Map();
  private results: ABTestResult[] = [];
  private userId: string;
  private analyticsEnabled: boolean = true;

  constructor() {
    this.userId = this.getUserId();
    this.loadFromStorage();
  }

  private getUserId(): string {
    let userId = localStorage.getItem('ab_user_id');
    if (!userId) {
      userId = nanoid();
      localStorage.setItem('ab_user_id', userId);
    }
    return userId;
  }

  private loadFromStorage(): void {
    try {
      const storedTests = localStorage.getItem('ab_tests');
      const storedAssignments = localStorage.getItem('ab_assignments');
      const storedResults = localStorage.getItem('ab_results');

      if (storedTests) {
        const tests = JSON.parse(storedTests);
        Object.entries(tests).forEach(([id, test]: [string, any]) => {
          this.tests.set(id, {
            ...test,
            startDate: new Date(test.startDate),
            endDate: test.endDate ? new Date(test.endDate) : undefined,
          });
        });
      }

      if (storedAssignments) {
        const assignments = JSON.parse(storedAssignments);
        Object.entries(assignments).forEach(([testId, variantMap]: [string, any]) => {
          this.userAssignments.set(testId, new Map(Object.entries(variantMap)));
        });
      }

      if (storedResults) {
        this.results = JSON.parse(storedResults).map((result: any) => ({
          ...result,
          timestamp: new Date(result.timestamp),
          events: result.events.map((event: any) => ({
            ...event,
            timestamp: new Date(event.timestamp),
          })),
        }));
      }
    } catch (error) {
      console.error('Error loading A/B test data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const testsToStore = Object.fromEntries(this.tests.entries());
      const assignmentsToStore = Object.fromEntries(
        Array.from(this.userAssignments.entries()).map(([testId, variantMap]) => [
          testId,
          Object.fromEntries(variantMap.entries()),
        ])
      );

      localStorage.setItem('ab_tests', JSON.stringify(testsToStore));
      localStorage.setItem('ab_assignments', JSON.stringify(assignmentsToStore));
      localStorage.setItem('ab_results', JSON.stringify(this.results));
    } catch (error) {
      console.error('Error saving A/B test data to storage:', error);
    }
  }

  // Create a new A/B test
  public createTest(test: Omit<ABTest, 'id'>): string {
    const testId = nanoid();
    const newTest: ABTest = {
      ...test,
      id: testId,
    };

    this.tests.set(testId, newTest);
    this.saveToStorage();
    
    console.log(`Created A/B test: ${test.name} (${testId})`);
    return testId;
  }

  // Get variant for a user in a specific test
  public getVariant(testId: string): string | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'active') {
      return null;
    }

    // Check if test is within date range
    const now = new Date();
    if (now < test.startDate || (test.endDate && now > test.endDate)) {
      return null;
    }

    // Check if user should be included in test
    if (Math.random() > test.trafficAllocation) {
      return null;
    }

    // Check if user is already assigned to this test
    const testAssignments = this.userAssignments.get(testId);
    if (testAssignments && testAssignments.has(this.userId)) {
      return testAssignments.get(this.userId) || null;
    }

    // Assign user to variant based on traffic split
    const random = Math.random();
    let cumulativeSplit = 0;
    
    for (const variant of test.variants) {
      cumulativeSplit += variant.trafficSplit;
      if (random <= cumulativeSplit) {
        this.assignUserToVariant(testId, variant.id);
        this.trackEvent(testId, variant.id, 'impression');
        return variant.id;
      }
    }

    return null;
  }

  private assignUserToVariant(testId: string, variantId: string): void {
    if (!this.userAssignments.has(testId)) {
      this.userAssignments.set(testId, new Map());
    }
    
    this.userAssignments.get(testId)!.set(this.userId, variantId);
    this.saveToStorage();
  }

  // Track events
  public trackEvent(
    testId: string,
    variantId: string,
    eventType: ABEvent['type'],
    goalId?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.analyticsEnabled) return;

    const test = this.tests.get(testId);
    if (!test) return;

    const event: ABEvent = {
      type: eventType,
      goalId,
      value,
      timestamp: new Date(),
      metadata,
    };

    // Find existing result or create new one
    let result = this.results.find(
      r => r.testId === testId && r.variantId === variantId && r.userId === this.userId
    );

    if (!result) {
      result = {
        testId,
        variantId,
        userId: this.userId,
        timestamp: new Date(),
        events: [],
        metadata,
      };
      this.results.push(result);
    }

    result.events.push(event);
    this.saveToStorage();

    // Send to analytics service in production
    this.sendToAnalytics(testId, variantId, event);
  }

  private async sendToAnalytics(testId: string, variantId: string, event: ABEvent): Promise<void> {
    try {
      // In production, send to your analytics service
      console.log('Analytics Event:', {
        testId,
        variantId,
        userId: this.userId,
        event,
      });

      // Example: Send to your backend
      // await fetch('/api/analytics/ab-test', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     testId,
      //     variantId,
      //     userId: this.userId,
      //     event,
      //   }),
      // });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  // Get test results
  public getTestResults(testId: string): {
    variants: Array<{
      variantId: string;
      name: string;
      impressions: number;
      conversions: number;
      conversionRate: number;
      revenue?: number;
    }>;
    totalParticipants: number;
    isStatisticallySignificant: boolean;
  } | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    const testResults = this.results.filter(r => r.testId === testId);
    const variants = test.variants.map(variant => {
      const variantResults = testResults.filter(r => r.variantId === variant.id);
      const impressions = variantResults.length;
      const conversions = variantResults.filter(r => 
        r.events.some(e => e.type === 'conversion')
      ).length;
      const revenue = variantResults.reduce((sum, r) => 
        sum + r.events.filter(e => e.type === 'conversion').reduce((eventSum, e) => eventSum + (e.value || 0), 0), 0
      );

      return {
        variantId: variant.id,
        name: variant.name,
        impressions,
        conversions,
        conversionRate: impressions > 0 ? conversions / impressions : 0,
        revenue,
      };
    });

    // Simple statistical significance check (Z-test for proportions)
    const isStatisticallySignificant = this.checkStatisticalSignificance(variants);

    return {
      variants,
      totalParticipants: testResults.length,
      isStatisticallySignificant,
    };
  }

  private checkStatisticalSignificance(variants: Array<{ impressions: number; conversions: number; conversionRate: number }>): boolean {
    if (variants.length < 2) return false;

    const [control, ...treatments] = variants;
    const minSampleSize = 100; // Minimum sample size for significance

    if (control.impressions < minSampleSize) return false;

    // Simple Z-test for difference in proportions
    for (const treatment of treatments) {
      if (treatment.impressions < minSampleSize) continue;

      const p1 = control.conversionRate;
      const p2 = treatment.conversionRate;
      const n1 = control.impressions;
      const n2 = treatment.impressions;

      const pooledP = (control.conversions + treatment.conversions) / (n1 + n2);
      const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
      
      if (se > 0) {
        const zScore = Math.abs(p1 - p2) / se;
        if (zScore > 1.96) { // 95% confidence level
          return true;
        }
      }
    }

    return false;
  }

  // Helper methods for React components
  public useTest(testId: string): {
    variant: string | null;
    isInTest: boolean;
    trackClick: (goalId?: string, metadata?: Record<string, any>) => void;
    trackConversion: (goalId?: string, value?: number, metadata?: Record<string, any>) => void;
  } {
    const variant = this.getVariant(testId);
    
    return {
      variant,
      isInTest: variant !== null,
      trackClick: (goalId?: string, metadata?: Record<string, any>) => {
        if (variant) {
          this.trackEvent(testId, variant, 'click', goalId, undefined, metadata);
        }
      },
      trackConversion: (goalId?: string, value?: number, metadata?: Record<string, any>) => {
        if (variant) {
          this.trackEvent(testId, variant, 'conversion', goalId, value, metadata);
        }
      },
    };
  }

  // Initialize common ICEPACA tests
  public initializeDefaultTests(): void {
    // CTA Button Text Test
    this.createTest({
      name: 'CTA Button Text',
      description: 'Test different call-to-action button texts',
      variants: [
        {
          id: 'control',
          name: 'Add to Cart',
          trafficSplit: 0.5,
          changes: [
            {
              type: 'text',
              selector: '[data-testid="cta-button"]',
              content: 'Add to Cart',
            },
          ],
        },
        {
          id: 'variant-a',
          name: 'Freeze It In!',
          trafficSplit: 0.5,
          changes: [
            {
              type: 'text',
              selector: '[data-testid="cta-button"]',
              content: 'Freeze It In!',
            },
          ],
        },
      ],
      trafficAllocation: 1.0,
      status: 'active',
      startDate: new Date(),
      conversionGoals: [
        {
          id: 'add-to-cart',
          name: 'Add to Cart',
          type: 'click',
          selector: '[data-testid="cta-button"]',
        },
        {
          id: 'purchase',
          name: 'Purchase',
          type: 'purchase',
        },
      ],
    });

    // Product Card Layout Test
    this.createTest({
      name: 'Product Card Layout',
      description: 'Test different product card designs',
      variants: [
        {
          id: 'control',
          name: 'Standard Layout',
          trafficSplit: 0.33,
          changes: [
            {
              type: 'layout',
              selector: '[data-testid="product-card"]',
              content: 'standard',
            },
          ],
        },
        {
          id: 'variant-a',
          name: 'Bento Grid',
          trafficSplit: 0.33,
          changes: [
            {
              type: 'layout',
              selector: '[data-testid="product-card"]',
              content: 'bento',
            },
          ],
        },
        {
          id: 'variant-b',
          name: 'Minimalist',
          trafficSplit: 0.34,
          changes: [
            {
              type: 'layout',
              selector: '[data-testid="product-card"]',
              content: 'minimalist',
            },
          ],
        },
      ],
      trafficAllocation: 0.5, // 50% of users
      status: 'active',
      startDate: new Date(),
      conversionGoals: [
        {
          id: 'product-click',
          name: 'Product Click',
          type: 'click',
          selector: '[data-testid="product-card"]',
        },
        {
          id: 'add-to-cart',
          name: 'Add to Cart',
          type: 'click',
          selector: '[data-testid="cta-button"]',
        },
      ],
    });
  }
}

// Global instance
const abTestingManager = new ABTestingManager();

// Initialize default tests
abTestingManager.initializeDefaultTests();

export { abTestingManager, ABTestingManager };
export type { ABTest, ABVariant, ABTestResult, ConversionGoal };