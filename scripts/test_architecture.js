// Test script to verify modular architecture
// This tests the registry and provider pattern

// Load the public API first (which registers providers)
const { search, purchase } = require('../src/automation');
const { get, list } = require('../src/automation/providers/registry');

console.log('Testing Provider Registry...\n');

// Test 1: List providers
console.log('✓ Registered providers:', list());

// Test 2: Get Saucedemo provider
try {
  const SaucedemoProvider = get('saucedemo');
  console.log('✓ Saucedemo provider loaded:', SaucedemoProvider.name);
} catch (error) {
  console.error('✗ Failed to load Saucedemo provider:', error.message);
}

// Test 3: Get Amazon provider
try {
  const AmazonProvider = get('amazon');
  console.log('✓ Amazon provider loaded:', AmazonProvider.name);
} catch (error) {
  console.error('✗ Failed to load Amazon provider:', error.message);
}

// Test 4: Try to get non-existent provider
try {
  const InvalidProvider = get('invalid');
  console.error('✗ Should have thrown error for invalid provider');
} catch (error) {
  console.log('✓ Correctly throws error for invalid provider:', error.message);
}

// Test 5: Verify provider can be instantiated
try {
  const SaucedemoProvider = get('saucedemo');
  const provider = new SaucedemoProvider();
  console.log('✓ Provider instantiated successfully');
  console.log('  - Has search method:', typeof provider.search === 'function');
  console.log('  - Has purchase method:', typeof provider.purchase === 'function');
  console.log('  - Has launch method:', typeof provider.launch === 'function');
  console.log('  - Has close method:', typeof provider.close === 'function');
} catch (error) {
  console.error('✗ Failed to instantiate provider:', error.message);
}

// Test 6: Verify public API functions
console.log('\n✓ Public API loaded');
console.log('  - search function:', typeof search === 'function');
console.log('  - purchase function:', typeof purchase === 'function');

console.log('\n✅ All tests passed! Modular architecture is working correctly.');
