// src/automation/sites/toolshop/flows/registerFlow.js
//
// Auto-register a ToolShop account via REST API.
//
// ★ WHY: practicesoftwaretesting.com resets its database every few minutes,
//   wiping all registered accounts. This flow ensures the automation
//   always has a valid account by re-registering before login.
//
// Uses the REST API (not UI) for speed — registration takes ~200ms vs 3s+ via browser.

const https = require('https');
const http = require('http');

/**
 * Register a new account on ToolShop via REST API.
 *
 * @param {Object} params
 * @param {string} params.email    - Account email
 * @param {string} params.password - Account password
 * @param {string} params.apiUrl   - e.g. 'https://api.practicesoftwaretesting.com'
 * @returns {Promise<{ success: boolean, alreadyExists: boolean, error?: string }>}
 */
async function registerAccount({ email, password, apiUrl }) {
  const body = JSON.stringify({
    first_name: 'Test',
    last_name: 'Automation',
    address: '123 Test St',
    city: 'New York',
    state: 'NY',
    country: 'US',
    postcode: '10001',
    phone: '5551234567',
    dob: '1990-01-01',
    email,
    password,
  });

  return new Promise((resolve) => {
    const url = new URL('/users/register', apiUrl);
    const transport = url.protocol === 'https:' ? https : http;

    console.log(`[registerFlow] Registering ${email} at ${url.href}`);

    const req = transport.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 10_000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`[registerFlow] ✓ Account registered: ${email}`);
          resolve({ success: true, alreadyExists: false });
        } else if (res.statusCode === 422) {
          console.log(`[registerFlow] ✓ Account already exists: ${email}`);
          resolve({ success: true, alreadyExists: true });
        } else {
          console.warn(`[registerFlow] ✗ Registration failed (${res.statusCode}): ${data}`);
          resolve({ success: false, error: data });
        }
      });
    });

    req.on('error', (err) => {
      console.warn(`[registerFlow] ✗ Network error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('[registerFlow] ✗ Registration timed out');
      resolve({ success: false, error: 'timeout' });
    });

    req.write(body);
    req.end();
  });
}

module.exports = { registerAccount };
