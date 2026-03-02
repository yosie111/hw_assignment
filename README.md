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

**Adapter Pattern:** Each target site implements `SiteAdapter` (search + purchase) with its own selectors and flows. The service layer has zero knowledge of which site it's talking to. Adding a new site = 1 adapter class + 1 registry line in `adapterFactory.js`.

```
Client (site="toolshop") → API Route → Validator → adapterFactory.createAdapter("toolshop")
                                                          ↓
                              Service ← adapter.search() ← ToolShopAdapter
                                      ← adapter.purchase()
```

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
TOOLSHOP_EMAIL=hw.assign.2026@test.com
TOOLSHOP_PASSWORD="Aut0m@tion#Hw2026!"
```

> **Note:** The ToolShop password contains `#` — it must be wrapped in double quotes in the `.env` file.

> **Note:** The default ToolShop account (`customer@practicesoftwaretesting.com`) may get locked due to public usage. If that happens, register a new account via the Postman collection or run:
> ```bash
> curl -s -X POST https://api.practicesoftwaretesting.com/users/register \
>   -H "Content-Type: application/json" \
>   -d '{"first_name":"Test","last_name":"Auto","city":"NY","state":"NY","country":"US","postcode":"10001","phone":"5551234567","dob":"1990-01-01","email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'
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

## Automation Flow — 10 Required Steps

Both adapters implement the same 10 steps required by the assignment:

| Step | Description | Saucedemo | ToolShop |
|------|-------------|-----------|----------|
| 1 | Launch browser (headless/headed) | `browserFactory.js` | `browserFactory.js` |
| 2 | Login | username + password | email + password |
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
2. Login → /auth/login (email + password)
3. Navigate to catalog (home page)
4. Search → type query in search bar, waitForResponse on /products API
5. Scrape results → parse product cards (name, price, image, URL)
6. Select recommended product (cheapest-first policy) → recommendedId
7. User clicks "Buy" → triggers purchase flow:
   a. Login (if session expired)
   b. Navigate to catalog → find product by title → click
   c. Product detail page → "Add to Cart" → wait for toast/badge
   d. Navigate to cart → click "Proceed to checkout" (proceed-1)
   e. Step 1 - Sign In: auto-completed if logged in (proceed-2)
   f. Step 2 - Address: fill street, city, state, country, postal_code (proceed-3)
   g. Step 3 - Payment: select "Buy Now Pay Later", 3 installments
   h. Step 4 - Confirm: click "Finish" (with retry)
   i. Capture order confirmation screenshot (MANDATORY proof)
8. Return PurchaseResult with screenshots and step trace
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
  "recommendedId": "sauce-labs-onesie"
}
```

### POST /api/purchase

```json
{
  "site": "saucedemo",
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
- Tax engine + Oracle comparison
- API route validation (Zod schemas)
- ToolShop selectors + parser (no duplicates, no overlap)
- Service layer with DI (FakeAdapter — no Playwright needed)
- E2E: full Search → Cart → Checkout → Screenshot verification

## Robustness

- **Explicit waits** — `waitFor()`, `waitForResponse()` — no fixed `sleep()` anywhere
- **Configurable timeouts** — `DEFAULT_TIMEOUT: 10s`, `NAVIGATION_TIMEOUT: 35s`
- **Exponential backoff retry** — `withRetry()` (500ms → 1s → 2s, max 3 attempts)
- **Input validation** — Zod schemas on all API endpoints
- **Error handling** — user-friendly messages, error screenshots on failure

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
│   │   ├── adapters/     # SiteAdapter interface, SauceDemoAdapter, ToolShopAdapter, AmazonAdapter
│   │   ├── browser/      # browserFactory (Chromium + stealth)
│   │   ├── sites/        # Per-site: selectors, flows, parsers
│   │   ├── policies/     # selectProduct (CHEAPEST / FIRST)
│   │   └── utils/        # retry, screenshot, stepLogger, normalizePrice, inputValidator
│   ├── domain/           # Product, Cart, Order, CartCalculator (all immutable)
│   ├── services/         # searchService, purchaseService, statusStore
│   └── tax/              # Tax engine + geo resolver
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
