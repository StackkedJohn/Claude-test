import { test, expect } from '@playwright/test';

test.describe('Performance Benchmarks', () => {
  
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Measure Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        
        // Largest Contentful Paint
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            vitals.lcp = entries[entries.length - 1].startTime;
          }
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // First Input Delay - simulate with click
        document.addEventListener('click', (event) => {
          vitals.fid = performance.now() - (event as any).timeStamp;
        }, { once: true });
        
        // Cumulative Layout Shift
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ type: 'layout-shift', buffered: true });
        
        // First Contentful Paint
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            vitals.fcp = entries[0].startTime;
          }
        }).observe({ type: 'paint', buffered: true });
        
        // Time to Interactive (approximation)
        setTimeout(() => {
          vitals.tti = performance.now();
          resolve(vitals);
        }, 100);
      });
    });

    // Verify Core Web Vitals meet Google's thresholds
    expect(webVitals.lcp).toBeLessThan(2500); // LCP should be < 2.5s
    expect(webVitals.fcp).toBeLessThan(1800); // FCP should be < 1.8s  
    expect(webVitals.cls).toBeLessThan(0.1);  // CLS should be < 0.1
    expect(webVitals.tti).toBeLessThan(3800); // TTI should be < 3.8s
  });

  test('should load critical resources quickly', async ({ page }) => {
    const resourceTimings: any[] = [];
    
    // Track resource loading
    page.on('response', (response) => {
      resourceTimings.push({
        url: response.url(),
        status: response.status(),
        timing: response.timing(),
        type: response.request().resourceType(),
        size: response.headers()['content-length'] || 0
      });
    });

    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const domLoadTime = Date.now() - startTime;

    // DOM should load quickly
    expect(domLoadTime).toBeLessThan(2000);

    // Check critical resource timings
    const criticalResources = resourceTimings.filter(r => 
      r.type === 'document' || 
      r.type === 'stylesheet' || 
      r.url.includes('critical')
    );

    criticalResources.forEach(resource => {
      const totalTime = resource.timing?.responseEnd || 0;
      expect(totalTime).toBeLessThan(1500); // Critical resources < 1.5s
    });
  });

  test('should optimize image loading', async ({ page }) => {
    const imageRequests: any[] = [];
    
    page.on('request', request => {
      if (request.resourceType() === 'image') {
        imageRequests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    page.on('response', response => {
      if (response.request().resourceType() === 'image') {
        const request = imageRequests.find(r => r.url === response.url());
        if (request) {
          request.status = response.status();
          request.size = parseInt(response.headers()['content-length'] || '0');
          request.format = response.headers()['content-type'];
        }
      }
    });

    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Check for modern image formats
    const modernFormats = imageRequests.filter(img => 
      img.format?.includes('webp') || 
      img.format?.includes('avif')
    );
    
    expect(modernFormats.length).toBeGreaterThan(0);

    // Check image sizes are reasonable
    const largImages = imageRequests.filter(img => img.size > 500000); // > 500KB
    expect(largImages.length).toBeLessThan(3); // Limit large images

    // Verify lazy loading (images below fold shouldn't load immediately)
    await page.evaluate(() => {
      window.scrollTo(0, 0); // Scroll to top
    });
    
    const initialImages = imageRequests.length;
    
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight); // Scroll to bottom
    });
    
    await page.waitForTimeout(1000);
    expect(imageRequests.length).toBeGreaterThan(initialImages); // More images loaded
  });

  test('should have efficient JavaScript execution', async ({ page }) => {
    await page.goto('/');
    
    // Measure JavaScript execution time
    const jsMetrics = await page.evaluate(() => {
      const start = performance.now();
      
      // Simulate some DOM manipulation
      const elements = document.querySelectorAll('*');
      elements.forEach(el => el.getAttribute('class'));
      
      const end = performance.now();
      
      return {
        executionTime: end - start,
        domElements: elements.length,
        heapUsed: (performance as any).memory?.usedJSHeapSize || 0,
        heapTotal: (performance as any).memory?.totalJSHeapSize || 0
      };
    });

    // JavaScript should execute efficiently
    expect(jsMetrics.executionTime).toBeLessThan(100); // < 100ms for basic operations
    
    // Memory usage should be reasonable
    if (jsMetrics.heapUsed > 0) {
      expect(jsMetrics.heapUsed).toBeLessThan(50 * 1024 * 1024); // < 50MB
    }
  });

  test('should handle concurrent users efficiently', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    
    // Simulate concurrent page loads
    const startTime = Date.now();
    const loadPromises = pages.map(page => page.goto('/'));
    
    await Promise.all(loadPromises);
    const concurrentLoadTime = Date.now() - startTime;
    
    // Should handle concurrent loads within reasonable time
    expect(concurrentLoadTime).toBeLessThan(5000);
    
    // Test concurrent interactions
    const interactionPromises = pages.map(async (page) => {
      await page.click('[data-testid="product-card"]');
      await page.click('[data-testid="add-to-cart"]');
      return page.locator('[data-testid="cart-count"]').textContent();
    });
    
    const results = await Promise.all(interactionPromises);
    
    // All interactions should succeed
    results.forEach(result => {
      expect(result).toBe('1');
    });
    
    // Cleanup
    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('should optimize network requests', async ({ page }) => {
    const networkRequests: any[] = [];
    
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        headers: request.headers()
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for HTTP/2 usage (if available)
    const httpVersions = await page.evaluate(() => {
      return (performance as any).getEntriesByType('navigation')
        .map((entry: any) => entry.nextHopProtocol);
    });
    
    if (httpVersions.length > 0) {
      expect(httpVersions[0]).toMatch(/h2|http\/2/);
    }

    // Check for resource compression
    const compressedRequests = networkRequests.filter(req => 
      req.headers['accept-encoding']?.includes('gzip') ||
      req.headers['accept-encoding']?.includes('br')
    );
    
    expect(compressedRequests.length).toBeGreaterThan(0);

    // Verify no redundant requests
    const duplicateRequests = networkRequests.reduce((acc: any, req) => {
      acc[req.url] = (acc[req.url] || 0) + 1;
      return acc;
    }, {});
    
    const duplicates = Object.values(duplicateRequests).filter((count: any) => count > 1);
    expect(duplicates.length).toBeLessThan(3); // Allow some duplicates for retries
  });

  test('should cache resources effectively', async ({ page, context }) => {
    // First visit
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const firstLoadRequests: string[] = [];
    page.on('request', request => {
      firstLoadRequests.push(request.url());
    });

    // Second visit (should use cache)
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check cache headers
    const cachedResources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation');
      return entries.map((entry: any) => ({
        url: entry.name,
        transferSize: entry.transferSize,
        decodedBodySize: entry.decodedBodySize
      }));
    });

    // Resources should be served from cache (transferSize < decodedBodySize)
    const fromCache = cachedResources.filter(r => r.transferSize < r.decodedBodySize);
    expect(fromCache.length).toBeGreaterThan(0);
  });

  test('should have minimal render blocking resources', async ({ page }) => {
    const renderBlockingResources: any[] = [];
    
    page.on('response', response => {
      const request = response.request();
      const contentType = response.headers()['content-type'] || '';
      
      // CSS and synchronous JS are render blocking
      if (contentType.includes('text/css') || 
          (contentType.includes('javascript') && !request.url().includes('async'))) {
        renderBlockingResources.push({
          url: request.url(),
          size: parseInt(response.headers()['content-length'] || '0'),
          type: contentType
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Minimize render blocking resources
    expect(renderBlockingResources.length).toBeLessThan(5);
    
    // Critical CSS should be small
    const cssResources = renderBlockingResources.filter(r => r.type.includes('css'));
    const totalCssSize = cssResources.reduce((sum, r) => sum + r.size, 0);
    expect(totalCssSize).toBeLessThan(100000); // < 100KB total CSS
  });

  test('should optimize for mobile performance', async ({ page, browser }) => {
    // Simulate mobile device
    const mobileContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      viewport: { width: 375, height: 667 }
    });
    
    const mobilePage = await mobileContext.newPage();
    
    // Throttle network to simulate mobile conditions
    await mobileContext.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
      await route.continue();
    });

    const startTime = Date.now();
    await mobilePage.goto('/');
    await mobilePage.waitForLoadState('domcontentloaded');
    const mobileLoadTime = Date.now() - startTime;

    // Should load reasonably fast on mobile
    expect(mobileLoadTime).toBeLessThan(4000); // < 4s on slow mobile

    // Check mobile-specific optimizations
    const mobileMetrics = await mobilePage.evaluate(() => {
      return {
        viewportMeta: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
        touchIcons: document.querySelectorAll('link[rel*="apple-touch-icon"]').length,
        manifestLink: document.querySelector('link[rel="manifest"]') !== null
      };
    });

    expect(mobileMetrics.viewportMeta).toContain('width=device-width');
    expect(mobileMetrics.touchIcons).toBeGreaterThan(0);
    expect(mobileMetrics.manifestLink).toBe(true);

    await mobileContext.close();
  });

  test('should maintain performance with cart operations', async ({ page }) => {
    await page.goto('/products');
    
    // Add multiple items to cart and measure performance
    const cartOperations = [];
    
    for (let i = 0; i < 5; i++) {
      const startTime = performance.now();
      await page.click(`[data-testid="add-to-cart"]:nth-child(${i + 1})`);
      await page.waitForSelector('[data-testid="cart-count"]');
      cartOperations.push(performance.now() - startTime);
    }

    // Cart operations should remain fast
    const avgOperationTime = cartOperations.reduce((a, b) => a + b, 0) / cartOperations.length;
    expect(avgOperationTime).toBeLessThan(200); // < 200ms per operation
    
    // Cart should update without full page reload
    const navigationEntries = await page.evaluate(() => 
      performance.getEntriesByType('navigation').length
    );
    expect(navigationEntries).toBe(1); // Only initial page load
  });
});