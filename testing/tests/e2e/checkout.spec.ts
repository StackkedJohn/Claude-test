import { test, expect } from '@playwright/test';
import { ABTestManager } from '../utils/ab-testing';
import { AccessibilityHelper } from '../utils/accessibility';

test.describe('Checkout Flow Tests', () => {
  let abTestManager: ABTestManager;
  let accessibilityHelper: AccessibilityHelper;

  test.beforeEach(async ({ page, browserName }) => {
    abTestManager = new ABTestManager(page);
    accessibilityHelper = new AccessibilityHelper(page);
    
    // Navigate to home page
    await page.goto('/');
    
    // Add product to cart
    await page.click('[data-testid="product-card"]');
    await page.click('[data-testid="add-to-cart"]');
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1');
    
    // Navigate to checkout
    await page.click('[data-testid="cart-icon"]');
    await page.click('[data-testid="checkout-button"]');
  });

  test('should complete checkout flow - Variant A', async ({ page, browserName }) => {
    // Set A/B test variant
    await abTestManager.setVariant('checkout_flow', 'A');
    await page.reload();

    // Fill customer information
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="phone"]', '+1-555-123-4567');

    // Fill shipping address
    await page.fill('[data-testid="address"]', '123 Main St');
    await page.fill('[data-testid="city"]', 'San Francisco');
    await page.selectOption('[data-testid="state"]', 'CA');
    await page.fill('[data-testid="zip"]', '94105');

    // Proceed to payment
    await page.click('[data-testid="continue-to-payment"]');

    // Fill payment information
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="expiry"]', '12/25');
    await page.fill('[data-testid="cvc"]', '123');
    await page.fill('[data-testid="card-name"]', 'John Doe');

    // Complete order
    await page.click('[data-testid="place-order"]');

    // Verify success
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-number"]')).toContainText('ORDER-');

    // Track conversion for A/B test
    await abTestManager.trackConversion('checkout_flow', 'completed_checkout');

    // Verify accessibility
    await accessibilityHelper.runA11yCheck();
  });

  test('should complete checkout flow - Variant B', async ({ page, browserName }) => {
    // Set A/B test variant B (single-page checkout)
    await abTestManager.setVariant('checkout_flow', 'B');
    await page.reload();

    // Fill all information on single page
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="phone"]', '+1-555-123-4567');
    await page.fill('[data-testid="address"]', '123 Main St');
    await page.fill('[data-testid="city"]', 'San Francisco');
    await page.selectOption('[data-testid="state"]', 'CA');
    await page.fill('[data-testid="zip"]', '94105');
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="expiry"]', '12/25');
    await page.fill('[data-testid="cvc"]', '123');
    await page.fill('[data-testid="card-name"]', 'John Doe');

    // Complete order (single-step)
    await page.click('[data-testid="place-order"]');

    // Verify success
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();

    // Track conversion for A/B test
    await abTestManager.trackConversion('checkout_flow', 'completed_checkout');

    // Verify accessibility
    await accessibilityHelper.runA11yCheck();
  });

  test('should handle payment failures gracefully', async ({ page }) => {
    // Use declined card
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="address"]', '123 Main St');
    await page.fill('[data-testid="city"]', 'San Francisco');
    await page.selectOption('[data-testid="state"]', 'CA');
    await page.fill('[data-testid="zip"]', '94105');

    await page.click('[data-testid="continue-to-payment"]');

    // Use declined test card
    await page.fill('[data-testid="card-number"]', '4000000000000002');
    await page.fill('[data-testid="expiry"]', '12/25');
    await page.fill('[data-testid="cvc"]', '123');
    await page.fill('[data-testid="card-name"]', 'John Doe');

    await page.click('[data-testid="place-order"]');

    // Verify error handling
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('declined');

    // Verify accessibility during error state
    await accessibilityHelper.runA11yCheck();
  });

  test('should validate form fields', async ({ page }) => {
    // Try to proceed without filling required fields
    await page.click('[data-testid="continue-to-payment"]');

    // Check for validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="address-error"]')).toBeVisible();

    // Verify accessibility of error states
    await accessibilityHelper.runA11yCheck();
    await accessibilityHelper.checkErrorStates();
  });

  test('should work on mobile devices', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-specific test');

    // Test mobile-specific interactions
    await page.fill('[data-testid="email"]', 'mobile@example.com');
    await page.fill('[data-testid="first-name"]', 'Mobile');
    await page.fill('[data-testid="last-name"]', 'User');

    // Test touch interactions
    await page.tap('[data-testid="address"]');
    await page.fill('[data-testid="address"]', '123 Mobile St');

    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-checkout-header"]')).toBeVisible();
    
    // Check touch target sizes
    await accessibilityHelper.checkTouchTargets();
  });

  test('should handle different payment methods', async ({ page }) => {
    // Fill basic info
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="address"]', '123 Main St');
    await page.fill('[data-testid="city"]', 'San Francisco');
    await page.selectOption('[data-testid="state"]', 'CA');
    await page.fill('[data-testid="zip"]', '94105');

    await page.click('[data-testid="continue-to-payment"]');

    // Test Apple Pay (if available)
    if (await page.locator('[data-testid="apple-pay"]').isVisible()) {
      await page.click('[data-testid="apple-pay"]');
      // Apple Pay would require additional setup for testing
    }

    // Test PayPal
    await page.click('[data-testid="paypal-payment"]');
    await expect(page.locator('[data-testid="paypal-redirect"]')).toBeVisible();

    // Go back to credit card
    await page.click('[data-testid="credit-card-payment"]');
    
    // Verify credit card form is visible
    await expect(page.locator('[data-testid="card-number"]')).toBeVisible();
  });

  test('should save customer preferences', async ({ page }) => {
    // Enable preference saving
    await page.check('[data-testid="save-info"]');

    // Fill and complete checkout
    await page.fill('[data-testid="email"]', 'returning@example.com');
    await page.fill('[data-testid="first-name"]', 'Returning');
    await page.fill('[data-testid="last-name"]', 'Customer');
    await page.fill('[data-testid="address"]', '456 Repeat Ave');
    await page.fill('[data-testid="city"]', 'Oakland');
    await page.selectOption('[data-testid="state"]', 'CA');
    await page.fill('[data-testid="zip"]', '94607');

    await page.click('[data-testid="continue-to-payment"]');
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="expiry"]', '12/25');
    await page.fill('[data-testid="cvc"]', '123');
    await page.fill('[data-testid="card-name"]', 'Returning Customer');

    await page.click('[data-testid="place-order"]');
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();

    // Verify info is saved for next checkout
    await page.goto('/products');
    await page.click('[data-testid="product-card"]');
    await page.click('[data-testid="add-to-cart"]');
    await page.click('[data-testid="cart-icon"]');
    await page.click('[data-testid="checkout-button"]');

    // Check if info is pre-filled
    await expect(page.locator('[data-testid="first-name"]')).toHaveValue('Returning');
    await expect(page.locator('[data-testid="address"]')).toHaveValue('456 Repeat Ave');
  });

  test('should handle international addresses', async ({ page }) => {
    // Test international shipping
    await page.fill('[data-testid="email"]', 'international@example.com');
    await page.fill('[data-testid="first-name"]', 'Global');
    await page.fill('[data-testid="last-name"]', 'Customer');
    await page.fill('[data-testid="address"]', '123 International Blvd');
    await page.fill('[data-testid="city"]', 'Toronto');
    await page.selectOption('[data-testid="country"]', 'CA');
    await page.selectOption('[data-testid="province"]', 'ON');
    await page.fill('[data-testid="postal-code"]', 'M5V 3A8');

    // Verify shipping options update for international
    await expect(page.locator('[data-testid="international-shipping"]')).toBeVisible();
    await expect(page.locator('[data-testid="shipping-cost"]')).toContainText('$15.00');

    // Complete checkout
    await page.click('[data-testid="continue-to-payment"]');
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="expiry"]', '12/25');
    await page.fill('[data-testid="cvc"]', '123');
    await page.fill('[data-testid="card-name"]', 'Global Customer');

    await page.click('[data-testid="place-order"]');
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });
});