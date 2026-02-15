# README_AI_BUGS.md — תיעוד באגים ופתרונות נאיביים של AI

> **מטרה:** תיעוד מקרים בהם ה-AI סיפק פתרונות "נאיביים", שבירים או לא מאובטחים,
> ואיך זיהיתי את הבעיות ותיקנתי אותם.
>
> **פרויקט:** אוטומציה של תהליך רכישה — Saucedemo E-Commerce
>
> **תאריך:** פברואר 2026

---

## BUG #1 — Classes במקום Factory Functions (מבנה שביר)

**מה ה-AI נתן:**
```javascript
// ❌ הגרסה הנאיבית — class עם new, this, prototype
class Product {
  constructor({ id, title, price, ... }) {
    this.id = id;
    this.title = title;
    this.price = price;
  }
  static create(data) { return new Product(data); }
  toJSON() { return { id: this.id, ... }; }
}
module.exports = { Product };
```

**למה זה בעייתי:**
- `this` תלויות הקשר — אם מעבירים מתודה כ-callback (למשל `array.map(product.toJSON)`) ה-`this` נשבר
- Prototype chain מוסיף overhead מיותר — Domain objects שלנו הם data, לא behavior
- `new` keyword חשוף לשכחה — `Product({...})` בלי `new` יזרוק שגיאה קריפטית
- `JSON.stringify()` דורש `toJSON()` מותאם — שכחה של שדה = data loss שקט
- לא JSON-serializable "out of the box" — צריך המרה ידנית בכל מקום

**איך תיקנתי:**
```javascript
// ✅ Factory Function — POJO, no this, no new, no prototype
function createProduct({ id, title, price, currency, productUrl, imageUrl, source }) {
  if (!id || typeof id !== 'string') throw new Error('Product id is required');
  if (typeof price !== 'number' || price < 0) throw new Error('Price must be non-negative');

  return Object.freeze({
    id,
    title: title.trim(),
    price,
    currency: currency || 'USD',
    productUrl: productUrl || '',
    imageUrl: imageUrl || null,
    source: source || 'unknown',
  });
}
```

**ההבדל המהותי:** Factory Function מחזיר POJO פשוט שהוא JSON-serializable מיידית, בלי prototype chain, בלי `this`, ובלי `new`. אי אפשר לשכוח לעשות `new`. אי אפשר לשכוח `toJSON()`. מה שיוצא מהפונקציה — זה מה שנשלח ל-API ול-UI.

**מקור:** מסמך מחקר "חקר שכבת Domain" המליץ על Factory Functions. בנוסף, הקוד יושם ב-3 מודלים: Product, Cart, Order.

---

## BUG #2 — אובייקטים מיוטבלים (Mutable Objects)

**מה ה-AI נתן:**
```javascript
// ❌ אובייקט שניתן לשנות אחרי יצירה
const product = new Product({ id: 'x', title: 'Onesie', price: 7.99 });
product.price = 0;  // ✅ עובד! שינינו מחיר בלי שום הגנה
product.title = 'HACKED';  // ✅ עובד! שינינו שם בלי שום שגיאה
```

**למה זה בעייתי:**
- באוטומציה, מוצר שנסרק מה-DOM ונשמר — צריך להישאר כפי שנסרק. אם קוד ב-Services משנה price בטעות, כל ה-Oracle Validation נשבר
- שינוי שדות אחרי יצירה = "spooky action at a distance" — באג שקשה מאוד לאתר
- בפרויקט שלנו, Product עובר דרך 4 שכבות (Automation → Domain → Services → API) — כל שכבה יכולה בטעות לשנות

**איך תיקנתי:**
```javascript
// ✅ Object.freeze — אי אפשר לשנות אחרי יצירה
return Object.freeze({ id, title: title.trim(), price, ... });

// ניסיון שינוי נכשל בשקט (strict mode יזרוק TypeError)
product.price = 0;     // ❌ לא ישפיע — price נשאר 7.99
product.title = 'X';   // ❌ לא ישפיע — title נשאר 'Onesie'
```

**Unit Test שמוכיח:**
```javascript
const p = createProduct({ id: 'x', title: 'Onesie', price: 7.99 });
try { p.price = 0; } catch (_) {}
assert('Frozen: price cannot be changed', p.price === 7.99);  // ✅ PASS
```

**יושם על:** Product, Order, Order.screenshots, Order.steps, Order.cartValidation — כולם frozen.

---

## BUG #3 — Cart ללא הגנה מפני כפילויות

**מה ה-AI נתן:**
```javascript
// ❌ Cart Class — push ישר למערך, בלי בדיקת כפילויות
class Cart {
  constructor() { this.items = []; }
  addItem(product) {
    if (!product || typeof product.price !== 'number') throw new Error('...');
    this.items.push(product);  // 💀 ניתן להוסיף אותו מוצר פעמיים!
  }
}
```

