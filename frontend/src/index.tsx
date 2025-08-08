import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/mobile-optimizations.css';
import App from './App';
import MobileOptimization from './components/MobileOptimization/MobileOptimization';
import reportWebVitals from './reportWebVitals';
import { registerSW, setupPWAInstallPrompt } from './utils/swRegistration';
import { measureWebVitals, optimizeFontLoading, performanceOptimizer } from './utils/performance';
import { analytics } from './utils/analytics';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Initialize performance optimization
optimizeFontLoading();
performanceOptimizer.optimizeForMobile();

root.render(
  <React.StrictMode>
    <MobileOptimization
      enablePerformanceMonitoring={process.env.NODE_ENV === 'production'}
      enableMobileOptimizations={true}
    >
      <App />
    </MobileOptimization>
  </React.StrictMode>
);

// Register service worker for PWA functionality
registerSW({
  onSuccess: (registration) => {
    console.log('Service Worker registered successfully:', registration);
  },
  onUpdate: (registration) => {
    console.log('Service Worker updated:', registration);
    // Optionally show a user notification about the update
  }
});

// Setup PWA install prompt
setupPWAInstallPrompt();

// Measure Web Vitals for performance monitoring
measureWebVitals();

// Enhanced Web Vitals reporting with performance optimization
reportWebVitals((metric) => {
  // Track performance metrics in analytics
  analytics.trackCustomEvent('web_vital', {
    name: metric.name,
    value: metric.value,
    delta: metric.delta,
    id: metric.id,
    rating: getWebVitalRating(metric.name, metric.value)
  });
  
  // Report to performance optimizer
  performanceOptimizer.reportMetrics();
  
  // Send to external analytics in production
  if (process.env.NODE_ENV === 'production') {
    console.log('Web Vital:', metric);
    // Example: gtag('event', metric.name, { value: metric.value });
  }
});

// Web Vital rating helper
function getWebVitalRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
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

// Emergency performance mode for very slow devices
if (navigator.hardwareConcurrency <= 2 && 'memory' in performance) {
  const memory = (performance as any).memory;
  if (memory && memory.jsHeapSizeLimit < 1073741824) { // Less than 1GB
    document.documentElement.classList.add('emergency-performance-mode');
    console.warn('Emergency performance mode activated for low-end device');
  }
}
