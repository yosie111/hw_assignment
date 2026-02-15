# Modular Automation Architecture - Visual Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PUBLIC API (index.js)                     │
│  ┌────────────────────┐            ┌────────────────────────┐   │
│  │   Legacy API       │            │   Modular API          │   │
│  │  search()          │            │  registry              │   │
│  │  purchase()        │            │  SaucedemoProvider     │   │
│  │                    │            │  AmazonProvider        │   │
│  └────────────────────┘            └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATION REGISTRY                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Platform Registry: Map<name, Provider>                 │   │
│  │  - register(name, ProviderClass)                        │   │
│  │  - getProvider(name) → Provider instance                │   │
│  │  - getRegisteredPlatforms() → ['saucedemo', 'amazon']  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌──────────────────────┐      ┌──────────────────────┐
│  Saucedemo Provider  │      │   Amazon Provider    │
│    (Implemented)     │      │      (Stub)          │
└──────────────────────┘      └──────────────────────┘
            │                               │
            ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PLATFORM PROVIDER (Base)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Abstract Methods (must implement):                      │   │
│  │  - login(credentials)                                    │   │
│  │  - search(params) → Products[]                          │   │
│  │  - purchase(params) → OrderResult                       │   │
│  │                                                          │   │
│  │  Provided Methods:                                       │   │
│  │  - initialize() - Launch browser                        │   │
│  │  - cleanup() - Close browser                            │   │
│  │  - getPage() - Get current page                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ BrowserMgr   │ │   Logger     │ │   Config     │
    └──────────────┘ └──────────────┘ └──────────────┘
```

## Provider Implementation Structure

```
Provider (e.g., SaucedemoProvider)
│
├── Configuration
│   └── config.js
│       - baseUrl, credentials
│       - browser settings
│       - retry settings
│
├── Page Objects (extend BasePage)
│   ├── LoginPage
│   │   └── login(username, password)
│   ├── InventoryPage
│   │   ├── getAllProducts()
│   │   ├── clickProduct(title)
│   │   └── addToCart()
│   ├── CartPage
│   │   └── checkout()
│   └── CheckoutPage
│       ├── fillShippingInfo()
│       └── finish()
│
└── Flows (business logic)
    └── purchase-flow.js
        - Orchestrates page objects
        - Implements business workflow
        - Returns results
```

## Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE LAYER                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  PlatformProvider (Base Class)                         │     │
│  │  - Defines provider interface                          │     │
│  │  - Manages browser via BrowserManager                  │     │
│  │  - Provides logging via Logger                         │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  BasePage (Base Class)                                 │     │
│  │  - Common page operations: goto, click, fill          │     │
│  │  - Element waiting: waitForSelector, isVisible        │     │
│  │  - Screenshots: screenshot()                           │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  BrowserManager                                        │     │
│  │  - launch() - Start browser                           │     │
│  │  - close() - Stop browser                             │     │
│  │  - getPage() - Get current page                       │     │
│  │  - Supports Chromium & Firefox                        │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  AutomationRegistry (Singleton)                        │     │
│  │  - Manages available providers                         │     │
│  │  - Factory pattern for provider creation               │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Logger                                                │     │
│  │  - Unified logging across all components              │     │
│  │  - Levels: info, error, warn, debug                   │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Flow Example: Purchase

```
User Code
    │
    ▼
SaucedemoProvider.executePurchaseFlow(params)
    │
    ├─▶ provider.initialize()
    │       └─▶ BrowserManager.launch()
    │
    ├─▶ provider.purchase(params)
    │       │
    │       ├─▶ LoginPage.navigate(url)
    │       ├─▶ LoginPage.login(user, pass)
    │       │
    │       ├─▶ InventoryPage.clickProduct(title)
    │       ├─▶ InventoryPage.addToCart()
    │       │       └─▶ takeScreenshot('product-detail')
    │       │
    │       ├─▶ CartPage.navigate()
    │       ├─▶ CartPage.checkout()
    │       │       └─▶ takeScreenshot('cart-page')
    │       │
    │       ├─▶ CheckoutPage.fillShippingInfo(shipping)
    │       ├─▶ CheckoutPage.continue()
    │       │       └─▶ takeScreenshot('shipping-filled')
    │       │
    │       ├─▶ CheckoutPage.finish()
    │       │       └─▶ takeScreenshot('order-complete')
    │       │
    │       └─▶ Return OrderResult
    │
    └─▶ provider.cleanup()
            └─▶ BrowserManager.close()
```

## Adding a New Platform

```
Step 1: Create Provider Structure
────────────────────────────────────
providers/newplatform/
├── config.js
├── browser.js
├── newplatform-provider.js
├── pages/
│   ├── login-page.js
│   └── ...
└── flows/
    └── purchase-flow.js

Step 2: Implement Provider Class
────────────────────────────────────
class NewPlatformProvider extends PlatformProvider {
  async login(credentials) { ... }
  async search(params) { ... }
  async purchase(params) { ... }
}

Step 3: Register Provider
────────────────────────────────────
// In index.js
registry.register('newplatform', NewPlatformProvider);

Step 4: Use Provider
────────────────────────────────────
const provider = registry.getProvider('newplatform');
await provider.initialize();
await provider.login();
// ... use provider
await provider.cleanup();
```

## Benefits of This Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DESIGN PRINCIPLES                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✓ Single Responsibility Principle                          │
│    Each class has one clear purpose                         │
│                                                              │
│  ✓ Open/Closed Principle                                    │
│    Open for extension (new platforms)                       │
│    Closed for modification (existing code)                  │
│                                                              │
│  ✓ Liskov Substitution Principle                            │
│    All providers are interchangeable                        │
│                                                              │
│  ✓ Dependency Inversion Principle                           │
│    Core depends on abstractions                             │
│                                                              │
│  ✓ DRY (Don't Repeat Yourself)                              │
│    Common code in core layer                                │
│                                                              │
│  ✓ Separation of Concerns                                   │
│    Platform code isolated from core                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Summary

This modular architecture enables:
- **Easy Extension**: Add platforms without touching existing code
- **Maintainability**: Changes isolated to specific providers
- **Testability**: Each component can be tested independently
- **Reusability**: Core components shared across all platforms
- **Scalability**: Support unlimited platforms
- **Professional**: Industry-standard patterns and practices
