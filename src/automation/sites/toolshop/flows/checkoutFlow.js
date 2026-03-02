// src/automation/sites/toolshop/flows/checkoutFlow.js
//
// Steps 8-10: Cart → Checkout (4 steps) → Confirmation Screenshot
//
// ToolShop checkout has 4 steps:
//   Step 1: Cart overview → click "Proceed to checkout" (proceed-1)
//   Step 2: Sign In → automatic if already logged in (proceed-2)
//   Step 3: Billing Address → fill fields → proceed-3
//   Step 4: Payment → select method → fill details → click Finish
//
// ★ Strategy: Use "Buy Now Pay Later" payment — simplest option,
//   only requires selecting monthly installments (no card details).
// ★ From recording: finish button needs retry — timing issues observed.

const S = require('../selectors');
const { withRetry } = require('../../../utils/retry');
const { takeScreenshot } = require('../../../utils/screenshot');

/**
 * Complete checkout in ToolShop.
 *
 * @param {import('playwright').Page} page - Product already in cart, user logged in
 * @param {Object} params
 * @param {Object} params.shipping - { firstName, lastName, postalCode, address, city, state, country }
 * @param {string} params.requestId
 * @returns {Promise<PurchaseResult>}
 */
async function checkout(page, { shipping, requestId }) {
  const screenshots = [];

  // ── Step 1: Navigate to cart and proceed ──
  await page.locator(S.NAV_CART).click();
  await page.locator(S.PROCEED_1).waitFor({ state: 'visible', timeout: 10_000 });

  // ★ Scrape cart total BEFORE leaving the cart page
  // Selector verified from screenshot: [data-test="cart-total"] → e.g. "$36.03"
  let subtotalText = '';
  let totalText = '';
  try {
    const totalEl = page.locator(S.CART_TOTAL);
    await totalEl.waitFor({ state: 'visible', timeout: 5_000 });
    totalText = (await totalEl.textContent()).trim();
    subtotalText = totalText;
  } catch (_) { /* best effort — don't block checkout */ }

  // ★ Screenshot 3: Cart page
  screenshots.push(await takeScreenshot(page, requestId, '3-cart-page'));

  await page.locator(S.PROCEED_1).click();

  // ── Step 2: Sign In (automatic if logged in) ──
  // Wait for proceed-2 button to appear — this step is auto-completed if logged in
  await page.locator(S.PROCEED_2).waitFor({ state: 'visible', timeout: 15_000 });
  await page.locator(S.PROCEED_2).click();

  // ── Step 3: Billing/Shipping Address ──
  // Wait for address form to load
  await page.locator(S.ADDRESS_STREET).waitFor({ state: 'visible', timeout: 10_000 });

  // Fill address fields with defaults where not provided
  const street  = shipping.address  || '123 Test Street';
  const city    = shipping.city     || 'New York';
  const state   = shipping.state    || 'NY';
  const country = shipping.country  || 'US';
  const postcode = shipping.postalCode || '10001';

  await page.locator(S.ADDRESS_STREET).fill(street);
  await page.locator(S.ADDRESS_CITY).fill(city);
  await page.locator(S.ADDRESS_STATE).fill(state);
  await page.locator(S.ADDRESS_COUNTRY).fill(country);
  await page.locator(S.ADDRESS_POSTCODE).fill(postcode);

  // ★ Screenshot 4: Address filled
  screenshots.push(await takeScreenshot(page, requestId, '4-address-filled'));

  // Proceed to payment
  await page.locator(S.PROCEED_3).click();

  // ── Step 4: Payment Method ──
  // Wait for payment form
  await page.locator(S.PAYMENT_METHOD).waitFor({ state: 'visible', timeout: 10_000 });

  // Select "Buy Now Pay Later" — simplest option (no card details needed)
  await page.locator(S.PAYMENT_METHOD).selectOption('buy-now-pay-later');

  // Wait for installments dropdown to appear and select
  await page.locator(S.BNPL_INSTALLMENTS).waitFor({ state: 'visible', timeout: 5_000 });
  await page.locator(S.BNPL_INSTALLMENTS).selectOption('3');

  // ★ Screenshot 5: Payment filled
  screenshots.push(await takeScreenshot(page, requestId, '5-payment-filled'));

  // ── Finish Order ──
  // ★ From recording: finish button may need multiple clicks (timing issue).
  // Use explicit wait + retry instead.
  await page.locator(S.FINISH_BTN).waitFor({ state: 'visible', timeout: 10_000 });

  await withRetry(async () => {
    await page.locator(S.FINISH_BTN).click();

    // Wait for confirmation — look for success indicator
    // ToolShop shows a confirmation message or redirects to confirmation page
    await page.waitForURL(
      url => url.includes('confirmation') || url.includes('order'),
      { timeout: 10_000 }
    ).catch(() => {});

    // Also try waiting for a success message element
    const successVisible = await page.locator(S.ORDER_SUCCESS).isVisible({ timeout: 5_000 })
      .catch(() => false);
    const confirmVisible = await page.locator(S.CONFIRM_MESSAGE).isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!successVisible && !confirmVisible) {
      // Check if we're still on the payment page (finish didn't work)
      const finishStillVisible = await page.locator(S.FINISH_BTN).isVisible()
        .catch(() => false);
      if (finishStillVisible) {
        throw new Error('Order not confirmed yet — finish button still visible');
      }
    }
  }, { label: 'ToolShop-FinishOrder' });

  // Read confirmation text
  let confirmText = 'Order confirmed';
  try {
    const successEl = page.locator(S.ORDER_SUCCESS);
    if (await successEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
      confirmText = await successEl.textContent();
    }
  } catch (_) { /* use default */ }

  try {
    const confirmEl = page.locator(S.CONFIRM_MESSAGE);
    if (await confirmEl.isVisible({ timeout: 3_000 }).catch(() => false)) {
      confirmText = await confirmEl.textContent();
    }
  } catch (_) { /* use previous value */ }

  // ★ Screenshot 6: Order confirmation — MANDATORY proof
  screenshots.push(await takeScreenshot(page, requestId, '6-order-complete'));

  // ★ Clean up: empty the cart after purchase
  // ToolShop doesn't always auto-clear the cart after order confirmation.
  try {
    await page.locator(S.NAV_CART).click();
    await page.waitForURL(url => url.includes('checkout'), { timeout: 5_000 }).catch(() => {});

    // Remove all items — click all X (delete) buttons until none remain
    const removeBtn = 'a.btn-danger, button.btn-danger, [class*="btn-danger"]';
    let safetyLimit = 20;
    while (safetyLimit-- > 0) {
      const btn = page.locator(removeBtn).first();
      if (!await btn.isVisible({ timeout: 1_500 }).catch(() => false)) break;
      const countBefore = await page.locator(removeBtn).count();
      await btn.click();
      // Explicit wait: item count decreases (no fixed sleep)
      await page.waitForFunction(
        ({ sel, prev }) => document.querySelectorAll(sel).length < prev,
        { sel: removeBtn, prev: countBefore },
        { timeout: 3_000 }
      ).catch(() => {});
    }
  } catch (_) { /* best effort — don't fail the order for cleanup */ }

  return {
    status: 'completed',
    confirmText: confirmText.trim(),
    subtotalText: subtotalText || totalText,
    taxText: '$0.00',  // ToolShop doesn't show tax separately
    totalText: totalText || subtotalText,
    screenshots,
  };
}

module.exports = { checkout };
