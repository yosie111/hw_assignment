# תוכנית ביצוע — 5 שלבים עם בדיקות

---

## שלב 1: שלד הפרויקט + Config + Domain
**זמן משוער: 20 דקות**

### קבצים שנוצרים:
```
ecommerce-automation/
├── package.json
├── .env
├── .env.example
├── .gitignore
├── src/
│   ├── automation/
│   │   └── config.js
│   └── domain/
│       ├── Product.js
│       ├── Cart.js
│       └── OrderResult.js
├── screenshots/
├── logs/
└── tests/
    └── unit/
        └── domain.test.js
```

### מה כל קובץ עושה:
| קובץ | תפקיד |
|------|--------|
| `package.json` | Dependencies: playwright, dotenv, uuid, express, zod, pino. DevDeps: jest |
| `.env` | SAUCEDEMO_USERNAME, SAUCEDEMO_PASSWORD, SAUCEDEMO_BASE_URL, HEADLESS |
| `config.js` | טעינת env + קבועים (timeouts, retry, paths) |
| `Product.js` | Class/factory — id, title, price, currency, url, imageUrl, source |
| `Cart.js` | items[], addItem(), getTotal(), toJSON() |
| `OrderResult.js` | status, lastStep, requestId, screenshotPath, error? |

### בדיקות שלב 1:
```bash
# בדיקה 1: npm install עובד בלי שגיאות
npm install

# בדיקה 2: config נטען נכון
node -e "const c = require('./src/automation/config'); console.log(c.SAUCEDEMO_BASE_URL, c.HEADLESS)"
# צפוי: https://www.saucedemo.com true

# בדיקה 3: Domain models — Jest
npx jest tests/unit/domain.test.js
```

### בדיקות Jest לשלב 1 (domain.test.js):
```javascript
// ✓ Product.create() מחזיר אובייקט עם כל השדות
// ✓ Product.create() זורק שגיאה כש-title חסר
// ✓ Cart — addItem + getTotal מחשב נכון
// ✓ Cart — getTotal מחזיר 0 כשריק
// ✓ OrderResult — status חובה ('completed' | 'failed')
```

### קריטריון מעבר: ✅
- `npm install` — 0 errors
- `node -e "require('./src/automation/config')"` — לא קורס
- `npx jest tests/unit/domain.test.js` — 5/5 pass

---

## שלב 2: Automation Utils + Browser
**זמן משוער: 40 דקות**

### קבצים שנוצרים:
```
src/automation/
├── browser/
│   └── browserFactory.js       # Launch + cleanup
└── utils/
    ├── retry.js                # Exponential backoff
    ├── normalizePrice.js       # "$29.99" → { price: 29.99, currency: "USD" }
    ├── screenshot.js           # Save PNG with requestId
    ├── stepLogger.js           # JSON logging + onStep callback
    └── inputValidator.js       # Validate before browser opens
```

### מה כל קובץ עושה:
| קובץ | תפקיד | דגשים |
|------|--------|-------|
| `browserFactory.js` | Playwright launch, viewport 1280x720, timeouts | browser.close() ב-finally |
| `retry.js` | withRetry(fn, {label, maxAttempts}) | 500ms → 1s → 2s |
| `normalizePrice.js` | parse currency symbol + float | תומך $, €, £, ₪ |
| `screenshot.js` | takeScreenshot(page, requestId) | fullPage, timestamp בשם |
| `stepLogger.js` | createStepLogger(requestId, onStep) | JSON structured logging |
| `inputValidator.js` | validateSearchInput / validatePurchaseInput | fail fast לפני דפדפן |

### בדיקות שלב 2:
```bash
# בדיקה 1: דפדפן נפתח ונסגר
node -e "
  const {launchBrowser} = require('./src/automation/browser/browserFactory');
  (async () => {
    const {browser, page} = await launchBrowser();
    console.log('Page title:', await page.title());
    await browser.close();
    console.log('✅ Browser opened and closed');
  })();
"

# בדיקה 2: Utils — Jest
npx jest tests/unit/utils.test.js
```

