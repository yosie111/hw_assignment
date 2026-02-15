# README_AI_BUGS.md — טעויות AI ותיקונן

> תיעוד שיטתי של באגים שנוצרו על ידי Claude AI במהלך פיתוח פרויקט Saucedemo Automation,
> וכיצד זוהו ותוקנו. מטרת הקובץ — למידה מטעויות ומניעת חזרה עליהן.

---

## BUG-001: Object.freeze לא זורק שגיאה בלי Strict Mode

**שכבה:** Tax Engine — `tests/tax/taxEngine.test.js`
**חומרה:** Test failure (1 מתוך 14)
**תאריך:** 2026-02-15

### מה ה-AI עשה

כתב טסט שמצפה ש-`Object.freeze` יזרוק exception כשמנסים לשנות property:

```javascript
// ❌ הקוד השגוי
test('is frozen (immutable)', () => {
  const result = resolve({ buyerCountry: 'US', sellerCountry: 'US', subtotal: 10 });
  expect(() => { result.taxRate = 0.99; }).toThrow();
});
```

### למה זה נכשל

Jest רץ ב-Sloppy Mode כברירת מחדל, לא ב-Strict Mode.
ב-Sloppy Mode, השמה ל-property של אובייקט frozen **נכשלת בשקט** — לא זורקת TypeError.
`toThrow()` צפתה ל-exception שלעולם לא מגיע.

### התיקון

```javascript
// ✅ הקוד המתוקן
test('is frozen (immutable)', () => {
  const result = resolve({ buyerCountry: 'US', sellerCountry: 'US', subtotal: 10 });
  result.taxRate = 0.99;
  expect(result.taxRate).toBe(0.08); // assignment silently ignored
});
```

### לקח

**AI מניח strict mode שלא קיים.** בסביבת Jest רגילה (ללא ESM), `Object.freeze` לא זורק.
צריך לבדוק את ההתנהגות בפועל — silent ignore — במקום לצפות ל-exception.

---

## BUG-002: Oracle חישב מס של הקונה במקום מס של האתר

**שכבה:** Services — `src/services/purchaseService.js`
**חומרה:** קריטי — Mismatch שגוי בין Oracle לאתר
**תאריך:** 2026-02-15

### מה ה-AI עשה

ב-Oracle Pattern Verification, ה-AI השתמש בקריאה אחת ל-`taxEngine.resolve()` עם מיקום הקונה:

```javascript
// ❌ הקוד השגוי
const taxResult = taxEngine.resolve({ buyerIp, subtotal: product.price });
const calc = calculateCart([product], { taxRate: taxResult.taxRate });
// IL buyer, under $150 → tax = 0% → total = $7.99
// Site (US 8%) → total = $8.63
// Result: MISMATCH ✗ (FALSE POSITIVE!)
```

### למה זה שגוי

ה-Oracle נועד **לאמת את חישוב האתר**, לא לחשב מה הקונה ישלם.
שני דברים שונים עורבבו:

| מטרה | שאלה | מס |
|---|---|---|
| **Oracle Verification** | "האם האתר חישב נכון?" | 8% (מס דומסטי של המוכר) |
| **Buyer Tax Info** | "כמה הקונה ישלם?" | 0% (פטור ייבוא ישראלי) |

### התיקון

שתי קריאות נפרדות ל-`taxEngine.resolve()`:

```javascript
// ✅ הקוד המתוקן
// 1. Buyer tax — for display
const buyerTax = taxEngine.resolve({ buyerIp, subtotal: product.price });

// 2. Oracle tax — seller's domestic rate (for site verification)
const sellerCountry = buyerTax.sellerCountry;
const oracleTax = taxEngine.resolve({
  buyerCountry: sellerCountry,  // US as "buyer" = domestic
  sellerCountry: sellerCountry, // US
  subtotal: product.price,
});
const calc = calculateCart([product], { taxRate: oracleTax.taxRate });
// Now: 7.99 × 1.08 = 8.63 → matches site ✓
```

### לקח

**AI ערבב שני concerns שונים בקריאה אחת.** כשיש הפרדה בין "אימות" ל"תצוגה", צריך שתי קריאות נפרדות.
Separation of Concerns אינו רק עיקרון תיאורטי — חוסר הפרדה יצר false positive mismatch.

---

## BUG-003: טסטים בתיקייה הלא נכונה

**שכבה:** Services — `tests/services/`
**חומרה:** Convention violation — טסטים עובדים אבל לא במבנה הפרויקט
**תאריך:** 2026-02-13

