import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsiveness Tests', () => {
  
  test.describe('iPhone 12 Pro', () => {
    test.use({ ...devices['iPhone 12 Pro'] });

    test('should display mobile-optimized navigation', async ({ page }) => {
      await page.goto('/');
      
      // Check for mobile navigation elements
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-navigation"]')).not.toBeVisible();
      
      // Test hamburger menu
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      
      // Verify navigation items are accessible
      await expect(page.locator('[data-testid="mobile-nav-products"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-nav-about"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-nav-contact"]')).toBeVisible();
    });

    test('should have properly sized product cards', async ({ page }) => {
      await page.goto('/products');
      
      // Check product grid layout
      const productCards = await page.locator('[data-testid="product-card"]').all();
      
      for (const card of productCards.slice(0, 3)) {
        const boundingBox = await card.boundingBox();
        expect(boundingBox?.width).toBeGreaterThan(150); // Minimum readable width
        expect(boundingBox?.height).toBeGreaterThan(200); // Adequate height for content
        
        // Check that images are properly sized
        const image = card.locator('img').first();
        await expect(image).toBeVisible();
        
        const imageBounds = await image.boundingBox();
        expect(imageBounds?.width).toBeLessThanOrEqual(boundingBox!.width);
      }
    });

    test('should handle mobile checkout flow', async ({ page }) => {
      await page.goto('/');
      
      // Add product to cart
      await page.click('[data-testid="product-card"]');
      await page.click('[data-testid="add-to-cart"]');
      
      // Navigate to checkout
      await page.click('[data-testid="cart-icon"]');
      await page.click('[data-testid="checkout-button"]');
      
      // Verify mobile-optimized form layout
      await expect(page.locator('[data-testid="mobile-checkout-form"]')).toBeVisible();
      
      // Test form field interactions
      await page.fill('[data-testid="email"]', 'mobile@test.com');
      await page.fill('[data-testid="first-name"]', 'Mobile');
      await page.fill('[data-testid="last-name"]', 'User');
      
      // Verify keyboard doesn't obscure important elements
      const continueButton = page.locator('[data-testid="continue-to-payment"]');
      await expect(continueButton).toBeVisible();
      
      // Test input zoom prevention
      const emailInput = page.locator('[data-testid="email"]');
      const fontSize = await emailInput.evaluate(el => 
        window.getComputedStyle(el).fontSize
      );
      expect(parseInt(fontSize)).toBeGreaterThanOrEqual(16); // Prevents zoom on iOS
    });

    test('should support touch gestures', async ({ page }) => {
      await page.goto('/products');
      
      // Test swipe navigation if implemented
      const productGrid = page.locator('[data-testid="product-grid"]');
      await productGrid.hover();
      
      // Simulate touch scroll
      await page.touchscreen.tap(200, 400);
      await page.touchscreen.tap(200, 300); // Swipe up
      
      // Test touch interactions on buttons
      const addToCartButton = page.locator('[data-testid="add-to-cart"]').first();
      await addToCartButton.tap();
      
      // Verify touch feedback (if implemented)
      await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
    });

    test('should display mobile-friendly images', async ({ page }) => {
      await page.goto('/products');
      
      // Check image loading and sizing
      const productImages = await page.locator('[data-testid="product-image"]').all();
      
      for (const image of productImages.slice(0, 3)) {
        await expect(image).toBeVisible();
        
        // Check for responsive attributes
        const srcset = await image.getAttribute('srcset');
        const sizes = await image.getAttribute('sizes');
        
        if (srcset || sizes) {
          console.log('Responsive image attributes found');
        }
        
        // Verify image doesn't exceed container
        const boundingBox = await image.boundingBox();
        expect(boundingBox?.width).toBeLessThanOrEqual(400); // Max mobile width
      }
    });
  });

  test.describe('iPad Pro', () => {
    test.use({ ...devices['iPad Pro'] });

    test('should adapt to tablet layout', async ({ page }) => {
      await page.goto('/');
      
      // Check for tablet-specific layout
      const viewport = page.viewportSize();
      expect(viewport?.width).toBe(1024);
      expect(viewport?.height).toBe(1366);
      
      // Verify navigation adapts to tablet
      const navigation = page.locator('[data-testid="navigation"]');
      await expect(navigation).toBeVisible();
      
      // Check product grid uses appropriate columns for tablet
      await page.goto('/products');
      const productGrid = page.locator('[data-testid="product-grid"]');
      
      // Should show more products per row than mobile
      const firstRowProducts = await page.locator('[data-testid="product-card"]:nth-child(-n+4)').count();
      expect(firstRowProducts).toBeGreaterThan(1);
    });

    test('should handle touch and mouse interactions', async ({ page }) => {
      await page.goto('/products');
      
      // Test hover states (iPad supports them)
      const productCard = page.locator('[data-testid="product-card"]').first();
      await productCard.hover();
      
      // Test touch interactions
      await productCard.tap();
      
      // Verify product page loads
      await expect(page.locator('[data-testid="product-details"]')).toBeVisible();
    });
  });

  test.describe('Galaxy S III', () => {
    test.use({ ...devices['Galaxy S III'] });

    test('should work on older Android devices', async ({ page }) => {
      await page.goto('/');
      
      // Check basic functionality on older device
      await expect(page.locator('[data-testid="header"]')).toBeVisible();
      await expect(page.locator('[data-testid="product-grid"]')).toBeVisible();
      
      // Test basic interactions
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
    });

    test('should handle small screen constraints', async ({ page }) => {
      await page.goto('/products');
      
      // Verify content fits in small viewport
      const viewport = page.viewportSize();
      expect(viewport?.width).toBe(360);
      
      // Check that text is readable
      const productTitle = page.locator('[data-testid="product-title"]').first();
      const fontSize = await productTitle.evaluate(el => 
        window.getComputedStyle(el).fontSize
      );
      expect(parseInt(fontSize)).toBeGreaterThanOrEqual(14);
    });
  });

  test.describe('Cross-Device Consistency', () => {
    const testDevices = [
      'iPhone 12 Pro',
      'iPad Pro', 
      'Galaxy S III',
      'Desktop Chrome'
    ];

    testDevices.forEach(deviceName => {
      test(`should maintain brand consistency on ${deviceName}`, async ({ page, browser }) => {
        // Use specific device if it's not desktop
        if (deviceName !== 'Desktop Chrome') {
          await page.setViewportSize(devices[deviceName].viewport);
          await page.setUserAgent(devices[deviceName].userAgent);
        }

        await page.goto('/');
        
        // Check brand elements are consistent
        const logo = page.locator('[data-testid="logo"]');
        await expect(logo).toBeVisible();
        
        // Verify color scheme consistency
        const header = page.locator('[data-testid="header"]');
        const backgroundColor = await header.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        
        // Brand colors should be consistent across devices
        expect(backgroundColor).toBeTruthy();
        
        // Check typography consistency
        const mainHeading = page.locator('h1').first();
        if (await mainHeading.count() > 0) {
          const fontFamily = await mainHeading.evaluate(el => 
            window.getComputedStyle(el).fontFamily
          );
          expect(fontFamily).toContain('Inter'); // Assuming Inter is brand font
        }
      });
    });
  });

  test.describe('Performance on Mobile', () => {
    test.use({ ...devices['iPhone 12 Pro'] });

    test('should load quickly on mobile', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds
    });

    test('should handle slow network conditions', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });

      await page.goto('/');
      
      // Should show loading states gracefully
      await expect(page.locator('[data-testid="loading-skeleton"], [data-testid="loader"]')).toBeVisible();
      
      // Eventually load content
      await expect(page.locator('[data-testid="product-grid"]')).toBeVisible({ timeout: 10000 });
    });

    test('should optimize images for mobile bandwidth', async ({ page }) => {
      let imageRequests: any[] = [];
      
      page.on('request', request => {
        if (request.url().match(/\.(jpg|jpeg|png|webp)$/)) {
          imageRequests.push({
            url: request.url(),
            resourceSize: request.postDataBuffer()?.length || 0
          });
        }
      });

      await page.goto('/products');
      await page.waitForLoadState('networkidle');
      
      // Check that mobile-optimized images are being served
      const mobileImages = imageRequests.filter(req => 
        req.url.includes('mobile') || 
        req.url.includes('small') ||
        req.url.includes('w=400') // Width parameter
      );
      
      expect(mobileImages.length).toBeGreaterThan(0);
    });
  });

  test.describe('Orientation Changes', () => {
    test.use({ ...devices['iPhone 12 Pro'] });

    test('should adapt to portrait and landscape', async ({ page }) => {
      await page.goto('/');
      
      // Test portrait mode
      await expect(page.locator('[data-testid="mobile-navigation"]')).not.toBeVisible();
      
      // Switch to landscape
      await page.setViewportSize({ width: 844, height: 390 });
      await page.reload();
      
      // Verify layout adapts
      const navigation = page.locator('[data-testid="navigation"]');
      await expect(navigation).toBeVisible();
      
      // Switch back to portrait
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      
      // Verify mobile layout returns
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    });
  });

  test.describe('Text Scaling', () => {
    test('should support accessibility text scaling', async ({ page }) => {
      await page.goto('/');
      
      // Simulate increased text size for accessibility
      await page.addStyleTag({
        content: `
          * { font-size: 1.2em !important; }
        `
      });
      
      // Check that layout still works with larger text
      await expect(page.locator('[data-testid="header"]')).toBeVisible();
      await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
      
      // Verify text doesn't overflow containers
      const textElements = await page.locator('p, span, h1, h2, h3').all();
      for (const element of textElements.slice(0, 5)) {
        const boundingBox = await element.boundingBox();
        const parentBox = await element.locator('..').boundingBox();
        
        if (boundingBox && parentBox) {
          expect(boundingBox.width).toBeLessThanOrEqual(parentBox.width + 5); // 5px tolerance
        }
      }
    });
  });
});