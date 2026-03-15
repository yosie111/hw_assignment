# E-Commerce Browser Automation — Homework Assignment

## Overview

A web application that automates e-commerce shopping flows using Playwright browser automation.
The user enters a search query via the web UI, and the system launches a headless browser to:
search products, scrape results from the DOM, add to cart, fill checkout, and capture proof screenshots.

**Target Sites:**
- **Saucedemo** (https://www.saucedemo.com) — Primary demo site
- **ToolShop** (https://practicesoftwaretesting.com) — Full-featured practice site with real search, 4-step checkout
- **Amazon** (https://www.amazon.com) — Experimental (blocked by anti-bot)

## Architecture

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌────────────────┐
│    UI    │────▶│   API    │────▶│ Services │────▶│  Domain  │     │   Automation   │
│  React   │     │ Express  │     │  Search  │     │ Product  │     │  Playwright    │
│          │◀────│  Routes  │     │ Purchase │     │  Cart    │     │  Flows +       │
│          │     │          │     │ StatusSt │     │  Order   │     │  Selectors     │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └────────────────┘
```

**Layer separation (5 layers per assignment requirements):**
- `src/automation/` — Playwright interactions, selectors, retries, browser factory
- `src/domain/` — Models: Product, Cart, Order (immutable, Factory Functions)
- `src/services/` — Business logic: searchService, purchaseService, statusStore
- `src/api/` — Express endpoints that trigger automation
- `client/` — React frontend (search, results, cart, purchase screens)

**Adapter Pattern:** Each target site implements `SiteAdapter` (search + purchase) with its own selectors and flows. The service layer has zero knowledge of which site it's talking to.

### Design Patterns (Chapter 12)

Six patterns applied, each in a concrete file:

| Pattern | File(s) | Role |
|---------|---------|------|
| **Bridge** | `SiteAdapter.js` (Abstraction) ↔ `SiteFlows.js` (Implementor) | Separates orchestration (open → login → search → close) from site-specific DOM logic. Adapter defines WHAT; Flows define HOW. They vary independently. |
| **Adapter** | `SauceDemoAdapter.js`, `ToolShopAdapter.js` | Normalizes each site's raw DOM data into `NormalizedProduct` / `PurchaseResult` — a common interface the services expect. |
| **Facade** | `ShoppingFacade.js` | Hides subsystem coordination (adapterFactory + searchService + sessionStore + purchaseService) behind two methods: `search()` and `purchase()`. Routes call only the Facade. |
| **Abstract Factory** | `abstractFactory.js` → `SauceDemoFactory`, `ToolShopFactory` | Creates consistent families of site objects (adapter + flows + config). Guarantees you cannot mix SauceDemoAdapter with ToolShop flows. |
| **Strategy** | `taxStrategies.js` → `FlatTaxStrategy`, `ThresholdTaxStrategy` | Each tax algorithm is a class. `taxEngine.js` (Context) delegates rate calculation to the strategy. Adding a new tax rule = one class, zero changes to the engine. |
| **Singleton + DCL** | `sessionStore.js` → `SessionStore` class | Exactly one session store across the app. `getInstance()` with double-checked locking guard. Prevents split-brain where search stores in one instance and purchase looks in another. |

```
 ┌──────────┐
 │  Routes  │─── ShoppingFacade (Facade) ──────┐
 └──────────┘                                   │
                                                ▼
 ┌─────────────────────────────────────────────────────────┐
 │  ShoppingFacade.search(site, params)                    │
 │    → AbstractFactory.getFactory(site).createAdapter()   │
 │    → searchService.executeSearch(adapter, params)       │
 │    → SessionStore.getInstance().store(adapter)          │
 │                                                         │
 │  ShoppingFacade.purchase({ sessionId, ... })            │
 │    → SessionStore.getInstance().consume(sessionId)      │
 │    → purchaseService.executePurchase(adapter, params)   │
 └─────────────────────────────────────────────────────────┘
                        │
                        ▼
 ┌──────────────────────────────────┐
 │  SauceDemoAdapter (Abstraction)  │──── Bridge ────▶ SauceDemoFlows (Implementor)
 │  ToolShopAdapter  (Abstraction)  │──── Bridge ────▶ ToolShopFlows  (Implementor)
 └──────────────────────────────────┘
                        │
                        ▼
 ┌──────────────────────────────────┐
 │  TaxEngine (Context)            │──── Strategy ──▶ FlatTaxStrategy
 │                                  │                ▶ ThresholdTaxStrategy
 └──────────────────────────────────┘
```

### Session Continuity (Search → Purchase)

The browser session is shared between search and purchase to avoid double login:

```
POST /api/search
  → Facade.search()
    → AbstractFactory → createAdapter()
    → adapter.search()                    ← browser opens, login, scrape
    → SessionStore.store(adapter)         ← browser stays alive (Singleton)
    → response: { products, sessionId }

POST /api/purchase { sessionId }
  → Facade.purchase()
    → SessionStore.consume(sessionId)     ← retrieve same adapter (browser alive)
    → adapter.purchase()                  ← no re-login, reuse session
    → adapter.close()                     ← browser closes after purchase
```

Key components:
- `SessionStore` (Singleton) — TTL-based Map, 5 min TTL, auto `adapter.close()` on eviction
- Adapters use `_ensureBrowser()` for lazy browser init — only opens browser on first call
- `SiteAdapter` contract includes `isAlive()` and `close()` for lifecycle management
- Fallback: if sessionId is missing or expired, purchase creates a fresh adapter (backward compatible)

### Tax System (Strategy Pattern)

The tax engine uses geo-based resolution with the Strategy pattern:

- `taxPolicies.js` — data-only country rules (FLAT or THRESHOLD types)
- `taxStrategies.js` — `FlatTaxStrategy` (US 8%, UK 20%, DE 19%) and `ThresholdTaxStrategy` (Israel: 0% below $150, 18% above)
- `taxEngine.js` — Context that resolves buyer/seller countries → selects strategy → computes tax
- `geoResolver.js` — IP-based country detection for buyer location

Each site defines its own tax rate via its factory: Saucedemo → 8% (site charges 8% sales tax), ToolShop → 0% (site calculates tax server-side), Amazon → 0% (tax varies by state, site handles it).

## Setup & Installation

### Prerequisites
- Node.js >= 18
- npm

### Install
```bash
# Server
npm install
npx playwright install chromium

# Client
cd client && npm install
```

### Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

**Required variables:**
```env
# General
HEADLESS=true
SCREENSHOTS_DIR=./screenshots
PORT=3000
TAX_RATE=0

# Saucedemo (default)
SAUCEDEMO_BASE_URL=https://www.saucedemo.com
SAUCEDEMO_USERNAME=standard_user
SAUCEDEMO_PASSWORD=secret_sauce

# ToolShop
TOOLSHOP_BASE_URL=https://practicesoftwaretesting.com
TOOLSHOP_API_URL=https://api.practicesoftwaretesting.com
TOOLSHOP_EMAIL=gohok69228@dolofan.com
TOOLSHOP_PASSWORD="gohok69228@A"
```

> **Note:** The ToolShop password contains special characters — it must be wrapped in double quotes in the `.env` file.

> **Note:** The ToolShop test site resets its database every few minutes, wiping all registered accounts. The system handles this automatically via **auto-registration** (see section below). If manual registration is needed, run:
> ```bash
> curl -s -X POST https://api.practicesoftwaretesting.com/users/register \
>   -H "Content-Type: application/json" \
>   -d '{"first_name":"Test","last_name":"Automation","address":"123 Test St","city":"New York","state":"NY","country":"US","postcode":"10001","phone":"5551234567","dob":"1990-01-01","email":"gohok69228@dolofan.com","password":"gohok69228@A"}'
> ```

> **Security:** `.env` is in `.gitignore` — credentials never enter Git. All credentials are loaded via `src/automation/config.js` which reads from `process.env`.

### Run
```bash
# Server + Client together
npm run dev

# Or separately:
npm run server   # http://localhost:3000
npm run client   # http://localhost:3500
```

## ToolShop Auto-Registration

### Why Auto-Registration Exists

The ToolShop test site (`practicesoftwaretesting.com`) resets its database every few minutes, wiping all registered accounts. Without auto-registration, every automation run would fail with "Invalid credentials" within minutes.

### How It Works

1. Before every ToolShop login, the system calls `POST /users/register` on the ToolShop REST API
2. If the account is created (201) → proceed to login
3. If the account already exists (422) → proceed to login (this is expected)
4. If registration fails (network error, 5xx) → log warning, still attempt login
5. The registration step is visible in the status API as `Register ✓ (180ms)`

### Robustness Features

| Feature | Details |
|---------|---------|
| **Retry** | 2 attempts with exponential backoff (500ms → 1s) via `withRetry()` |
| **Timeout** | 10 seconds per attempt via `AbortSignal.timeout()` |
| **5xx retry** | Server errors trigger retry; client errors (4xx) do not |
| **Graceful degradation** | Registration failure does NOT block login attempt |
| **Input validation** | Email, password, apiUrl validated before HTTP call |
| **Error parsing** | JSON responses parsed for readable error messages |

### Tests

```bash
npx jest tests/unit/registerFlow.test.js
```

Test coverage: input validation, happy paths (201/422), error paths (400/500/network/timeout), retry behavior, and request body verification.

## Automation Flow — 10 Required Steps

Both adapters implement the same 10 steps required by the assignment:

| Step | Description | Saucedemo | ToolShop |
|------|-------------|-----------|----------|
| 1 | Launch browser (headless/headed) | `browserFactory.js` | `browserFactory.js` |
| 2 | Login | username + password | email + password (auto-register first) |
| 3 | Navigate to catalog/search | `/inventory` | home page |
| 4 | Search/filter from UI query | Client-side filter (no search field) | Real search bar + API |
| 5 | Scrape DOM → normalized format | `productParser.js` | `toolshopParser.js` |
| 6 | Select product by policy | `selectProduct.js` (CHEAPEST) | `selectProduct.js` (CHEAPEST) |
| 7 | Add to Cart | Click add button by title | Click product → "Add to Cart" |
| 8 | Proceed to Checkout | Cart → Checkout | 4-step checkout wizard |
| 9 | Fill shipping details | firstName, lastName, postalCode | street, city, state, country, postalCode |
| 10 | Screenshot (proof) | `takeScreenshot()` | `takeScreenshot()` |

**Step 6 — Product Selection Policy:**
The system recommends the cheapest product (marked with a green "Cheapest" badge in the UI) using `selectProduct(products, 'CHEAPEST')` from `src/automation/policies/selectProduct.js`. The user can override this by clicking any product. The `recommendedId` is returned in the search API response.

### ToolShop Detailed Flow

```
1. Launch headless Chromium
2. Auto-register account via REST API (handles DB resets)
3. Login → /auth/login (email + password)
4. Navigate to catalog (home page)
5. Search → type query in search bar, waitForResponse on /products API
6. Scrape results → parse product cards (name, price, image, URL)
7. Select recommended product (cheapest-first policy) → recommendedId
8. User clicks "Buy" → triggers purchase flow:
   a. Login (if session expired)
   b. Navigate to catalog → find product by title → click
   c. Product detail page → "Add to Cart" → wait for toast/badge
   d. Navigate to cart → click "Proceed to checkout" (proceed-1)
   e. Step 1 - Sign In: auto-completed if logged in (proceed-2)
   f. Step 2 - Address: fill street, city, state, country, postal_code (proceed-3)
   g. Step 3 - Payment: select "Buy Now Pay Later", 3 installments
   h. Step 4 - Confirm: click "Finish" (with retry)
   i. Capture order confirmation screenshot (MANDATORY proof)
9. Return PurchaseResult with screenshots and step trace
```

### Saucedemo Detailed Flow

```
1. Launch headless Chromium
2. Login → / (username + password → redirects to /inventory)
3. Sort products by price (low → high)
4. Scrape all products from DOM
5. Filter client-side (no server search on Saucedemo)
6. Select recommended product (cheapest-first policy) → recommendedId
7. Purchase: click product → Add to Cart → Cart → Checkout → Fill shipping → Finish
8. Screenshot of order confirmation
```

## API Reference

All endpoints use `http://localhost:3000/api` as base URL.
The `site` field in request body determines which adapter handles the request.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |
| `POST` | `/api/search` | Search products (synchronous) |
| `POST` | `/api/purchase` | Start purchase (async, returns 202) |
| `GET` | `/api/status/:requestId` | Poll automation status |
| `GET` | `/api/screenshots/:filename` | Serve proof screenshot (PNG) |

### POST /api/search

```json
{
  "site": "saucedemo",
  "query": "Sauce",
  "filters": { "maxPrice": 20 }
}
```

Response (200):
```json
{
  "requestId": "uuid",
  "products": [
    {
      "id": "sauce-labs-onesie",
      "title": "Sauce Labs Onesie",
      "price": 7.99,
      "currency": "USD",
      "productUrl": "https://...",
      "source": "Saucedemo",
      "calc": { "subtotal": 7.99, "tax": 0, "total": 7.99 }
    }
  ],
  "recommendedId": "sauce-labs-onesie",
  "sessionId": "uuid (pass to POST /api/purchase for session continuity)"
}
```

### POST /api/purchase

```json
{
  "site": "saucedemo",
  "sessionId": "uuid (optional — from search response, enables session continuity)",
  "product": {
    "id": "sauce-labs-onesie",
    "title": "Sauce Labs Onesie",
    "price": 7.99,
    "currency": "USD",
    "source": "Saucedemo"
  },
  "shipping": {
    "firstName": "Test",
    "lastName": "User",
    "postalCode": "10001"
  }
}
```

Response (202 Accepted):
```json
{
  "requestId": "uuid",
  "message": "Purchase initiated. Poll /api/status/{requestId} for updates.",
  "statusUrl": "/api/status/{requestId}"
}
```

### GET /api/status/:requestId

Response while running:
```json
{
  "requestId": "uuid",
  "type": "purchase",
  "status": "running",
  "currentStep": "Checkout",
  "steps": [
    { "step": "Login", "status": "completed", "durationMs": 1200 },
    { "step": "AddToCart", "status": "completed", "durationMs": 3400 },
    { "step": "Checkout", "status": "running" }
  ]
}
```

Response on completion:
```json
{
  "status": "completed",
  "result": {
    "confirmText": "Thank you for your order!",
    "screenshotUrls": ["/api/screenshots/6-order-complete_abc.png"],
    "cartValidation": { "match": true }
  }
}
```

### Error Responses

| Code | When |
|------|------|
| 400 | Validation failed (missing fields, invalid site name) |
| 404 | requestId not found |
| 500 | Internal server error |

## UI Screens (4 required)

| # | Screen | Component | Description |
|---|--------|-----------|-------------|
| 1 | Search | `SearchPage` + `SearchForm` + `SiteSelector` | Query input, site selection, optional maxPrice filter |
| 2 | Results | `ProductCard` grid | Product list with name, price, image, tax breakdown, "Buy Now" button. Cheapest product marked with green "Cheapest" badge |
| 3 | Cart / Status | `CartReview` + `StatusDisplay` | Cart review before checkout (product, subtotal, tax, total) + live automation progress trace |
| 4 | Purchase Form / Result | `ShippingForm` + `ResultPage` | Shipping form input + order confirmation with screenshots |

## Postman Testing

Postman collections are provided for API testing.

**Import files (from `postman/` directory):**
1. `HW_Assignment_Environment.postman_environment.json` — shared variables
2. `Express_Server_API.postman_collection.json` — 10 requests for your server
3. `ToolShop_Diagnostics.postman_collection.json` — 6 direct ToolShop API tests

**Express Server tests:** Health Check, Search (Saucedemo), Search (ToolShop), Purchase (async), Poll Status, Get Screenshot, Empty Search, Validation Error (400), Unknown requestId (404), Invalid site (400).

**ToolShop Diagnostics:** Health Check, Login, Search, Sort by Price, Add to Cart, Register New Account.

## Testing

```bash
# All tests (unit + service + domain + API + E2E)
npm test

# Unit/service tests only (no Playwright needed)
npm run test:unit

# E2E test (requires Playwright browser + network)
npm run test:e2e
```

**Test results: 244+ tests passing across 18 test suites.**

Test coverage includes:
- Product normalization (price as float, currency extraction)
- Product selection policy (CHEAPEST, FIRST) and recommendedId integration
- Cart calculations + duplicate guard
- Tax engine + Oracle comparison (Strategy pattern)
- Tax strategies unit tests (FlatTaxStrategy, ThresholdTaxStrategy, createStrategy factory)
- API route validation (Zod schemas)
- ToolShop selectors + parser (no duplicates, no overlap)
- ToolShop auto-registration (input validation, happy paths, error paths, retry behavior)
- Service layer with DI (FakeAdapter — no Playwright needed)
- E2E: full Search → Cart → Checkout → Screenshot verification

## Robustness

- **Explicit waits** — `waitFor()`, `waitForResponse()` — no fixed `sleep()` anywhere
- **Configurable timeouts** — `DEFAULT_TIMEOUT: 10s`, `NAVIGATION_TIMEOUT: 35s`
- **Exponential backoff retry** — `withRetry()` (500ms → 1s → 2s, max 3 attempts)
- **Input validation** — Zod schemas on all API endpoints
- **Error handling** — user-friendly messages, error screenshots on failure
- **Auto-registration** — ToolShop accounts re-created before every login (handles DB resets)
- **Session continuity** — browser session shared between search and purchase via SessionStore

## Observability

Every automation step is logged as structured JSON:
```json
{
  "requestId": "abc-123",
  "step": "AddToCart",
  "status": "success",
  "durationMs": 2340
}
```

The UI shows a real-time trace (via `StatusDisplay` component) of which steps completed and where failures occurred, by polling `GET /api/status/:requestId` every 2 seconds.

## Project Structure

```
├── src/
│   ├── api/              # Express routes + middleware + validators
│   ├── automation/       # Playwright automation
│   │   ├── adapters/     # SiteAdapter (Bridge abstraction), SiteFlows (Bridge implementor),
│   │   │                 # abstractFactory, SauceDemoAdapter, ToolShopAdapter, AmazonAdapter
│   │   ├── browser/      # browserFactory (Chromium + stealth)
│   │   ├── sites/        # Per-site: selectors, flows, parsers
│   │   ├── policies/     # selectProduct (CHEAPEST / FIRST)
│   │   └── utils/        # retry, screenshot, stepLogger, normalizePrice, inputValidator
│   ├── domain/           # Product, Cart, Order, CartCalculator (all immutable)
│   ├── services/         # ShoppingFacade, searchService, purchaseService, statusStore, SessionStore
│   └── tax/              # TaxEngine (Context) + taxStrategies (Strategy) + taxPolicies + geoResolver
├── client/               # React frontend
│   └── src/
│       ├── pages/        # SearchPage, PurchasePage, ResultPage
│       ├── components/   # ProductCard, CartReview, ShippingForm, StatusDisplay, etc.
│       ├── hooks/        # usePolling
│       └── api/          # HTTP client (axios)
├── tests/                # Unit, service, API, E2E tests
├── screenshots/          # Auto-generated proof screenshots
├── postman/              # Postman collections for API testing
├── AI_USAGE.md           # AI tools, prompts, corrections
└── README_AI_BUGS.md     # Documented AI bugs and fixes (18 bugs)
```

## Submission Checklist

- [x] GitHub repository link
- [x] README.md — setup, environment variables, automation flow
- [x] AI_USAGE.md — tools, prompts, risky AI recommendations, secret protection
- [x] README_AI_BUGS.md — 18 documented AI bugs with fixes
- [x] Test output (`test-output.txt`) — 244+ passing tests
- [x] Order confirmation screenshot (`screenshots/`)
- [x] Postman collections for API verification
