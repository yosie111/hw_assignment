# ToolShop Auto-Registration — README Section

> **Paste this section into your main README.md under the ToolShop section.**

---

## ToolShop Auto-Registration

### Why Auto-Registration Exists

The ToolShop test site (`practicesoftwaretesting.com`) resets its database every few minutes,
wiping all registered accounts. Without auto-registration, every automation run would fail
with "Invalid credentials" within minutes.

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

### Configuration

Registration uses credentials from `.env`:
```env
TOOLSHOP_EMAIL=gohok69228@dolofan.com
TOOLSHOP_PASSWORD="gohok69228@A"
TOOLSHOP_API_URL=https://api.practicesoftwaretesting.com
```

### Manual Registration (if needed)

```bash
curl -s -X POST https://api.practicesoftwaretesting.com/users/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"Automation","address":"123 Test St","city":"New York","state":"NY","country":"US","postcode":"10001","phone":"5551234567","dob":"1990-01-01","email":"gohok69228@dolofan.com","password":"gohok69228@A"}'
```

### Tests

```bash
npx jest tests/unit/registerFlow.test.js
```

Test coverage: input validation, happy paths (201/422), error paths (400/500/network/timeout),
retry behavior, and request body verification.