### בדיקות Jest לשלב 2 (utils.test.js):
```javascript
// normalizePrice:
// ✓ "$29.99" → { price: 29.99, currency: "USD" }
// ✓ "€15.50" → { price: 15.50, currency: "EUR" }
// ✓ "abc" → throws Error
// ✓ null → throws Error

// retry:
// ✓ מצליח בניסיון ראשון — מחזיר תוצאה
// ✓ נכשל פעמיים, מצליח בשלישי — מחזיר תוצאה
// ✓ נכשל 3 פעמים — זורק עם "[label] Failed after 3 attempts"

// inputValidator:
// ✓ validateSearchInput({ query: '' }) — עובר
// ✓ validateSearchInput({ filters: { maxPrice: -5 }}) — זורק
// ✓ validatePurchaseInput({ productTitle: '', shipping: {...} }) — זורק
// ✓ validatePurchaseInput — shipping.firstName חסר — זורק

// stepLogger:
// ✓ runStep מחזיר תוצאת fn
// ✓ runStep קורא ל-onStep עם status: 'running' ואז 'success'
// ✓ runStep כושל — onStep עם status: 'failed' + error message
// ✓ getSteps() מחזיר היסטוריה מלאה
```

### קריטריון מעבר: ✅
- Browser open/close — "✅ Browser opened and closed"
- `npx jest tests/unit/utils.test.js` — 15/15 pass

---

## שלב 3: Automation Flows + Policies + Index
**זמן משוער: 90 דקות**

### קבצים שנוצרים:
```
src/automation/
├── index.js                            # Public API: search() + purchase()
├── sites/
│   └── saucedemo/
│       ├── selectors.js                # ALL selectors
│       ├── flows/
│       │   ├── loginFlow.js            # Open + Login
│       │   ├── searchFlow.js           # Sort + Filter + Scrape
│       │   ├── cartFlow.js             # Select + Add to Cart (retry)
│       │   └── checkoutFlow.js         # Checkout + Shipping + Screenshot
│       └── parsers/
│           └── productParser.js        # DOM → Product
└── policies/
    └── selectProduct.js                # CHEAPEST / FIRST
```

### סדר בנייה פנימי (חשוב!):
```
selectors.js → loginFlow.js → productParser.js → searchFlow.js → 
selectProduct.js → cartFlow.js → checkoutFlow.js → index.js
```

### בדיקות שלב 3 — בנייה מצטברת:
```bash
# בדיקה 3.1: Login (אחרי selectors + loginFlow)
node -e "
  const {launchBrowser} = require('./src/automation/browser/browserFactory');
  const {login} = require('./src/automation/sites/saucedemo/flows/loginFlow');
  (async () => {
    const {browser, page} = await launchBrowser();
    await login(page, {username:'standard_user', password:'secret_sauce', baseUrl:'https://www.saucedemo.com'});
    console.log('✅ Login successful');
    await browser.close();
  })().catch(e => { console.error('❌', e.message); process.exit(1); });
"

# בדיקה 3.2: Login שגוי — אמור לזרוק שגיאה
node -e "
  const {launchBrowser} = require('./src/automation/browser/browserFactory');
  const {login} = require('./src/automation/sites/saucedemo/flows/loginFlow');
  (async () => {
    const {browser, page} = await launchBrowser();
    try {
      await login(page, {username:'bad_user', password:'wrong', baseUrl:'https://www.saucedemo.com'});
      console.error('❌ Should have thrown');
    } catch(e) {
      console.log('✅ Got expected error:', e.message);
    }
    await browser.close();
  })();
"

# בדיקה 3.3: Search (אחרי productParser + searchFlow)
node -e "
  const {launchBrowser} = require('./src/automation/browser/browserFactory');
  const {login} = require('./src/automation/sites/saucedemo/flows/loginFlow');
  const {searchProducts} = require('./src/automation/sites/saucedemo/flows/searchFlow');
  (async () => {
    const {browser, page} = await launchBrowser();
    await login(page, {username:'standard_user', password:'secret_sauce', baseUrl:'https://www.saucedemo.com'});
    const products = await searchProducts(page, {query:'', filters:{maxPrice:20}});
    console.log('Found:', products.length, 'products');
    products.forEach(p => console.log('  •', p.title, '$'+p.price, p.currency));
    console.log(products.length > 0 ? '✅ Search works' : '❌ No products');
    await browser.close();
  })().catch(e => { console.error('❌', e.message); process.exit(1); });
"

# בדיקה 3.4: selectProduct — Jest (לא צריך דפדפן)
npx jest tests/unit/selectProduct.test.js

# בדיקה 3.5: Full E2E דרך index.js — search()
node -e "
  const {search} = require('./src/automation');
  (async () => {
    const products = await search({query:'', filters:{maxPrice:50}, requestId:'test-001'});
    console.log('Products:', products.length);
    console.log(products.length > 0 ? '✅ search() works' : '❌ Failed');
  })().catch(e => { console.error('❌', e.message); process.exit(1); });
"
```

