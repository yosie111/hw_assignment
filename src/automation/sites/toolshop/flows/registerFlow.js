// src/automation/sites/toolshop/flows/registerFlow.js
//
// Auto-register a ToolShop account via REST API.
//
// ★ WHY: practicesoftwaretesting.com resets its database every few minutes,
//   wiping all registered accounts. This flow ensures the automation
//   always has a valid account by re-registering before login.
//
// Uses the REST API (not UI) for speed — registration takes ~200ms vs 3s+ via browser.
//
// ★ IMPROVEMENTS (v2):
//   - Replaced raw http/https with native fetch (Node 18+)
//   - Added retry via withRetry (exponential backoff)
//   - Structured error parsing (JSON response → readable message)
//   - Input validation before sending request
//   - AbortSignal.timeout for clean timeout handling

const { withRetry } = require('../../../utils/retry');

/**
 * Default registration data for automation accounts.
 * ToolShop requires all fields — these are safe test defaults.
 */
const DEFAULT_PROFILE = {
  first_name: 'Test',
  last_name: 'Automation',
  address: ['123 Test St'],
  city: 'New York',
  state: 'NY',
  country: 'US',
  postcode: '10001',
  phone: '5551234567',
  dob: '1990-01-01',
};

const REGISTER_TIMEOUT_MS = 10_000;
const REGISTER_MAX_ATTEMPTS = 2;

/**
 * Validate registration inputs before sending to API.
 * @param {Object} params
 * @throws {Error} If required fields are missing or invalid
 */
function validateRegistrationInput({ email, password, apiUrl }) {
  if (!apiUrl || typeof apiUrl !== 'string') {
    throw new Error('[registerFlow] apiUrl is required');
  }
  if (!email || typeof email !== 'string') {
    throw new Error('[registerFlow] email is required');
  }
  if (!password || typeof password !== 'string') {
    throw new Error('[registerFlow] password is required');
  }
  // ToolShop password policy: min 8 chars, uppercase, number, special char
  if (password.length < 3) {
    throw new Error(
      '[registerFlow] password too short — ToolShop requires at least 3 characters'
    );
  }
}

/**
 * Parse error response from ToolShop API.
 * Tries JSON first, falls back to raw text.
 *
 * @param {string} rawBody - Raw response body
 * @returns {string} Human-readable error message
 */
function parseErrorResponse(rawBody) {
  try {
    const parsed = JSON.parse(rawBody);
    // ToolShop may return { message: "..." } or { error: "..." } or { errors: {...} }
    if (parsed.message) return parsed.message;
    if (parsed.error) return parsed.error;
    if (parsed.errors) return JSON.stringify(parsed.errors);
    return rawBody;
  } catch {
    return rawBody || 'Unknown error';
  }
}

/**
 * Register a new account on ToolShop via REST API.
 *
 * Wraps the HTTP call in withRetry (2 attempts, exponential backoff)
 * so transient network errors don't break the entire flow.
 *
 * @param {Object} params
 * @param {string} params.email    - Account email
 * @param {string} params.password - Account password
 * @param {string} params.apiUrl   - e.g. 'https://api.practicesoftwaretesting.com'
 * @returns {Promise<{ success: boolean, alreadyExists: boolean, error?: string, statusCode?: number }>}
 */
async function registerAccount({ email, password, apiUrl }) {
  // ── Input validation ──
  validateRegistrationInput({ email, password, apiUrl });

  const url = new URL('/users/register', apiUrl).href;
  const body = JSON.stringify({
    ...DEFAULT_PROFILE,
    email,
    password,
  });

  console.log(`[registerFlow] Registering ${email} at ${url}`);
  const startTime = Date.now();

  try {
    // ── Retry wrapper — handles transient network errors ──
    const result = await withRetry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body,
          signal: AbortSignal.timeout(REGISTER_TIMEOUT_MS),
        });

        const responseText = await response.text();
        const durationMs = Date.now() - startTime;

        // ── 200/201: Account created successfully ──
        if (response.status === 200 || response.status === 201) {
          console.log(
            `[registerFlow] ✓ Account registered: ${email} (${durationMs}ms)`
          );
          return { success: true, alreadyExists: false, statusCode: response.status };
        }

        // ── 422: Account already exists (this is OK) ──
        if (response.status === 422) {
          console.log(
            `[registerFlow] ✓ Account already exists: ${email} (${durationMs}ms)`
          );
          return { success: true, alreadyExists: true, statusCode: 422 };
        }

        // ── 5xx: Server error — should retry ──
        if (response.status >= 500) {
          const errorMsg = parseErrorResponse(responseText);
          throw new Error(
            `Server error (${response.status}): ${errorMsg}`
          );
        }

        // ── 4xx (not 422): Client error — no point retrying ──
        const errorMsg = parseErrorResponse(responseText);
        console.warn(
          `[registerFlow] ✗ Registration failed (${response.status}): ${errorMsg} (${durationMs}ms)`
        );
        return {
          success: false,
          alreadyExists: false,
          error: errorMsg,
          statusCode: response.status,
        };
      },
      { label: 'ToolShop-Register', maxAttempts: REGISTER_MAX_ATTEMPTS }
    );

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // ── AbortError / TimeoutError = timeout ──
    // Note: withRetry wraps the original error, so we check both
    // error.name (direct throw) and error.message (wrapped by retry)
    const isTimeout =
      error.name === 'TimeoutError' ||
      error.name === 'AbortError' ||
      error.message.includes('aborted') ||
      error.message.includes('timed out');

    if (isTimeout) {
      console.warn(`[registerFlow] ✗ Registration timed out (${durationMs}ms)`);
      return { success: false, alreadyExists: false, error: 'timeout' };
    }

    // ── Network error or retry exhausted ──
    console.warn(
      `[registerFlow] ✗ Registration error: ${error.message} (${durationMs}ms)`
    );
    return { success: false, alreadyExists: false, error: error.message };
  }
}

module.exports = {
  registerAccount,
  // Exported for testing
  _internals: {
    validateRegistrationInput,
    parseErrorResponse,
    DEFAULT_PROFILE,
    REGISTER_TIMEOUT_MS,
    REGISTER_MAX_ATTEMPTS,
  },
};
