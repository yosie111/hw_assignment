# Modular Automation Architecture

This document describes the modular architecture for multi-platform automation system.

## Architecture Overview

The automation system is designed with a modular, provider-based architecture that allows easy addition of new platforms without modifying existing code.

### Folder Structure

```
src/automation/
├── core/                          # Shared core components
│   ├── platform-provider.js      # Base class for all providers
│   ├── base-page.js              # Base class for page objects
│   ├── browser-manager.js        # Browser lifecycle management
│   ├── automation-registry.js    # Provider registration system
│   └── logger.js                 # Unified logging
├── providers/                     # Platform-specific implementations
│   ├── saucedemo/                # Saucedemo platform
│   │   ├── config.js
│   │   ├── browser.js
│   │   ├── saucedemo-provider.js
│   │   ├── pages/                # Page objects
│   │   │   ├── login-page.js
│   │   │   ├── inventory-page.js
│   │   │   ├── cart-page.js
│   │   │   └── checkout-page.js
│   │   └── flows/                # Business flows
│   │       └── purchase-flow.js
│   └── amazon/                   # Amazon platform (stub)
│       ├── config.js
│       ├── browser.js
│       ├── amazon-provider.js
│       ├── pages/
│       │   └── login-page.js
│       └── flows/
│           └── purchase-flow.js
├── index.js                      # Main entry point
└── example-usage.js             # Usage examples
```

## Core Components

### 1. PlatformProvider (Base Class)

All platform implementations must extend `PlatformProvider` and implement:
- `login(credentials)` - Authentication
- `search(params)` - Product search
- `purchase(params)` - Complete purchase flow

### 2. BasePage (Page Object Base)

Base class for all page objects with common functionality:
- Navigation (`goto`)
- Element interaction (`click`, `fill`, `getText`)
- Waiting (`waitForSelector`, `isVisible`)
- Screenshots (`screenshot`)

### 3. BrowserManager

Manages browser lifecycle:
- Launch browser with configuration
- Create pages and contexts
- Close browser and cleanup

### 4. AutomationRegistry

Registry for managing providers:
- Register new platforms
- Get provider instances
- List available platforms

## Usage

### Basic Usage with Registry

```javascript
const { registry } = require('./src/automation');

// Get a provider
const provider = registry.getProvider('saucedemo');

// Initialize and use
await provider.initialize();
await provider.login();
const products = await provider.search({ query: 'backpack' });
await provider.cleanup();
```

### Direct Provider Instantiation

```javascript
const { SaucedemoProvider } = require('./src/automation');

// Create with custom config
const provider = new SaucedemoProvider({
  browser: { headless: false },
});

await provider.initialize();
// ... use provider
await provider.cleanup();
```

### Convenience Methods (Auto Cleanup)

```javascript
const { SaucedemoProvider } = require('./src/automation');

const provider = new SaucedemoProvider();

// Full flow with automatic cleanup
const products = await provider.executeSearchFlow({
  query: 'labs',
  filters: { maxPrice: 30 },
});

const result = await provider.executePurchaseFlow({
  productTitle: 'Sauce Labs Backpack',
  shipping: { firstName: 'John', lastName: 'Doe', postalCode: '12345' },
  requestId: 'order-123',
});
```

### Backward Compatibility

The legacy API is still available:

```javascript
const { search, purchase } = require('./src/automation');

// Legacy search
const products = await search({
  query: 'backpack',
  filters: { maxPrice: 50 },
  requestId: 'search-1',
  onStep: (step) => console.log(step),
});

// Legacy purchase
const result = await purchase({
  productTitle: 'Sauce Labs Backpack',
  shipping: { firstName: 'John', lastName: 'Doe', postalCode: '12345' },
  requestId: 'purchase-1',
  onStep: (step) => console.log(step),
});
```

## Adding a New Platform

To add a new platform (e.g., eBay):

### 1. Create provider structure:

```
src/automation/providers/ebay/
├── config.js
├── browser.js
├── ebay-provider.js
├── pages/
│   ├── login-page.js
│   └── ... (other pages)
└── flows/
    └── purchase-flow.js
```

### 2. Implement provider class:

```javascript
// ebay-provider.js
const { PlatformProvider } = require('../../core/platform-provider');

class EbayProvider extends PlatformProvider {
  constructor(customConfig = {}) {
    super('eBay', customConfig);
  }

  async login(credentials) {
    // Implement eBay login
  }

  async search(params) {
    // Implement eBay search
  }

  async purchase(params) {
    // Implement eBay purchase
  }
}

module.exports = { EbayProvider };
```

### 3. Register the provider:

```javascript
// In index.js
const { EbayProvider } = require('./providers/ebay/ebay-provider');
registry.register('ebay', EbayProvider);
```

### 4. Use the provider:

```javascript
const provider = registry.getProvider('ebay');
await provider.initialize();
// ... use provider
```

## Design Principles

1. **Separation of Concerns**: Core logic separated from platform-specific code
2. **Open/Closed Principle**: Open for extension (new platforms) but closed for modification
3. **Single Responsibility**: Each class has a single, well-defined purpose
4. **Dependency Inversion**: Core depends on abstractions, not concrete implementations
5. **Page Object Pattern**: UI interactions encapsulated in page objects

## Benefits

- ✅ **Easy to extend**: Add new platforms without changing existing code
- ✅ **Maintainable**: Changes to one platform don't affect others
- ✅ **Testable**: Each component can be tested independently
- ✅ **Reusable**: Core components shared across all platforms
- ✅ **Backward compatible**: Legacy API still works

## Next Steps

1. Implement Amazon provider (currently stub)
2. Add more page objects for Saucedemo
3. Add integration tests for providers
4. Add documentation for each provider
5. Add configuration validation
6. Add error recovery strategies
