// src/automation/example-usage.js
// Example of using the new modular architecture

const { registry, SaucedemoProvider } = require('./index');

/**
 * Example 1: Using the registry to get a provider
 */
async function exampleUsingRegistry() {
  console.log('\n=== Example 1: Using Registry ===');
  
  // Get a provider from the registry
  const provider = registry.getProvider('saucedemo');
  
  console.log('Available platforms:', registry.getRegisteredPlatforms());
  
  try {
    // Initialize (launch browser)
    await provider.initialize();
    console.log('Browser initialized');
    
    // Login
    await provider.login();
    console.log('Logged in successfully');
    
    // Search for products
    const products = await provider.search({ 
      query: 'backpack', 
      filters: { maxPrice: 50 } 
    });
    console.log(`Found ${products.length} products`);
    
  } finally {
    // Cleanup (close browser)
    await provider.cleanup();
    console.log('Browser closed');
  }
}

/**
 * Example 2: Direct provider instantiation
 */
async function exampleDirectProvider() {
  console.log('\n=== Example 2: Direct Provider ===');
  
  // Create provider directly with custom config
  const provider = new SaucedemoProvider({
    browser: {
      headless: true,
    },
  });
  
  try {
    await provider.initialize();
    await provider.login();
    
    const products = await provider.search({ query: 'sauce' });
    console.log(`Found ${products.length} products matching "sauce"`);
    
  } finally {
    await provider.cleanup();
  }
}

/**
 * Example 3: Using convenience methods (full flow)
 */
async function exampleFullFlow() {
  console.log('\n=== Example 3: Full Flow (with auto cleanup) ===');
  
  const provider = new SaucedemoProvider();
  
  // Execute full search flow (init + login + search + cleanup)
  const products = await provider.executeSearchFlow({
    query: 'labs',
    filters: { maxPrice: 30 },
    requestId: 'example-search',
  });
  
  console.log(`Found ${products.length} products`);
  console.log('Products:', products.map(p => `${p.title} - $${p.price}`));
}

/**
 * Example 4: Purchase flow
 */
async function examplePurchaseFlow() {
  console.log('\n=== Example 4: Purchase Flow ===');
  
  const provider = new SaucedemoProvider();
  
  try {
    // Execute full purchase flow
    const result = await provider.executePurchaseFlow({
      productTitle: 'Sauce Labs Backpack',
      shipping: {
        firstName: 'John',
        lastName: 'Doe',
        postalCode: '12345',
      },
      requestId: 'example-purchase',
    });
    
    console.log('Purchase status:', result.status);
    console.log('Confirmation:', result.confirmText);
    console.log('Total:', result.totalText);
    console.log('Screenshots:', result.screenshots.length);
    
  } catch (error) {
    console.error('Purchase failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('\n========================================');
  console.log('Modular Automation Architecture Examples');
  console.log('========================================');
  
  // Uncomment the example you want to run:
  
  // await exampleUsingRegistry();
  // await exampleDirectProvider();
  // await exampleFullFlow();
  // await examplePurchaseFlow();
  
  console.log('\nNote: Uncomment an example in the code to run it');
  console.log('Examples require headless: false to see the browser in action');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  exampleUsingRegistry,
  exampleDirectProvider,
  exampleFullFlow,
  examplePurchaseFlow,
};
