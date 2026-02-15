# Modular Architecture Documentation

## Overview

This project has been restructured to follow a modular, layered architecture with complete separation of concerns. The architecture is designed to be scalable, maintainable, and easy to extend with new e-commerce platforms.

## Architecture Layers

### 1. Browser Layer (`src/automation/browser/`)
**Responsibility**: Pure Playwright abstraction - no business logic

```
src/automation/browser/
├── factory.js      # Browser launch functions (Chromium, Firefox)
├── manager.js      # Browser lifecycle management
└── types.js        # JSDoc type definitions
```

**Key Features**:
- ✅ Zero coupling to platform-specific code
- ✅ Easy to replace with Selenium/Cypress in the future
- ✅ Centralized browser configuration

### 2. Platform Provider Layer (`src/automation/providers/`)
**Responsibility**: Common interface for all e-commerce platforms

```
src/automation/providers/
├── platform-provider.js   # Base class (abstract interface)
├── registry.js            # Factory pattern for provider discovery
│
├── saucedemo/             # Saucedemo implementation
│   ├── config.js          # Platform-specific config
│   ├── pages/             # Page Object Models
│   │   ├── login-page.js
│   │   ├── search-page.js
│   │   ├── product-page.js
│   │   ├── cart-page.js
│   │   └── checkout-page.js
│   ├── flows/             # Business workflows
│   │   ├── login-flow.js
│   │   ├── search-flow.js
│   │   └── purchase-flow.js
│   └── saucedemo-provider.js
│
└── amazon/                # Amazon template (not implemented)
    ├── config.js
    ├── pages/
    ├── flows/
    └── amazon-provider.js
```

**Key Features**:
- ✅ Each provider implements the same interface (`search`, `purchase`)
- ✅ Page Object Model pattern for maintainability
- ✅ Flow composition for complex operations
- ✅ Platform-specific configuration isolated

### 3. Utils Layer (`src/automation/utils/`)
**Responsibility**: Shared utilities (unchanged)

```
src/automation/utils/
├── retry.js            # Retry logic with exponential backoff
├── step-logger.js      # Progress tracking
├── screenshot.js       # Screenshot capture
├── input-validator.js  # Input validation
└── normalize-price.js  # Price parsing
```

### 4. Policies Layer (`src/automation/policies/`)
**Responsibility**: Business rules (unchanged)

```
src/automation/policies/
└── select-product.js   # Product selection strategies
```

## Public API (`src/automation/index.js`)

The public API remains **unchanged** for backward compatibility:

```javascript
const { search, purchase } = require('./src/automation');

// Search products
const products = await search({
  query: 'backpack',
  filters: { maxPrice: 20 },
  requestId: 'req-001',
  onStep: (step) => console.log(step),
  platform: 'saucedemo'  // NEW: optional, defaults to 'saucedemo'
});

// Purchase product
const result = await purchase({
  productTitle: 'Sauce Labs Backpack',
  shipping: { firstName: 'John', lastName: 'Doe', postalCode: '12345' },
  requestId: 'req-002',
  onStep: (step) => console.log(step),
  platform: 'saucedemo'  // NEW: optional, defaults to 'saucedemo'
});
```

## How to Add a New Platform

### Step 1: Copy Amazon Template
```bash
cp -r src/automation/providers/amazon src/automation/providers/mynewplatform
```

### Step 2: Update Configuration
Edit `src/automation/providers/mynewplatform/config.js`:
```javascript
module.exports = {
  BASE_URL: 'https://www.mynewplatform.com',
  USERNAME: process.env.MYNEWPLATFORM_USERNAME,
  PASSWORD: process.env.MYNEWPLATFORM_PASSWORD,
  SELECTORS: {
    // Add your platform-specific selectors
  }
};
```

### Step 3: Implement Page Objects
Implement each page in `pages/`:
- `login-page.js` - Login form interactions
- `search-page.js` - Product search and scraping
- `product-page.js` - Product parsing
- `cart-page.js` - Add to cart operations
- `checkout-page.js` - Checkout process

### Step 4: Implement Flows
Implement each flow in `flows/`:
- `login-flow.js` - Complete login workflow
- `search-flow.js` - Search and filter products
- `purchase-flow.js` - End-to-end purchase

### Step 5: Implement Provider
Edit `mynewplatform-provider.js` to orchestrate flows.

