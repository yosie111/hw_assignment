// src/automation/adapters/SiteAdapter.js
//
// Abstract contract for site adapters.
// Every adapter (SauceDemo, Amazon, ToolShop, …) must extend this class
// and implement search() + purchase().
//
// Why a base class and not just "duck typing"?
//   - Fail-fast: if a method is missing, you get a clear error at call-time
//   - Self-documenting: JSDoc on the base class = single source of truth
//   - FakeAdapter (for tests) extends the same contract

/**
 * @typedef {Object} NormalizedProduct
 * @property {string}  id        - Unique product identifier (site-specific)
 * @property {string}  title     - Product name (trimmed)
 * @property {number}  price     - Non-negative price
 * @property {string}  currency  - ISO currency code (default: 'USD')
 * @property {string}  [productUrl] - URL to product page
 * @property {string}  [imageUrl]   - Product image URL
 * @property {string}  source    - Site name ('Saucedemo', 'Amazon', …)
 */

/**
 * @typedef {Object} PurchaseResult
 * @property {string}   status          - 'completed' | 'failed'
 * @property {string}   lastStep        - Last step reached ('Login','AddToCart','Checkout')
 * @property {string}   requestId       - Request identifier
 * @property {string}   [confirmText]   - Confirmation message (on success)
 * @property {string}   [subtotalText]  - DOM subtotal text
 * @property {string}   [taxText]       - DOM tax text
 * @property {string}   [totalText]     - DOM total text
 * @property {string[]} [cartScreenshots] - Screenshot paths from cart stage
 * @property {string[]} [screenshots]   - Screenshot paths from checkout stage
 * @property {Object[]} [steps]         - Step history [{step, status, durationMs}]
 * @property {string}   [error]         - Error message (on failure)
 * @property {string}   [screenshotPath] - Error screenshot path (on failure)
 */

class SiteAdapter {
  /**
   * Human-readable site name used in logs and error messages.
   * @returns {string}
   */
  get name() {
    throw new Error('SiteAdapter.name must be implemented');
  }

  /**
   * Whether the adapter has a live browser session.
   * Used by sessionStore to check if the adapter is still usable.
   * @returns {boolean}
   */
  isAlive() {
    return false;
  }

  /**
   * Close the adapter's browser and release resources.
   * Called by sessionStore on TTL expiration or after purchase completes.
   * Default: no-op (adapters that manage browser state override this).
   */
  async close() {
    // Default no-op — subclasses override if they hold browser state
  }

  /**
   * Search for products on the site.
   *
   * Contract:
   *   - Returns NormalizedProduct[] on success
   *   - Throws Error on failure (browser crash, login failure, etc.)
   *   - Must handle browser open/close internally (caller never sees Playwright)
   *
   * @param {Object} params
   * @param {string}   [params.query='']    - Search text (empty = all products)
   * @param {Object}   [params.filters={}]  - { maxPrice?: number }
   * @param {string}    params.requestId    - UUID for tracing
   * @param {Function} [params.onStep]      - Callback: ({ step, status, durationMs }) => void
   * @returns {Promise<NormalizedProduct[]>}
   * @throws {Error}
   */
  async search(params) {
    throw new Error(`${this.name || 'SiteAdapter'}: search() not implemented`);
  }

  /**
   * Purchase a product on the site.
   *
   * Contract:
   *   - Returns PurchaseResult on both success AND graceful failure
   *     (graceful = error caught inside adapter, screenshot taken)
   *   - Throws Error only on unexpected/unrecoverable crashes
   *   - Must handle browser open/close internally
   *
   * @param {Object} params
   * @param {string}  params.productTitle  - Exact product title to purchase
   * @param {Object}  params.shipping      - { firstName, lastName, postalCode }
   * @param {string}  params.requestId     - UUID for tracing
   * @param {Function} [params.onStep]     - Status callback
   * @returns {Promise<PurchaseResult>}
   * @throws {Error} Only on unrecoverable crashes
   */
  async purchase(params) {
    throw new Error(`${this.name || 'SiteAdapter'}: purchase() not implemented`);
  }
}

module.exports = { SiteAdapter };