### מה ה-AI עשה

הציב את קבצי הטסט של Services ב-`src/__tests__/`:

```
src/__tests__/          ← ❌ AI שם את הטסטים פה
  statusStore.test.js
  searchService.test.js
  purchaseService.test.js
```

### למה זה שגוי

הפרויקט עוקב אחרי convention שונה — טסטים נמצאים ב-`tests/`:

```
tests/domain/           ← ✅ convention קיים
  Cart.test.js
  Product.test.js
```

### התיקון

העברת כל הטסטים ל-`tests/services/` ועדכון כל ה-import paths:

```javascript
// ❌ לפני (src/__tests__/)
const statusStore = require('../services/statusStore');

// ✅ אחרי (tests/services/)
const statusStore = require('../../src/services/statusStore');
```

### לקח

**AI לא בדק את מבנה הפרויקט הקיים לפני יצירת קבצים.**
תמיד לקרוא את `project_tree.txt` או לעשות `ls` לפני בחירת מיקום חדש.

---

## BUG-004: setTimeout ב-TTL חוסם יציאת Jest

**שכבה:** Services — `src/services/statusStore.js`
**חומרה:** Warning — Jest לא יוצא נקי
**תאריך:** 2026-02-13

### מה ה-AI עשה

יצר TTL cleanup עם `setTimeout` רגיל:

```javascript
// ❌ הקוד השגוי
setTimeout(() => store.delete(requestId), TTL_MS);
```

### למה זה בעיה

Node.js שומר תהליך פתוח כל עוד יש טיימרים פעילים.
Jest מסיים את הטסטים אבל הטיימר (30 דקות) מחזיק את ה-process alive:

```
A worker process has failed to exit gracefully and has been force exited.
This is likely caused by tests leaking due to improper teardown.
```

### התיקון

הוספת `.unref()` לטיימר:

```javascript
// ✅ הקוד המתוקן
const timer = setTimeout(() => store.delete(requestId), TTL_MS);
if (timer.unref) timer.unref();
```

### לקח

**AI לא חשב על lifecycle של טיימרים בסביבת טסטים.**
כל `setTimeout` ארוך טווח צריך `.unref()` כדי לא לחסום process exit.

---

## BUG-005: Import path case sensitivity — cartCalculator vs CartCalculator

**שכבה:** Services — import paths
**חומרה:** פוטנציאלי — עובד ב-Windows, נשבר ב-Linux
**תאריך:** 2026-02-13

### מה ה-AI עשה

השתמש ב-`cartCalculator` (c קטנה) ב-import:

```javascript
// ❌ פוטנציאלית שגוי
const { calculateCart } = require('../domain/cartCalculator');
```

### למה זה בעיה

הקובץ בפרויקט נקרא `CartCalculator.js` (C גדולה).
ב-Windows ו-macOS (case-insensitive filesystem) זה עובד.
ב-Linux (case-sensitive) — `MODULE_NOT_FOUND` crash.

### התיקון

```javascript
// ✅ תואם לשם הקובץ
const { calculateCart } = require('../domain/CartCalculator');
```

### לקח

**AI "שיער" את שם הקובץ במקום לבדוק.** Linux case-sensitive.
תמיד לוודא שם קובץ מדויק עם `ls` לפני כתיבת import.

---

## BUG-006: Playwright Strict Mode — Locator resolved to 2 elements

**שכבה:** Automation — Playwright selectors
**חומרה:** Test failure — strict mode violation
**תאריך:** 2026-02-15

### מה ה-AI עשה

השתמש ב-text selector לא מדויק:

```javascript
// ❌ הקוד השגוי
await page.locator('text=Sauce Labs Bolt T-Shirt').click();
```

### למה זה נכשל

Playwright ב-strict mode (ברירת מחדל) דורש ש-locator יתאים לאלמנט **אחד בלבד**.
`text=Sauce Labs Bolt T-Shirt` מצא 2 אלמנטים:
1. שם המוצר (`<div class="inventory_item_name">`)
2. תיאור המוצר שמכיל "Sauce Labs" בתוך הטקסט

### התיקון

שימוש ב-exact match או selector ספציפי:

```javascript
// ✅ אופציה א: exact match
await page.getByText('Sauce Labs Bolt T-Shirt', { exact: true }).click();

// ✅ אופציה ב: selector ספציפי
await page.locator('[data-test="inventory-item-name"]').click();
```

### לקח