**למה זה בעייתי:**
- Saucedemo לא מאפשר כמות > 1 מאותו פריט. אם Cart מקבל כפילות — חישוב המס (Oracle) יצא שגוי
- `push()` משנה את המערך ישירות (mutation) — הפרה של Immutable Style
- אין duplicate guard — שום הודעת שגיאה אם מנסים להוסיף מוצר שכבר קיים

**איך תיקנתי:**
```javascript
// ✅ Aggregate Root — duplicate guard + immutable style
function createCart() {
  let items = [];
  return {
    addItem(product) {
      if (!product || !product.id) throw new Error('Cannot add invalid product to cart');
      if (items.find(item => item.id === product.id)) {
        throw new Error(`Product "${product.id}" already in cart`);  // 🛡️ Duplicate Guard
      }
      items = [...items, product];  // 🛡️ Immutable — מערך חדש, לא push
    },
    // ...
  };
}
```

**Unit Test שמוכיח:**
```javascript
const cart = createCart();
cart.addItem(p1);
try { cart.addItem(p1); assert('Duplicate throws', false); }
catch (e) { assert('Duplicate throws', e.message.includes('already in cart')); }  // ✅
```

---

## BUG #4 — getItems() מחזיר reference ישיר (דליפת state)

**מה ה-AI נתן:**
```javascript
// ❌ Class Cart — this.items חשוף
class Cart {
  constructor() { this.items = []; }
  // ...
  // הבעיה: this.items הוא public property — כל קוד חיצוני יכול לגשת ולשנות
}

// קוד חיצוני:
const items = cart.items;
items.push({ id: 'hack', title: 'Free Product', price: 0 });  // 💀 הכנסנו מוצר מזויף!
```

**למה זה בעייתי:**
- קוד ב-Services או ב-API יכול בטעות (או בכוונה) לשנות את תוכן העגלה
- Encapsulation נשבר — ה-Cart לא שולט במה שנכנס אליו

**איך תיקנתי:**
```javascript
// ✅ Closure + defensive copy
function createCart() {
  let items = [];  // 🛡️ private — לא נגיש מבחוץ
  return {
    getItems() { return [...items]; },  // 🛡️ מחזיר COPY, לא reference
    getCount() { return items.length; },
    // ...
  };
}
```

**Unit Test שמוכיח:**
```javascript
const copy = cart.getItems();
copy.push({ id: 'hack', title: 'Hack', price: 0 });
assert('getItems returns copy', cart.getCount() === 3);  // ✅ Cart לא השתנה
```

---

## BUG #5 — Epsilon Tolerance קטן מדי (0.01)

**מה ה-AI נתן:**
```javascript
// ❌ tolerance = 0.01 — צר מדי
function verifyCart(domValues, calculated, tolerance = 0.01) {
  const totalMatch = Math.abs(domValues.total - calculated.total) <= tolerance;
  // ...
}
```

**למה זה בעייתי:**
- Saucedemo משתמש ב-Banker's Rounding (עיגול בנקאי) — ההפרש יכול להגיע ל-$0.015
- עם tolerance של 0.01, המערכת תדווח "mismatch" על הפרשי עיגול תקינים
- False positive = רעש — המשתמש רואה "שגיאה" שהיא לא באמת שגיאה

**איך תיקנתי:**
```javascript
// ✅ Epsilon = 0.02 — מבוסס על ניתוח מתמטי של Banker's Rounding
function validateCartTotal(calculatedTotal, domTotalText) {
  const fromSite = parseFloat(domTotalText.replace(/[^0-9.]/g, ''));
  return {
    match: Math.abs(calculatedTotal - fromSite) < 0.02,  // 🛡️ Epsilon 0.02
    calculated: calculatedTotal,
    fromSite,
  };
}
```

**Unit Tests שמוכיחים:**
```javascript
assert('Epsilon: $8.63 ≈ $8.64', validateCartTotal(8.63, '$8.64').match === true);   // ✅
assert('Beyond: $8.63 ≠ $8.66', validateCartTotal(8.63, '$8.66').match === false);   // ✅
```

---

## BUG #6 — אין הגנה מפני IEEE 754 Floating Point

**מה ה-AI נתן:**
```javascript
// ❌ חיבור ישיר — floating point ישבור
const subtotal = items.reduce((sum, item) => sum + item.price, 0);
const tax = subtotal * 0.08;
const total = subtotal + tax;

// בפועל: 0.1 + 0.2 = 0.30000000000000004 (לא 0.3!)
// מס על $7.99: 7.99 * 0.08 = 0.6392000000000001 (לא 0.64!)
```

