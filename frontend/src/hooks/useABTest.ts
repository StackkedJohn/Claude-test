import { useState, useEffect, useCallback } from 'react';
import { abTestingManager } from '../utils/abTesting';

interface UseABTestResult {
  variant: string | null;
  isInTest: boolean;
  isLoading: boolean;
  trackClick: (goalId?: string, metadata?: Record<string, any>) => void;
  trackConversion: (goalId?: string, value?: number, metadata?: Record<string, any>) => void;
  trackCustomEvent: (eventName: string, metadata?: Record<string, any>) => void;
}

export function useABTest(testId: string): UseABTestResult {
  const [variant, setVariant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeTest = async () => {
      try {
        const assignedVariant = abTestingManager.getVariant(testId);
        setVariant(assignedVariant);
      } catch (error) {
        console.error(`Error initializing A/B test ${testId}:`, error);
        setVariant(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTest();
  }, [testId]);

  const trackClick = useCallback(
    (goalId?: string, metadata?: Record<string, any>) => {
      if (variant) {
        abTestingManager.trackEvent(testId, variant, 'click', goalId, undefined, metadata);
      }
    },
    [testId, variant]
  );

  const trackConversion = useCallback(
    (goalId?: string, value?: number, metadata?: Record<string, any>) => {
      if (variant) {
        abTestingManager.trackEvent(testId, variant, 'conversion', goalId, value, metadata);
      }
    },
    [testId, variant]
  );

  const trackCustomEvent = useCallback(
    (eventName: string, metadata?: Record<string, any>) => {
      if (variant) {
        abTestingManager.trackEvent(testId, variant, 'custom', eventName, undefined, {
          eventName,
          ...metadata,
        });
      }
    },
    [testId, variant]
  );

  return {
    variant,
    isInTest: variant !== null,
    isLoading,
    trackClick,
    trackConversion,
    trackCustomEvent,
  };
}

// Hook for multiple A/B tests
export function useMultipleABTests(testIds: string[]): Record<string, UseABTestResult> {
  const [results, setResults] = useState<Record<string, UseABTestResult>>({});

  useEffect(() => {
    const initializeTests = async () => {
      const testResults: Record<string, UseABTestResult> = {};

      for (const testId of testIds) {
        try {
          const variant = abTestingManager.getVariant(testId);
          
          testResults[testId] = {
            variant,
            isInTest: variant !== null,
            isLoading: false,
            trackClick: (goalId?: string, metadata?: Record<string, any>) => {
              if (variant) {
                abTestingManager.trackEvent(testId, variant, 'click', goalId, undefined, metadata);
              }
            },
            trackConversion: (goalId?: string, value?: number, metadata?: Record<string, any>) => {
              if (variant) {
                abTestingManager.trackEvent(testId, variant, 'conversion', goalId, value, metadata);
              }
            },
            trackCustomEvent: (eventName: string, metadata?: Record<string, any>) => {
              if (variant) {
                abTestingManager.trackEvent(testId, variant, 'custom', eventName, undefined, {
                  eventName,
                  ...metadata,
                });
              }
            },
          };
        } catch (error) {
          console.error(`Error initializing A/B test ${testId}:`, error);
          testResults[testId] = {
            variant: null,
            isInTest: false,
            isLoading: false,
            trackClick: () => {},
            trackConversion: () => {},
            trackCustomEvent: () => {},
          };
        }
      }

      setResults(testResults);
    };

    initializeTests();
  }, [testIds]);

  return results;
}

// Hook for feature flags (simple on/off tests)
export function useFeatureFlag(flagId: string, defaultValue: boolean = false): {
  isEnabled: boolean;
  isLoading: boolean;
} {
  const { variant, isLoading } = useABTest(flagId);
  
  return {
    isEnabled: variant === 'enabled' || (variant === null && defaultValue),
    isLoading,
  };
}

// Hook for getting test results (for admin dashboard)
export function useABTestResults(testId: string) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getResults = () => {
      try {
        const testResults = abTestingManager.getTestResults(testId);
        setResults(testResults);
      } catch (error) {
        console.error(`Error getting results for test ${testId}:`, error);
      } finally {
        setLoading(false);
      }
    };

    getResults();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(getResults, 30000);
    
    return () => clearInterval(interval);
  }, [testId]);

  return { results, loading };
}