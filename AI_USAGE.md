# AI_USAGE.md — שימוש בכלי AI

## כלי AI ששימשו

| כלי | שימוש |
|------|--------|
| **Claude.ai (Anthropic)** | עיקר הביצוע — תכנון ארכיטקטורה, כתיבת קוד, בדיקות, תיעוד |
| **Google NotebookLM** | הורדת סרטונים, תמלול וסיכום (עברית + אנגלית) |
| **Gemini Deep Research** | חקירת הפרויקט, ביקורת על תוכניות Claude |
| **GitHub Copilot** | השלמות קוד, הוספת adapter לאמזון |

---

## פרומפטים כפי שנכתבו בפועל (5)

### Prompt 1 — תכנון ארכיטקטורה
```
תכנן ארכיטקטורה לפרויקט אוטומציה של אתר מסחר עם Playwright.
הדרישה: הפרדה בין 5 שכבות — automation, domain, services, api, ui.
האתר הראשון הוא saucedemo.com. צריך לתמוך בהוספת אתרים נוספים בעתיד.
תן מבנה תיקיות + הסבר על כל שכבה.
```

### Prompt 2 — כתיבת Flows
```
כתוב את שכבת ה-automation עבור saucedemo.com.
צריך: loginFlow, searchFlow, cartFlow, checkoutFlow.
כל flow צריך: explicit waits (לא sleep), retry עם backoff לפעולות שבירות,
screenshots בכל שלב, ו-selectors בקובץ נפרד (single source of truth).
```

### Prompt 3 — הוספת אתר ToolShop
```
אני צריך להוסיף adapter חדש עבור https://practicesoftwaretesting.com.
הנה הקלטת Playwright של ה-flow המלא (login, search, cart, checkout).
תנתח את ההקלטה, תזהה את ה-selectors האמיתיים, ותייצר את כל הקבצים:
selectors.js, flows (login, search, cart, checkout), parser, adapter.
שים לב: ההקלטה מראה ש-address הוא "street" (לא "address")
ו-postcode הוא "postal_code" (לא "postcode").
```

### Prompt 4 — Domain Models
```
בנה את שכבת ה-Domain: Product, Cart, Order.
דרישות:
- Factory Functions (לא classes) — בגלל סריאליזציה ל-JSON
- Object.freeze על כל אובייקט (Immutability)
- Cart עם Duplicate Guard
- Oracle Pattern: cartCalculator מחשב מס באופן עצמאי ומשווה מול DOM
```

### Prompt 5 — ביקורת צולבת (Claude vs Gemini)
```
הנה ביקורת של Gemini על התוכנית שלך.
Gemini טוען ש:
1. Factory Functions פחות טובים מ-Classes
2. ה-Oracle pattern מסובך מדי
3. חסר error handling ב-stepLogger
תגיב על כל נקודה — קבל או דחה עם הסבר.
```

---

## המלצות AI שגויות או מסוכנות — וכיצד תוקנו

### 1. Selectors שגויים ל-ToolShop
**AI המליץ:** `[data-test="address"]` ו-`[data-test="postcode"]`
**האמת (מההקלטה):** `[data-test="street"]` ו-`[data-test="postal_code"]`
**איך תיקנתי:** הקלטתי את ה-flow ב-Playwright Recorder, חילצתי את ה-selectors האמיתיים, ועדכנתי את selectors.js.

### 2. שימוש ב-waitForTimeout (sleep)
**AI המליץ:** `await page.waitForTimeout(2000)` אחרי חיפוש.
**למה זה מסוכן:** sleep קבוע הוא שביר — איטי מדי בסביבה מהירה, מהיר מדי בסביבה איטית.
**איך תיקנתי:** החלפתי ב-`waitForResponse()` שמחכה לתגובת API:
```js
const responsePromise = page.waitForResponse(
  resp => resp.url().includes('/products') && resp.status() === 200
);
await page.locator(S.SEARCH_SUBMIT).click();
await responsePromise;
```

### 3. Checkout עם 3 שלבים במקום 4
**AI הניח:** checkout בן 3 שלבים (address → payment → confirm).
**האמת:** ToolShop checkout הוא 4 שלבים (sign-in → address → payment → confirm).
**איך תיקנתי:** בדיקה ידנית באתר + ההקלטה חשפו את Step 1 (Sign In) שה-AI דילג עליו.

### 4. Payment בכרטיס אשראי (מורכב מדי)
**AI המליץ:** מילוי פרטי כרטיס אשראי (מספר, תוקף, CVV, שם).
**למה זה מסוכן:** דורש מספר כרטיס תקין, ולידציות מורכבות, ונקודות כשל רבות.
**איך תיקנתי:** בחרתי "Buy Now Pay Later" — דורש רק בחירת installments, בלי פרטי כרטיס.

### 5. סיסמאות בקוד (Hardcoded Credentials)
**AI כתב:** `const password = 'welcome01'` ישירות בקוד.
**למה זה מסוכן:** סיסמאות בקוד נכנסות ל-Git ונחשפות לכולם.
**איך תיקנתי:** העברה ל-`.env` + קריאה דרך `config.js`:
```js
TOOLSHOP_PASSWORD: process.env.TOOLSHOP_PASSWORD || 'welcome01'
```

---

## הגנה על סודות (Secrets Protection)

1. **`.env` ב-`.gitignore`** — קובץ הסיסמאות לא נכנס ל-Git
2. **`.env.example`** — קובץ דוגמה עם ערכי ברירת מחדל (פרטי אתר דמו — לא סודיים באמת)
3. **`config.js` כשכבת הפשטה** — הקוד קורא מ-config, לא ישירות מ-env
4. **אין סיסמאות בלוגים** — stepLogger רושם רק step name + status, לא פרמטרים
5. **אין סיסמאות ב-screenshots** — צילומי מסך מלבד מסך ה-login
