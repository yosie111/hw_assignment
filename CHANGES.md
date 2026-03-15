# registerAccount — סיכום שינויים

## קבצים שהשתנו (4) + חדשים (1)

### 🔄 שינויים בקבצים קיימים

| קובץ | מיקום בפרויקט | מה השתנה |
|------|--------------|----------|
| `registerFlow.js` | `src/automation/sites/toolshop/flows/` | שכתוב מלא — ראה פירוט למטה |
| `loginFlow.js` | `src/automation/sites/toolshop/flows/` | בדיקת תוצאת register + warning |
| `SiteFlows.js` | `src/automation/adapters/` | ToolShopFlows.login — Register step visible |
| `.env.example` | שורש הפרויקט | הערות מפורטות על registration |

### 🆕 קבצים חדשים

| קובץ | מיקום בפרויקט | תיאור |
|------|--------------|-------|
| `registerFlow.test.js` | `tests/unit/` | 20+ unit tests |
| `README_REGISTRATION.md` | שורש הפרויקט | תיעוד מנגנון ה-registration |

---

## פירוט שינויים ב-registerFlow.js

### הוסר:
- `const https = require('https')` / `const http = require('http')`
- כל ה-Promise הידני עם `req.on('data')`, `req.on('error')`, `req.on('timeout')`
- ~50 שורות של low-level HTTP handling

### נוסף:
- `fetch()` נאטיבי (Node 18+) — ~25 שורות
- `withRetry()` — 2 attempts עם exponential backoff
- `AbortSignal.timeout(10_000)` — timeout נקי
- `validateRegistrationInput()` — בדיקת email/password/apiUrl לפני שליחה
- `parseErrorResponse()` — parsing JSON/text של שגיאות
- `statusCode` בתוצאה — מאפשר debugging
- Retry רק על 5xx (server errors) — לא על 4xx (client errors)
- `_internals` export — מאפשר testing של פונקציות פנימיות

### אותו API חיצוני:
- `registerAccount({ email, password, apiUrl })` → `{ success, alreadyExists, error? }`
- עדיין אף פעם לא זורק exception (מלבד validation errors)
- Backward compatible עם loginFlow

---

## פירוט שינויים ב-loginFlow.js

### לפני:
```js
if (apiUrl) {
  await registerAccount({ email, password, apiUrl });
  // result ignored!
}
```

### אחרי:
```js
if (apiUrl) {
  const regResult = await registerAccount({ email, password, apiUrl });
  if (!regResult.success) {
    console.warn(`⚠ Registration failed (${regResult.error}). Attempting login anyway.`);
  }
}
```

---

## פירוט שינויים ב-SiteFlows.js

### ToolShopFlows.login — לפני:
```js
async login(page) {
  const { login } = require('.../loginFlow');
  await login(page, { email, password, baseUrl, apiUrl });
}
```

### ToolShopFlows.login — אחרי:
```js
async login(page, options = {}) {
  const { stepLogger } = options;
  if (stepLogger && creds.apiUrl) {
    // Register as visible step: "Register ✓ (180ms)"
    await stepLogger.runStep('Register', async () => {
      const result = await registerAccount({ ... });
      if (!result.success) console.warn(...);
      return result;
    });
    // Login without auto-register
    await login(page, { ...creds, apiUrl: undefined });
  } else {
    // Backward compatible
    await login(page, creds);
  }
}
```

---

## הוראות התקנה

```bash
# 1. העתק את הקבצים למיקומים שלהם בפרויקט (ראה טבלה למעלה)

# 2. הרץ את הבדיקות החדשות
npx jest tests/unit/registerFlow.test.js --verbose

# 3. הרץ את כל הבדיקות — ודא שלא שברנו כלום
npm test
```