**למה זה בעייתי:**
- JavaScript משתמש ב-IEEE 754 double precision — מספרים עשרוניים לא מיוצגים במדויק
- בלי עיגול, חישוב מס של 8% על $7.99 ייתן 0.6392000000000001 במקום 0.64
- כשמשווים Oracle vs DOM — הפרש קטנטן יגרום ל-false mismatch

**איך תיקנתי:**
```javascript
// ✅ עיגול בכל שלב — Math.round(value * 100) / 100
const roundedSubtotal = Math.round(subtotal * 100) / 100;
const tax = Math.round(roundedSubtotal * TAX_RATE * 100) / 100;
const total = Math.round((roundedSubtotal + tax) * 100) / 100;
```

**Unit Test שמוכיח:**
```javascript
const tricky = calculateCart([{ title: 'A', price: 0.1 }, { title: 'B', price: 0.2 }]);
assert('Floating point fix: subtotal = 0.3', tricky.subtotal === 0.3);  // ✅ לא 0.300000...04
```

---

## BUG #7 — verifyCart דורש parsing מראש (API שביר)

**מה ה-AI נתן:**
```javascript
// ❌ verifyCart מצפה לאובייקט parsed — הקורא חייב לפרסר בעצמו
function verifyCart(domValues, calculated, tolerance = 0.01) {
  // domValues = { subtotal: 7.99, tax: 0.64, total: 8.63 }
  // ...
}

// הקורא צריך לעשות:
const domValues = {
  subtotal: parseFloat(subtotalText.replace('$','')),
  tax: parseFloat(taxText.replace('$','')),
  total: parseFloat(totalText.replace('$','')),
};
const result = verifyCart(domValues, calculated);
```

**למה זה בעייתי:**
- מי שקורא ל-verifyCart צריך לדעת איך לפרסר DOM text — זה ידע שצריך להיות מוכמס בפונקציה
- כל caller יכול לפרסר אחרת (regex שונה, trim שונה) — חוסר עקביות
- Automation מחזיר `totalText: "Total: $8.63"` — string, לא number

**איך תיקנתי:**
```javascript
// ✅ validateCartTotal מקבל string גולמי ופורס בעצמו
function validateCartTotal(calculatedTotal, domTotalText) {
  const numericPart = domTotalText.replace(/[^0-9.]/g, '');  // 🛡️ Parsing פנימי
  const fromSite = parseFloat(numericPart);
  return {
    match: Math.abs(calculatedTotal - fromSite) < 0.02,
    calculated: calculatedTotal,
    fromSite,
  };
}

// שימוש פשוט:
validateCartTotal(8.63, 'Total: $8.63');  // ✅ עובד ישר
validateCartTotal(8.63, '$8.63');           // ✅ עובד גם ככה
```

**Unit Tests שמוכיחים:**
```javascript
assert('Parse "Total: $8.63"', validateCartTotal(8.63, 'Total: $8.63').match === true);  // ✅
assert('Parse "$8.63"', validateCartTotal(8.63, '$8.63').match === true);                 // ✅
assert('Parse "8.63"', validateCartTotal(8.63, '8.63').match === true);                   // ✅
```

---

## BUG #8 — Order ללא שדה cartValidation (אובדן מידע)

**מה ה-AI נתן:**
```javascript
// ❌ OrderResult — אין שדה cartValidation
class OrderResult {
  constructor({ status, lastStep, requestId, screenshotPath, error, cartVerification }) {
    this.status = status;
    this.screenshotPath = screenshotPath;
    this.cartVerification = cartVerification || null;  // שם שגוי + לא frozen
  }
}
```

**למה זה בעייתי:**
- `cartVerification` (שם ישן) לא frozen — ניתן לשנות בדיעבד
- אין שדות `product`, `shipping`, `confirmText`, `totalText`, `steps`, `screenshots[]` — מידע הכרחי ל-UI הולך לאיבוד
- ה-UI צריך breakdown: subtotal, tax, total, fromSite, match — שום דבר מזה לא נשמר

**איך תיקנתי:**
```javascript
// ✅ Order — DDD Aggregate, frozen, עם cartValidation מלא
function createOrder({
  requestId, product, shipping, status,
  confirmText, totalText, screenshots, steps, error,
  cartValidation,  // { breakdown: { subtotal, tax, total }, fromSite, match }
}) {
  if (!requestId) throw new Error('Order requestId is required');
  if (!status) throw new Error('Order status is required');

  return Object.freeze({
    requestId, product: product || null, shipping: shipping || null,
    status, confirmText: confirmText || null, totalText: totalText || null,
    screenshots: Object.freeze(screenshots || []),   // 🛡️ Frozen array
    steps: Object.freeze(steps || []),                // 🛡️ Frozen array
    error: error || null,
    cartValidation: cartValidation ? Object.freeze(cartValidation) : null,  // 🛡️ Frozen
    createdAt: new Date().toISOString(),
  });
}
```

