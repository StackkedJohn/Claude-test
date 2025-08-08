import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Setup test data
    await setupTestData(page);
    
    // Warm up the application
    await warmupApplication(page);
    
    // Setup authentication tokens
    await setupAuth(page);
    
    // Initialize A/B test configurations
    await setupABTests(page);
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setupTestData(page: any) {
  console.log('📊 Setting up test data...');
  
  // Create test products if they don't exist
  await page.goto('/api/test/setup', { waitUntil: 'networkidle' });
  
  const response = await page.evaluate(async () => {
    return fetch('/api/test/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          id: 'test-small-pack',
          name: 'Test Small Ice Pack',
          price: 19.99,
          category: 'small',
          inStock: true,
          testId: 'product-small-pack'
        },
        {
          id: 'test-medium-pack',
          name: 'Test Medium Ice Pack',
          price: 29.99,
          category: 'medium',
          inStock: true,
          testId: 'product-medium-pack'
        },
        {
          id: 'test-large-pack',
          name: 'Test Large Ice Pack',
          price: 39.99,
          category: 'large',
          inStock: true,
          testId: 'product-large-pack'
        }
      ])
    }).then(res => res.json()).catch(() => ({ success: false }));
  });

  if (response.success) {
    console.log('✅ Test products created');
  } else {
    console.log('⚠️  Using existing products');
  }
}

async function warmupApplication(page: any) {
  console.log('🔥 Warming up application...');
  
  const routes = [
    '/',
    '/products',
    '/about',
    '/contact'
  ];

  for (const route of routes) {
    try {
      await page.goto(route, { waitUntil: 'networkidle', timeout: 10000 });
      console.log(`✅ Warmed up route: ${route}`);
    } catch (error) {
      console.log(`⚠️  Could not warm up route: ${route}`);
    }
  }
}

async function setupAuth(page: any) {
  console.log('🔐 Setting up authentication...');
  
  // Create test user session
  const testUser = {
    email: 'test@icepaca.com',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User'
  };

  try {
    const authResponse = await page.evaluate(async (user: any) => {
      return fetch('/api/auth/test-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      }).then(res => res.json()).catch(() => ({ success: false }));
    }, testUser);

    if (authResponse.success) {
      // Store auth token for tests
      await page.context().addCookies([{
        name: 'test-auth-token',
        value: authResponse.token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false
      }]);
      console.log('✅ Test authentication set up');
    }
  } catch (error) {
    console.log('⚠️  Auth setup skipped (service not available)');
  }
}

async function setupABTests(page: any) {
  console.log('🧪 Setting up A/B test configurations...');
  
  const abTestConfigs = {
    checkout_flow: {
      variants: ['A', 'B'],
      weights: [0.5, 0.5],
      description: 'Single page vs multi-step checkout'
    },
    product_page: {
      variants: ['A', 'B', 'C'],
      weights: [0.33, 0.33, 0.34],
      description: 'Product page layout variations'
    },
    pricing_display: {
      variants: ['A', 'B'],
      weights: [0.5, 0.5],
      description: 'Standard vs discount pricing display'
    }
  };

  try {
    await page.evaluate((configs: any) => {
      localStorage.setItem('ab-test-configs', JSON.stringify(configs));
      console.log('A/B test configs stored');
    }, abTestConfigs);
    console.log('✅ A/B test configurations ready');
  } catch (error) {
    console.log('⚠️  A/B test setup failed');
  }
}

export default globalSetup;