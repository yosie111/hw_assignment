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

**Layer separation:**
- `src/automation/` — Playwright interactions, selectors, retries, browser factory
- `src/domain/` — Models: Product, Cart, Order (immutable, Factory Functions)
- `src/services/` — Business logic: searchService, purchaseService, statusStore
- `src/api/` — Express endpoints that trigger automation
- `client/` — React frontend (search, results, cart, purchase screens)

**Adapter Pattern:** Each target site implements `SiteAdapter` (search + purchase) with its own selectors and flows. Adding a new site = 1 adapter class + 1 registry line.

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

# Saucedemo (default)
SAUCEDEMO_BASE_URL=https://www.saucedemo.com
SAUCEDEMO_USERNAME=standard_user
SAUCEDEMO_PASSWORD=secret_sauce

# ToolShop
TOOLSHOP_BASE_URL=https://practicesoftwaretesting.com
TOOLSHOP_EMAIL=customer@practicesoftwaretesting.com
TOOLSHOP_PASSWORD=welcome01
```

> **Security:** `.env` is in `.gitignore` — credentials never enter Git.

### Run
```bash
# Server + Client together
npm run dev

# Or separately:
npm run server   # http://localhost:3000
npm run client   # http://localhost:3001
```

## Automation Flow

### ToolShop (practicesoftwaretesting.com)

```
1. Launch headless Chromium
2. Login → /auth/login (email + password)
3. Navigate to catalog (home page)
4. Search → type query in search bar, waitForResponse on /products API
5. Scrape results → parse product cards (name, price, image, URL)
6. Return NormalizedProduct[] to UI
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

### Saucedemo (saucedemo.com)

```
1. Login → / (username + password → redirects to /inventory)
2. Sort products by price (low → high)
3. Scrape all products from DOM
4. Filter client-side (no server search on Saucedemo)
5. Purchase: click product → Add to Cart → Cart → Checkout → Fill shipping → Finish
6. Screenshot of order confirmation
```

## Testing

```bash
# All tests (unit + service + domain + API)
npm test

# Unit tests only
npm run test:unit

# E2E test (requires Playwright browser + network)
npm run test:e2e

# Results: 238 unit/service tests passing
```

**Test coverage:**
- Product normalization (price as float, currency extraction)
- Product selection policy
- Cart calculations + duplicate guard
- Tax engine + Oracle comparison
- API validators
- ToolShop selectors + parser
- E2E: full Search → Cart → Checkout → Screenshot

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

The UI shows a real-time trace of which steps completed and where failures occurred, via polling `GET /api/status/:requestId`.

## Project Structure

```
├── src/
│   ├── api/              # Express routes + middleware
│   ├── automation/       # Playwright automation
│   │   ├── adapters/     # SiteAdapter, SauceDemoAdapter, ToolShopAdapter
│   │   ├── browser/      # browserFactory (Chromium + stealth)
│   │   ├── sites/        # Per-site selectors, flows, parsers
│   │   ├── policies/     # Product selection (cheapest-first)
│   │   └── utils/        # retry, screenshot, stepLogger, normalizePrice
│   ├── domain/           # Product, Cart, Order (immutable)
│   ├── services/         # searchService, purchaseService, statusStore
│   └── tax/              # Tax engine + geo resolver
├── client/               # React frontend
├── tests/                # Unit, service, API, E2E tests
├── screenshots/          # Auto-generated proof screenshots
├── AI_USAGE.md           # AI tools, prompts, corrections
└── README_AI_BUGS.md     # Documented AI bugs and fixes
```