---

## BUG #9 — Services תוכננו כ-Synchronous (חוסם HTTP)

**מה ה-AI נתן (בגרסה הראשונה):**
```javascript
// ❌ Purchase sync — API ממתין 15-30 שניות!
app.post('/api/purchase', async (req, res) => {
  const result = await purchaseService.execute(req.body);  // 💀 30 sec timeout!
  res.json(result);
});
```

**למה זה בעייתי:**
- Playwright purchase flow לוקח 15–30 שניות (login → cart → checkout → screenshots)
- HTTP request ב-Express עם timeout של 30 שניות — Connection Timeout
- Browser נתקע = HTTP socket פתוח, משאב שמוחזק

**איך תיקנתי (בתוכנית V3):**
```javascript
// ✅ Fire-and-Forget — API מחזיר 202 מיד, UI עושה polling
async function executePurchase({ product, shipping }) {
  const requestId = uuidv4();
  statusStore.create(requestId, 'purchase');

  // 🛡️ Fire and forget — לא await!
  _runPurchase({ product, shipping, requestId }).catch(err => {
    console.error(`Purchase ${requestId} failed:`, err.message);
  });

  return { requestId };  // מוחזר ב-<1ms
}

// API:
// POST /api/purchase → 202 Accepted { requestId }
// GET /api/status/:id → 200 { status, currentStep, steps[], result }
```

---

## BUG #10 — Credentials בקוד (לא בקובץ config)

**מה ה-AI נתן (בגרסת ה-POC הראשונה):**
```javascript
// ❌ Hardcoded credentials בתוך loginFlow.js
await page.fill('#user-name', 'standard_user');
await page.fill('#password', 'secret_sauce');
```

**למה זה בעייתי:**
- Credentials חשופים בקובץ ה-flow — אם עושים commit ל-Git, הם גלויים
- אי אפשר להחליף user בלי לשנות קוד

**איך תיקנתי:**
```javascript
// ✅ config.js — מקום אחד, ניתן להחליף ל-env vars
// src/automation/config.js
module.exports = {
  BASE_URL: 'https://www.saucedemo.com',
  USERNAME: process.env.SAUCE_USER || 'standard_user',
  PASSWORD: process.env.SAUCE_PASS || 'secret_sauce',
  // ...
};

// loginFlow.js — imports from config
const config = require('../config');
await page.fill('#user-name', config.USERNAME);
await page.fill('#password', config.PASSWORD);
```

---

## סיכום — דפוסים שחוזרים

| דפוס | מה ה-AI עשה | מה תיקנתי | עיקרון |
|------|------------|----------|--------|
| Classes | `class Product` + `new` + `this` | Factory Function + POJO | Simplicity |
| Mutable | `this.price = x` ניתן לשינוי | `Object.freeze()` | Immutability |
| Exposed state | `this.items` public | Closure + defensive copy | Encapsulation |
| No validation | מקבל כל input | Fail Fast — throw מיד | Defensive Programming |
| Floating point | חיבור ישיר | `Math.round(v*100)/100` | Numeric Safety |
| Tight tolerance | `epsilon = 0.01` | `epsilon = 0.02` | Real-world Robustness |
| Sync HTTP | `await` 30 שניות | Fire-and-Forget + Polling | Async Architecture |
| Hardcoded creds | בתוך ה-flow | config.js + env vars | Security |
| Coupled parsing | Caller פורס DOM | פונקציה פורסת בעצמה | Encapsulation |
| Missing data | Order בלי breakdown | Order = DDD Aggregate | Completeness |

---

## טבלת הוכחות — Unit Tests

| באג # | מה נבדק | מספר טסטים | סטטוס |
|--------|---------|-----------|-------|
| #1 | JSON serializable ישירות | 4 | ✅ PASS |
| #2 | Frozen — price/title לא ניתן לשינוי | 3 | ✅ PASS |
| #3 | Duplicate product throws | 2 | ✅ PASS |
| #4 | getItems returns copy | 2 | ✅ PASS |
| #5 | Epsilon tolerance boundary | 4 | ✅ PASS |
| #6 | Floating point 0.1+0.2=0.3 | 3 | ✅ PASS |
| #7 | Parse "Total: $8.63" formats | 3 | ✅ PASS |
| #8 | Order.cartValidation frozen | 2 | ✅ PASS |

**סה"כ: 115 טסטים עוברים — 23 מתוכם קשורים ישירות לבאגים שתועדו כאן.**