### בדיקות Jest לשלב 3 (selectProduct.test.js):
```javascript
// ✓ CHEAPEST — מחזיר מוצר עם המחיר הנמוך ביותר
// ✓ FIRST — מחזיר מוצר ראשון
// ✓ רשימה ריקה — זורק "No products available"
// ✓ policy לא מוכר — זורק "Unknown selection policy"
```

### קריטריון מעבר: ✅
- Login success + Login error detection
- Search מחזיר מוצרים עם price, title, currency
- selectProduct unit tests pass
- `search()` via index.js מחזיר מוצרים

---

## שלב 4: Services + API + POC Script
**זמן משוער: 60 דקות**

### קבצים שנוצרים:
```
src/
├── services/
│   ├── SearchService.js            # search logic + statusMap
│   └── PurchaseService.js          # purchase logic + statusMap + error translation
├── api/
│   ├── routes/
│   │   ├── searchRoutes.js         # POST /api/search
│   │   ├── purchaseRoutes.js       # POST /api/purchase
│   │   └── statusRoutes.js         # GET /api/status/:requestId
│   ├── middleware/
│   │   └── errorHandler.js         # Global error handler
│   └── server.js                   # Express app setup
├── app.js                          # Entry point
scripts/
└── run_demo.js                     # POC — terminal E2E
```

### מה כל קובץ עושה:
| קובץ | תפקיד |
|------|--------|
| `SearchService` | קורא automation.search(), מנהל statusMap לחיפוש |
| `PurchaseService` | קורא automation.purchase(), fire-and-forget + statusMap |
| `searchRoutes` | POST /api/search — body: { query, maxPrice } |
| `purchaseRoutes` | POST /api/purchase — body: { productTitle, shipping } |
| `statusRoutes` | GET /api/status/:requestId — polling endpoint |
| `errorHandler` | Middleware — catch all, return { error, message } |
| `run_demo.js` | סקריפט E2E בטרמינל: search → select → purchase → screenshot |

### בדיקות שלב 4:
```bash
# בדיקה 4.1: POC מהטרמינל (הבדיקה החשובה ביותר!)
node scripts/run_demo.js
# צפוי:
#   === STEP 1: SEARCH ===
#   ► OpenBrowser → success
#   ► Login → success
#   ► SearchAndScrape → success
#   Found X products
#   Selected: "..." ($X.XX)
#   === STEP 2: PURCHASE ===
#   ► OpenBrowser → success
#   ► Login → success
#   ► AddToCart → success
#   ► Checkout → success
#   === RESULT ===
#   { status: 'completed', screenshotPath: '...', lastStep: 'Checkout' }
# + קובץ PNG בתיקיית screenshots/

# בדיקה 4.2: Express server עולה
node src/app.js &
sleep 2

# בדיקה 4.3: API endpoints
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"", "maxPrice": 20}'
# צפוי: { "requestId": "...", "products": [...] }

curl -X POST http://localhost:3000/api/purchase \
  -H "Content-Type: application/json" \
  -d '{"productTitle":"Sauce Labs Onesie","shipping":{"firstName":"Test","lastName":"User","postalCode":"12345"}}'
# צפוי: { "requestId": "..." }

# בדיקה 4.4: Status polling
curl http://localhost:3000/api/status/<requestId-from-above>
# צפוי: { "currentStep": "...", "steps": [...] }

# בדיקה 4.5: Error handling
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"maxPrice": -5}'
# צפוי: { "error": "maxPrice must be a non-negative number" }
```

