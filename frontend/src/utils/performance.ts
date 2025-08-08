// Advanced Performance Optimization Utilities for Sub-2s Load Times
import React from 'react';
import { analytics } from './analytics';

// Debounce function for search and input
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Throttle function for scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Dynamic import wrapper with loading state
export function dynamicImport<T = any>(
  importFunc: () => Promise<{ default: T }>
): Promise<T> {
  return importFunc().then(module => module.default);
}

// Image compression utility
export function compressImage(
  file: File, 
  quality: number = 0.8,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
}

// Lazy loading hook for components
export function useLazyLoading(threshold: number = 0.1) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const ref = React.useRef<HTMLElement>(null);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [threshold]);
  
  return [ref, isIntersecting] as const;
}

// Web Vitals measurement
export function measureWebVitals() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Measure First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          console.log('FCP:', entry.startTime);
        }
      }
    });
    
    observer.observe({ entryTypes: ['paint'] });
    
    // Measure Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    });
    
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    
    // Measure Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          console.log('CLS:', clsValue);
        }
      }
    });
    
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }
}

// Resource preloading
export function preloadResource(href: string, as: string = 'script') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
}

// Critical CSS inlining
export function inlineCriticalCSS(css: string) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

// Font loading optimization
export function optimizeFontLoading() {
  // Preload critical fonts
  const fonts = [
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap'
  ];
  
  fonts.forEach(font => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = font;
    link.as = 'style';
    link.onload = () => {
      link.rel = 'stylesheet';
    };
    document.head.appendChild(link);
  });
}

// Service Worker cache management
export function clearOldCaches() {
  if ('serviceWorker' in navigator && 'caches' in window) {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== 'icepaca-v1')
          .map(cacheName => caches.delete(cacheName))
      );
    });
  }
}

// Memory usage monitoring
export function monitorMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory Usage:', {
      used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
      total: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB'
    });
  }
}

// Network speed detection
export function detectNetworkSpeed(): Promise<string> {
  return new Promise((resolve) => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      resolve(connection.effectiveType || 'unknown');
    } else {
      // Fallback: measure download speed
      const startTime = performance.now();
      const image = new Image();
      
      image.onload = () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (duration < 100) {
          resolve('4g');
        } else if (duration < 300) {
          resolve('3g');
        } else {
          resolve('2g');
        }
      };
      
      image.src = '/logo192.png?' + Math.random();
    }
  });
}

// Bundle size analysis
export function analyzeBundleSize() {
  if (process.env.NODE_ENV === 'development') {
    import('webpack-bundle-analyzer').then(({ BundleAnalyzerPlugin }) => {
      console.log('Bundle analysis available in production build');
    });
  }
}

// Advanced Performance Metrics Interface
interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  domContentLoaded: number;
  loadComplete: number;
  resourceLoadTimes: Array<{ name: string; duration: number; size?: number }>;
  bundleSize: number;
}

interface OptimizationConfig {
  enableImageLazyLoading: boolean;
  enableCodeSplitting: boolean;
  enableServiceWorker: boolean;
  enableResourcePreloading: boolean;
  compressionLevel: 'low' | 'medium' | 'high';
  cacheStrategy: 'aggressive' | 'moderate' | 'conservative';
}