### Step 6: Register Provider
In `src/automation/index.js`:
```javascript
const { MyNewPlatformProvider } = require('./providers/mynewplatform/mynewplatform-provider');
register('mynewplatform', MyNewPlatformProvider);
```

### Step 7: Use Your Provider
```javascript
const products = await search({
  query: 'laptop',
  platform: 'mynewplatform'  // Use your new platform
});
```

## Design Principles

### 1. Zero Coupling
The Browser Layer knows nothing about platforms. Platform providers use the browser but don't depend on platform details.

### 2. Interface Segregation
All providers implement the same interface:
```javascript
class PlatformProvider {
  async search({ query, filters, requestId, onStep }) { }
  async purchase({ productTitle, shipping, requestId, onStep }) { }
}
```

### 3. Single Responsibility
- **Pages**: DOM interaction only
- **Flows**: Orchestrate pages
- **Providers**: Orchestrate flows + error handling
- **Index**: Route to correct provider

### 4. Open/Closed Principle
- Open for extension: Add new providers easily
- Closed for modification: Existing code doesn't change

## Backward Compatibility

Old import paths still work via wrapper files:

```javascript
// OLD (still works)
const { login } = require('./src/automation/sites/saucedemo/flows/loginFlow');
const { searchProducts } = require('./src/automation/sites/saucedemo/flows/searchFlow');

// NEW (recommended)
const { login } = require('./src/automation/providers/saucedemo/flows/login-flow');
const { searchProducts } = require('./src/automation/providers/saucedemo/flows/search-flow');
```

## Testing

### Architecture Test
```bash
node scripts/test_architecture.js
```

Validates:
- ✅ Provider registration
- ✅ Provider instantiation
- ✅ Method availability
- ✅ Error handling

### Integration Test
```bash
node scripts/run_demo.js
```

Runs complete search + purchase flow.

## Migration Guide

### For Existing Code
**No changes required!** All existing code continues to work.

### For New Code
Use the new provider pattern:

```javascript
// Instead of direct imports
const { search, purchase } = require('./src/automation');

// Call with platform parameter
const products = await search({
  query: 'test',
  platform: 'saucedemo'  // or 'amazon', etc.
});
```

## Benefits

### 1. Scalability
- Add new platforms without touching existing code
- Each platform is self-contained

### 2. Maintainability
- Clear separation of concerns
- Easy to locate and fix issues
- Page Object Model for stable tests

### 3. Testability
- Mock browser layer independently
- Test flows without real browser
- Platform-specific tests isolated

### 4. Flexibility
- Swap browser automation tool (Playwright → Selenium)
- Support multiple versions of same platform
- A/B test different implementations

## File Organization

```
src/automation/
├── index.js                    # Public API (entry point)
├── config.js                   # Global config
│
├── browser/                    # ★ LAYER 1: Browser abstraction
│   ├── factory.js
│   ├── manager.js
│   └── types.js
│
├── providers/                  # ★ LAYER 2: Platform providers
│   ├── platform-provider.js    # Base class
│   ├── registry.js             # Factory
│   ├── saucedemo/              # Provider 1
│   └── amazon/                 # Provider 2 (template)
│
├── utils/                      # ★ LAYER 3: Shared utilities
│   ├── retry.js
│   ├── step-logger.js
│   ├── screenshot.js
│   ├── input-validator.js
│   └── normalize-price.js
│
├── policies/                   # ★ LAYER 4: Business rules
│   └── select-product.js
│
└── sites/                      # ★ DEPRECATED (backward compat)
    └── saucedemo/              # Wrapper files only
```

## Future Enhancements

1. **Multi-platform Search**
   ```javascript
   const products = await searchAll({
     query: 'laptop',
     platforms: ['saucedemo', 'amazon', 'ebay']
   });
   ```

2. **Provider Plugins**
   - Load providers dynamically from npm packages
   - Community-contributed providers

3. **Provider Versioning**
   ```javascript
   register('saucedemo', SaucedemoProviderV1);
   register('saucedemo@v2', SaucedemoProviderV2);
   ```

4. **Parallel Execution**
   - Run multiple providers concurrently
   - Aggregate results

## Conclusion

This modular architecture provides a solid foundation for scaling the automation system to support multiple e-commerce platforms while maintaining clean, testable, and maintainable code.