### קריטריון מעבר: ✅
- `run_demo.js` — E2E completes, screenshot saved
- Express server starts on port 3000
- POST /api/search — returns products
- POST /api/purchase — returns requestId
- GET /api/status/:id — returns step history
- Bad input — returns error message (not 500)

---

## שלב 5: UI (React) + Documentation
**זמן משוער: 60 דקות**

### קבצים שנוצרים:
```
client/
├── package.json
├── public/
│   └── index.html
├── src/
│   ├── App.jsx                     # Router: 4 screens
│   ├── api.js                      # fetch wrapper לכל ה-endpoints
│   ├── components/
│   │   ├── SearchScreen.jsx        # Input + filters + Submit
│   │   ├── ResultsScreen.jsx       # Product cards + Buy button
│   │   ├── StatusScreen.jsx        # Step progress (polling)
│   │   └── ResultScreen.jsx        # Final: screenshot + summary
│   └── index.jsx

# Root files:
README.md
AI_USAGE.md
```

### 4 המסכים:
| מסך | מה מציג | API Call |
|-----|---------|---------|
| Search | שדה query + maxPrice + כפתור "Search" | POST /api/search |
| Results | כרטיסי מוצר (שם, מחיר, תמונה) + כפתור "Buy" | POST /api/purchase |
| Status | פס התקדמות: Login ✓ → AddToCart ✓ → Checkout ⏳ | GET /api/status/:id (poll 2s) |
| Result | Screenshot הוכחה + סטטוס סופי (completed/failed) | From status response |

### בדיקות שלב 5:
```bash
# בדיקה 5.1: React dev server עולה
cd client && npm install && npm start
# צפוי: http://localhost:3500 נפתח

# בדיקה 5.2: E2E ידני — Full flow
# 1. פתח http://localhost:3500
# 2. הקלד query ריק, maxPrice: 50, לחץ Search
# 3. ודא: מוצרים מופיעים עם מחיר ותמונה
# 4. לחץ Buy על מוצר
# 5. ודא: מסך Status מציג התקדמות
# 6. ודא: מסך Result מציג "completed" + screenshot

# בדיקה 5.3: README.md כולל
# ✓ הוראות הרצה (npm install, env vars, npm start)
# ✓ תיאור זרימת האוטומציה
# ✓ Environment variables

# בדיקה 5.4: AI_USAGE.md כולל
# ✓ כלי AI שנעשה בהם שימוש
# ✓ 3-5 פרומפטים מדויקים
# ✓ דוגמאות להמלצות שגויות + תיקון
# ✓ מניעת דליפת סודות
```

### קריטריון מעבר: ✅
- UI מציג 4 מסכים
- Flow מלא עובד: Search → Results → Buy → Status → Result
- Screenshot מופיע במסך Result
- README.md + AI_USAGE.md מלאים

---

## סיכום — מפת דרכים

```
שלב 1 ──────► שלב 2 ──────► שלב 3 ──────► שלב 4 ──────► שלב 5
  שלד           Utils        Flows         Server         UI
  Config        Browser      Selectors     Services       React
  Domain        Retry        Login         API            Docs
                Price        Search        POC
                Logger       Cart
                Validator    Checkout
                             Index

  Jest ×5       Jest ×15     Jest ×4       Terminal E2E   Manual E2E
  node -e       node -e      node -e ×4    curl ×5        Browser
```

### כלל אצבע:
> **לא ממשיכים לשלב הבא עד שכל הבדיקות של השלב הנוכחי עוברות.**

### זמן כולל משוער: ~4.5 שעות
| שלב | זמן |
|-----|------|
| 1 — שלד + Domain | 20 דק |
| 2 — Utils + Browser | 40 דק |
| 3 — Flows + Policies | 90 דק |
| 4 — Services + API + POC | 60 דק |
| 5 — UI + Docs | 60 דק |