class PerformanceOptimizer {
  private metrics: Partial<PerformanceMetrics> = {};
  private config: OptimizationConfig;
  private observer: IntersectionObserver | null = null;
  private preloadedResources: Set<string> = new Set();
  
  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      enableImageLazyLoading: true,
      enableCodeSplitting: true,
      enableServiceWorker: true,
      enableResourcePreloading: true,
      compressionLevel: 'high',
      cacheStrategy: 'aggressive',
      ...config
    };
    
    this.initialize();
  }

  private initialize(): void {
    // Set up performance monitoring
    this.setupPerformanceObserver();
    
    // Initialize optimizations
    if (this.config.enableImageLazyLoading) this.setupImageLazyLoading();
    if (this.config.enableResourcePreloading) this.setupResourcePreloading();
    if (this.config.enableServiceWorker) this.registerServiceWorker();
    
    // Monitor resource loading
    this.monitorResourceLoading();
    
    // Setup automatic optimization triggers
    this.setupOptimizationTriggers();
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
    }

    // Fallback for browsers without PerformanceObserver
    window.addEventListener('load', () => {
      this.calculateLoadMetrics();
    });
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        this.metrics.domContentLoaded = navEntry.domContentLoadedEventStart - navEntry.navigationStart;
        this.metrics.loadComplete = navEntry.loadEventStart - navEntry.navigationStart;
        this.metrics.ttfb = navEntry.responseStart - navEntry.navigationStart;
        break;
        
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime;
        }
        break;
        
      case 'largest-contentful-paint':
        this.metrics.lcp = entry.startTime;
        break;
        
      case 'first-input':
        const fidEntry = entry as any;
        this.metrics.fid = fidEntry.processingStart - entry.startTime;
        break;
        
      case 'layout-shift':
        const clsEntry = entry as any;
        if (!clsEntry.hadRecentInput) {
          this.metrics.cls = (this.metrics.cls || 0) + clsEntry.value;
        }
        break;
    }
  }

  private calculateLoadMetrics(): void {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    this.metrics.domContentLoaded = perfData.domContentLoadedEventStart - perfData.navigationStart;
    this.metrics.loadComplete = perfData.loadEventStart - perfData.navigationStart;
    this.metrics.ttfb = perfData.responseStart - perfData.navigationStart;
  }

  private setupImageLazyLoading(): void {
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            const srcset = img.dataset.srcset;
            
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
            }
            
            if (srcset) {
              img.srcset = srcset;
              img.removeAttribute('data-srcset');
            }
            
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-loaded');
            observer.unobserve(img);
            
            // Track successful lazy load
            analytics.trackCustomEvent('image_lazy_loaded', {
              src: src || img.src,
              loadTime: performance.now()
            });
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );

    // Observe all lazy images
    this.observeLazyImages();
    
    // Set up mutation observer for dynamically added images
    const mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const element = node as Element;
            const lazyImages = element.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => this.observer?.observe(img));
          }
        });
      });
    });
    
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  private observeLazyImages(): void {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => this.observer?.observe(img));
  }

  private setupResourcePreloading(): void {
    // Critical CSS preloading
    this.preloadAdvancedResource('/css/critical.css', 'style');
    
    // Font preloading
    this.preloadAdvancedResource('/fonts/inter-var.woff2', 'font', 'font/woff2');
    this.preloadAdvancedResource('/fonts/alpaca-icons.woff2', 'font', 'font/woff2');
    
    // Critical images
    this.preloadAdvancedResource('/images/hero-alpaca.webp', 'image');
    this.preloadAdvancedResource('/images/logo.svg', 'image');
    
    // Critical API data
    if (window.location.pathname === '/shop' || window.location.pathname === '/') {
      this.preloadAdvancedResource('/api/products/featured', 'fetch');
    }
  }

  private preloadAdvancedResource(href: string, as: string, type?: string): void {
    if (this.preloadedResources.has(href)) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    
    if (type) link.type = type;
    if (as === 'font') link.crossOrigin = 'anonymous';
    
    document.head.appendChild(link);
    this.preloadedResources.add(href);
    
    // Track preload success/failure
    link.addEventListener('load', () => {
      analytics.trackCustomEvent('resource_preloaded', {
        href,
        as,
        success: true
      });
    });
    
    link.addEventListener('error', () => {
      analytics.trackCustomEvent('resource_preload_failed', {
        href,
        as,
        success: false
      });
    });
  }

  private monitorResourceLoading(): void {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    this.metrics.resourceLoadTimes = resources.map(resource => ({
      name: resource.name,
      duration: resource.duration,
      size: (resource as any).transferSize
    }));

    // Calculate bundle size estimation
    const jsResources = resources.filter(r => r.name.includes('.js'));
    this.metrics.bundleSize = jsResources.reduce((total, resource) => {
      return total + ((resource as any).transferSize || 0);
    }, 0);
  }

  private setupOptimizationTriggers(): void {
    // Optimize when performance is poor
    setTimeout(() => {
      if (this.shouldOptimize()) {
        this.applyPerformanceOptimizations();
      }
    }, 3000);

    // Connection-aware optimizations
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.effectiveType) {
        this.applyConnectionBasedOptimizations(connection.effectiveType);
      }
    }

    // Memory-aware optimizations
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory && memory.usedJSHeapSize > memory.totalJSHeapSize * 0.8) {
        this.applyMemoryOptimizations();
      }
    }
  }

  private shouldOptimize(): boolean {
    const { lcp, fid, cls, loadComplete } = this.metrics;
    
    return (
      (lcp && lcp > 2500) || // Poor LCP
      (fid && fid > 100) ||  // Poor FID
      (cls && cls > 0.1) ||  // Poor CLS
      (loadComplete && loadComplete > 2000) // Slow load
    );
  }

  private applyPerformanceOptimizations(): void {
    // Reduce animation complexity on slow devices
    if (this.metrics.fid && this.metrics.fid > 200) {
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
      document.documentElement.classList.add('reduce-motion');
    }

    // Lazy load non-critical components
    this.lazyLoadComponents();
    
    // Reduce image quality on slow connections
    this.optimizeImageQuality();
    
    // Defer non-critical JavaScript
    this.deferNonCriticalJS();
  }

  private applyConnectionBasedOptimizations(effectiveType: string): void {
    if (['slow-2g', '2g'].includes(effectiveType)) {
      // Ultra-light mode for very slow connections
      document.documentElement.classList.add('connection-slow');
      this.disableHeavyAnimations();
      this.reduceImageQuality('low');
      this.limitConcurrentRequests(2);
    } else if (effectiveType === '3g') {
      // Moderate optimizations for 3G
      document.documentElement.classList.add('connection-moderate');
      this.reduceImageQuality('medium');
      this.limitConcurrentRequests(4);
    }
  }

  private applyMemoryOptimizations(): void {
    // Clear unnecessary caches
    this.clearNonEssentialCaches();
    
    // Limit concurrent image loading
    this.limitConcurrentRequests(3);
    
    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  private lazyLoadComponents(): void {
    // Lazy load heavy components that aren't immediately visible
    const components = [
      'ProductViewer3D',
      'VoiceSearch',
      'AdvancedFilter',
      'RecommendationEngine'
    ];
    
    components.forEach(component => {
      const elements = document.querySelectorAll(`[data-component="${component}"]`);
      elements.forEach(el => {
        if (this.observer && !this.isInViewport(el)) {
          this.observer.observe(el);
        }
      });
    });
  }

  private optimizeImageQuality(): void {
    const images = document.querySelectorAll('img[src*=".jpg"], img[src*=".jpeg"], img[src*=".png"]');
    images.forEach((img: Element) => {
      const imgElement = img as HTMLImageElement;
      if (imgElement.dataset.optimized !== 'true') {
        const src = imgElement.src;
        // Add quality parameters for supported image services
        if (src.includes('cloudinary.com') || src.includes('imagekit.io')) {
          imgElement.src = src + (src.includes('?') ? '&' : '?') + 'q_70,f_auto';
        }
        imgElement.dataset.optimized = 'true';
      }
    });
  }

  private deferNonCriticalJS(): void {
    const scripts = document.querySelectorAll('script[data-defer="true"]');
    scripts.forEach(script => {
      if (!script.hasAttribute('defer')) {
        script.setAttribute('defer', '');
      }
    });
  }

  private disableHeavyAnimations(): void {
    const style = document.createElement('style');
    style.textContent = `
      .bento-item, .product-card, .alpaca-wink {
        animation-duration: 0.1s !important;
        transition-duration: 0.1s !important;
      }
      .ice-melt-transition {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  private reduceImageQuality(level: 'low' | 'medium' | 'high'): void {
    const qualityMap = { low: 40, medium: 60, high: 80 };
    const quality = qualityMap[level];
    
    document.documentElement.style.setProperty('--image-quality', quality.toString());
  }

  private limitConcurrentRequests(maxConcurrent: number): void {
    // Store reference for request limiting
    (window as any).__maxConcurrentRequests = maxConcurrent;
  }

  private clearNonEssentialCaches(): void {
    try {
      // Clear analytics cache
      localStorage.removeItem('analytics_events');
      
      // Clear old recommendation data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('recommendation_') && 
            Date.now() - parseInt(localStorage.getItem(key + '_timestamp') || '0') > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear caches:', error);
    }
  }

  private isInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered for performance optimization');
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  // Public API methods
  public getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  public getPerformanceScore(): number {
    const { fcp, lcp, fid, cls, loadComplete } = this.metrics;
    
    let score = 100;
    
    // Deduct points for poor metrics
    if (lcp && lcp > 2500) score -= 30;
    else if (lcp && lcp > 1200) score -= 15;
    
    if (fid && fid > 100) score -= 25;
    else if (fid && fid > 50) score -= 10;
    
    if (cls && cls > 0.25) score -= 25;
    else if (cls && cls > 0.1) score -= 10;
    
    if (loadComplete && loadComplete > 3000) score -= 20;
    else if (loadComplete && loadComplete > 2000) score -= 10;
    
    return Math.max(0, score);
  }

  public optimizeForMobile(): void {
    // Mobile-specific optimizations
    document.documentElement.classList.add('mobile-optimized');
    
    // Disable hover effects on touch devices
    if ('ontouchstart' in window) {
      document.documentElement.classList.add('touch-device');
    }
    
    // Optimize viewport
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    }
    
    // Reduce animation complexity
    if (window.innerWidth < 768) {
      this.disableHeavyAnimations();
    }
  }

  public reportMetrics(): void {
    const metrics = this.getMetrics();
    const score = this.getPerformanceScore();
    
    // Report to analytics
    analytics.trackCustomEvent('performance_metrics', {
      ...metrics,
      performanceScore: score,
      timestamp: Date.now()
    });
    
    // Report to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('Performance Metrics');
      console.log('Performance Score:', score);
      console.log('Metrics:', metrics);
      console.groupEnd();
    }
  }
}

// Create global instance
const performanceOptimizer = new PerformanceOptimizer();

// Export utilities
export { PerformanceOptimizer, performanceOptimizer };
export type { PerformanceMetrics, OptimizationConfig };