**AI השתמש ב-text selector כללי מדי.** ב-Playwright strict mode,
כל locator חייב להיות חד-ערכי (resolves to exactly 1 element).
עדיף `data-test` attributes או `exact: true`.

---

## BUG-007: ברירת מחדל tax=8% hardcoded בכל הקוד

**שכבה:** Cross-cutting — config, services, client
**חומרה:** Design smell → refactor נדרש
**תאריך:** 2026-02-14 → 2026-02-15

### מה ה-AI עשה

פיזר `TAX_RATE = 0.08` ב-hardcode במספר קבצים שונים:

```javascript
// ❌ automation/config.js
const TAX_RATE = 0.08;

// ❌ services/searchService.js
const calc = calculateCart([product], { taxRate: TAX_RATE });

// ❌ client components
<span>Tax (8%):</span>
```

### למה זה שגוי

1. שינוי מס דורש עריכת מספר קבצים
2. לא תומך במס שונה לפי מדינה
3. הלוגיקה מפוזרת — חוסר Single Source of Truth
4. ה-UI מציג 8% כ-hardcoded string גם כשהמס בפועל שונה

### התיקון

הקמת שכבת TaxEngine עצמאית:

```
src/tax/
  taxPolicies.js   — כללי מס לפי מדינה (IL, US, GB, DEFAULT)
  geoResolver.js   — IP → country
  taxEngine.js     — resolve({ buyerIp, subtotal }) → { taxRate, rule, label }
```

`CartCalculator` נשאר עם `DEFAULT_TAX_RATE = 0` (מתמטיקה טהורה).
Services מעבירים את ה-taxRate שמתקבל מ-TaxEngine.
Client מציג `taxRate` ו-`taxLabel` דינמי מהתשובה.

### לקח

**AI בנה hardcoded values במקום מנגנון דינמי.**
מס הוא business rule שמשתנה לפי הקשר — צריך להיות מופשט מההתחלה.

---

## BUG-008: Oracle מציג US_IMPORT_FLAT במקום US_DOMESTIC_FLAT

**שכבה:** UI — `OracleComparison.jsx`
**חומרה:** Display — Rule name שגוי (תחשיב נכון)
**תאריך:** 2026-02-15

### מה ה-AI עשה

כשברירת המחדל של geoResolver היא buyer=IL, seller=US,
ה-Oracle קורא ל-resolve עם `buyerCountry='US', sellerCountry='US'`.
אבל ה-geoResolver stub עדיין מחזיר IL לפעמים — תלוי ב-flow.

### למה זה מבלבל

ה-UI מציג:
```
Oracle: US_IMPORT_FLAT — US Sales Tax (8%)
```

במקום:
```
Oracle: US_DOMESTIC_FLAT — US Sales Tax (8%)
```

ה-`IMPORT` ברגע ש-buyer=seller=US צריך להיות `DOMESTIC`.

### התיקון

וידוא שה-Oracle resolve קורא **תמיד** עם `buyerCountry === sellerCountry`
כדי לקבל suffix `DOMESTIC`, ובדיקה שאין flow שמעביר ערכים שגויים.

### לקח

**AI יצר קוד "נכון מתמטית" אבל עם metadata שגוי.**
Rule name הוא לא רק label — הוא audit trail שחייב לשקף את הלוגיקה בפועל.

---

## סיכום

| # | באג | שכבה | חומרה | סוג טעות |
|---|---|---|---|---|
| 001 | freeze לא זורק בלי strict | Test | Medium | הנחה שגויה על runtime |
| 002 | Oracle חישב מס קונה | Services | **קריטי** | ערבוב concerns |
| 003 | טסטים בתיקייה לא נכונה | Structure | Low | לא בדק convention |
| 004 | setTimeout חוסם Jest | Services | Low | לא חשב על cleanup |
| 005 | case sensitivity ב-import | Services | Medium | לא בדק שם קובץ |
| 006 | Playwright strict mode | Automation | Medium | selector לא מדויק |
| 007 | hardcoded 8% בכל מקום | Cross-cutting | Medium | חוסר הפשטה |
| 008 | US_IMPORT במקום US_DOMESTIC | UI | Low | metadata שגוי |

### דפוס חוזר

רוב הטעויות נובעות מ-**הנחות** — ה-AI מניח strict mode, מניח שם קובץ, מניח שקריאה אחת מספיקה, מניח שלוקטור יתאים. הפתרון: **לבדוק לפני שמניחים.**
