import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { performanceOptimizer } from '../../utils/performance';
import { analytics } from '../../utils/analytics';
import { cn } from '../../utils/cn';

interface MobileOptimizationProps {
  children: React.ReactNode;
  enablePerformanceMonitoring?: boolean;
  enableMobileOptimizations?: boolean;
}

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: string;
  orientation: 'portrait' | 'landscape';
  touchSupport: boolean;
  connectionType: string;
  memoryStatus: 'low' | 'medium' | 'high';
}

interface PerformanceStatus {
  score: number;
  loadTime: number;
  recommendations: string[];
  optimizationsApplied: string[];
}

const MobileOptimization: React.FC<MobileOptimizationProps> = ({
  children,
  enablePerformanceMonitoring = true,
  enableMobileOptimizations = true
}) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [performanceStatus, setPerformanceStatus] = useState<PerformanceStatus | null>(null);
  const [optimizationsActive, setOptimizationsActive] = useState<string[]>([]);
  const [showPerformanceIndicator, setShowPerformanceIndicator] = useState(false);

  // Detect device characteristics
  const detectDevice = useCallback((): DeviceInfo => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    
    const screenSize = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    const orientation = width > height ? 'landscape' : 'portrait';
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Detect connection type
    let connectionType = 'unknown';
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connectionType = connection?.effectiveType || 'unknown';
    }
    
    // Estimate memory status
    let memoryStatus: 'low' | 'medium' | 'high' = 'medium';
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      if (memoryRatio > 0.8) memoryStatus = 'low';
      else if (memoryRatio < 0.4) memoryStatus = 'high';
    }
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      screenSize,
      orientation,
      touchSupport,
      connectionType,
      memoryStatus
    };
  }, []);

  // Apply mobile-specific optimizations
  const applyMobileOptimizations = useCallback((device: DeviceInfo) => {
    const optimizations: string[] = [];
    
    if (device.isMobile) {
      // Mobile-specific optimizations
      document.documentElement.classList.add('mobile-device');
      optimizations.push('mobile-layout');
      
      // Reduce animation complexity
      if (device.connectionType === '2g' || device.connectionType === 'slow-2g') {
        document.documentElement.classList.add('reduce-motion');
        optimizations.push('reduced-animations');
      }
      
      // Touch-specific optimizations
      if (device.touchSupport) {
        document.documentElement.classList.add('touch-device');
        optimizations.push('touch-optimization');
      }
      
      // Memory optimizations
      if (device.memoryStatus === 'low') {
        document.documentElement.classList.add('low-memory');
        optimizations.push('memory-optimization');
        
        // Disable heavy features
        document.documentElement.style.setProperty('--enable-3d', '0');
        document.documentElement.style.setProperty('--enable-particles', '0');
      }
      
      // Viewport optimization
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no');
        optimizations.push('viewport-optimization');
      }
      
      // Prevent zoom on input focus (iOS)
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
          }
        });
        
        input.addEventListener('blur', () => {
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no');
          }
        });
      });
      
      optimizations.push('input-zoom-prevention');
    }
    
    // Tablet optimizations
    if (device.isTablet) {
      document.documentElement.classList.add('tablet-device');
      optimizations.push('tablet-layout');
    }
    
    // Orientation-specific optimizations
    document.documentElement.classList.add(`orientation-${device.orientation}`);
    optimizations.push(`orientation-${device.orientation}`);
    
    return optimizations;
  }, []);

  // Monitor performance metrics
  const monitorPerformance = useCallback(() => {
    if (!enablePerformanceMonitoring) return;
    
    const metrics = performanceOptimizer.getMetrics();
    const score = performanceOptimizer.getPerformanceScore();
    const loadTime = metrics.loadComplete || 0;
    
    const recommendations: string[] = [];
    if (loadTime > 2000) recommendations.push('Optimize load time');
    if (metrics.lcp && metrics.lcp > 2500) recommendations.push('Improve Largest Contentful Paint');
    if (metrics.fid && metrics.fid > 100) recommendations.push('Reduce First Input Delay');
    if (metrics.cls && metrics.cls > 0.1) recommendations.push('Fix Cumulative Layout Shift');
    
    setPerformanceStatus({
      score,
      loadTime,
      recommendations,
      optimizationsApplied: optimizationsActive
    });
    
    // Show performance indicator for poor performance
    setShowPerformanceIndicator(score < 80 || loadTime > 3000);
    
    // Track performance metrics
    analytics.trackCustomEvent('mobile_performance_check', {
      score,
      loadTime,
      deviceType: deviceInfo?.screenSize,
      connectionType: deviceInfo?.connectionType,
      memoryStatus: deviceInfo?.memoryStatus
    });
  }, [enablePerformanceMonitoring, optimizationsActive, deviceInfo]);

  // Initialize optimizations
  useEffect(() => {
    const device = detectDevice();
    setDeviceInfo(device);
    
    if (enableMobileOptimizations) {
      const optimizations = applyMobileOptimizations(device);
      setOptimizationsActive(optimizations);
      
      // Apply performance optimizations
      performanceOptimizer.optimizeForMobile();
    }
    
    // Initial performance check
    setTimeout(monitorPerformance, 1000);
    
    // Set up periodic performance monitoring
    const performanceInterval = setInterval(monitorPerformance, 30000); // Every 30 seconds
    
    // Handle orientation changes
    const handleOrientationChange = () => {
      setTimeout(() => {
        const newDevice = detectDevice();
        setDeviceInfo(newDevice);
        
        if (enableMobileOptimizations) {
          // Re-apply optimizations for new orientation
          document.documentElement.className = document.documentElement.className
            .replace(/orientation-(portrait|landscape)/g, '')
            .trim();
          
          document.documentElement.classList.add(`orientation-${newDevice.orientation}`);
        }
      }, 100);
    };
    
    // Handle resize events
    const handleResize = () => {
      const newDevice = detectDevice();
      if (newDevice.screenSize !== device.screenSize) {
        setDeviceInfo(newDevice);
        
        if (enableMobileOptimizations) {
          const newOptimizations = applyMobileOptimizations(newDevice);
          setOptimizationsActive(newOptimizations);
        }
      }
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(performanceInterval);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [detectDevice, applyMobileOptimizations, monitorPerformance, enableMobileOptimizations]);

  // Handle performance improvement suggestions
  const applyPerformanceFix = useCallback((fix: string) => {
    switch (fix) {
      case 'Optimize load time':
        // Enable aggressive caching
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ action: 'preloadResources', resources: ['/css/critical.css', '/fonts/inter-var.woff2'] });
        }
        break;
        
      case 'Improve Largest Contentful Paint':
        // Preload critical images
        const criticalImages = document.querySelectorAll('img[data-critical="true"]');
        criticalImages.forEach(img => {
          const imgEl = img as HTMLImageElement;
          if (imgEl.dataset.src) {
            imgEl.src = imgEl.dataset.src;
          }
        });
        break;
        
      case 'Reduce First Input Delay':
        // Defer non-critical JavaScript
        document.documentElement.style.setProperty('--animation-duration', '0.1s');
        break;
        
      case 'Fix Cumulative Layout Shift':
        // Add explicit dimensions to images without them
        const images = document.querySelectorAll('img:not([width]):not([height])');
        images.forEach(img => {
          const imgEl = img as HTMLImageElement;
          if (imgEl.naturalWidth && imgEl.naturalHeight) {
            imgEl.style.aspectRatio = `${imgEl.naturalWidth} / ${imgEl.naturalHeight}`;
          }
        });
        break;
    }
    
    // Re-check performance after applying fix
    setTimeout(monitorPerformance, 1000);
  }, [monitorPerformance]);

  return (
    <div className={cn(
      'mobile-optimization-wrapper',
      deviceInfo?.isMobile && 'mobile-optimized',
      deviceInfo?.isTablet && 'tablet-optimized',
      deviceInfo?.touchSupport && 'touch-enabled',
      deviceInfo?.connectionType === '2g' && 'slow-connection',
      deviceInfo?.memoryStatus === 'low' && 'low-memory-device'
    )}>
      {children}
      
      {/* Performance Indicator */}
      <AnimatePresence>
        {showPerformanceIndicator && performanceStatus && enablePerformanceMonitoring && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 z-50 max-w-xs"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  performanceStatus.score > 80 ? 'bg-green-500' :
                  performanceStatus.score > 60 ? 'bg-yellow-500' : 'bg-red-500'
                )} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Performance: {performanceStatus.score}
                </span>
              </div>
              
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Load time: {performanceStatus.loadTime.toFixed(0)}ms
              </div>
              
              {performanceStatus.recommendations.length > 0 && (
                <div className="space-y-1">
                  {performanceStatus.recommendations.slice(0, 2).map((rec, index) => (
                    <button
                      key={index}
                      onClick={() => applyPerformanceFix(rec)}
                      className="w-full text-left text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      → {rec}
                    </button>
                  ))}
                </div>
              )}
              
              <button
                onClick={() => setShowPerformanceIndicator(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Development Info (only in development) */}
      {process.env.NODE_ENV === 'development' && deviceInfo && (
        <div className="fixed top-4 left-4 z-50 max-w-xs">
          <details className="bg-black bg-opacity-80 text-white text-xs p-2 rounded">
            <summary className="cursor-pointer">Device Info</summary>
            <div className="mt-2 space-y-1">
              <div>Device: {deviceInfo.screenSize}</div>
              <div>Orientation: {deviceInfo.orientation}</div>
              <div>Connection: {deviceInfo.connectionType}</div>
              <div>Memory: {deviceInfo.memoryStatus}</div>
              <div>Touch: {deviceInfo.touchSupport ? 'Yes' : 'No'}</div>
              {optimizationsActive.length > 0 && (
                <div>Optimizations: {optimizationsActive.join(', ')}</div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default MobileOptimization;
export type { DeviceInfo, PerformanceStatus };