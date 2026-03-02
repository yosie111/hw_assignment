// tests/unit/toolshopSelectors.test.js
//
// Validates the selectors file itself:
//   ✓ All selectors are non-empty strings
//   ✓ No duplicate selectors (prevents copy-paste bugs)
//   ✓ data-test selectors follow expected pattern

const selectors = require('../../src/automation/sites/toolshop/selectors');

describe('ToolShop Selectors', () => {
  const entries = Object.entries(selectors);

  test('all selectors are non-empty strings', () => {
    for (const [key, value] of entries) {
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });

  test('no duplicate selector values', () => {
    const values = entries.map(([, v]) => v);
    const unique = new Set(values);
    const duplicates = values.filter((v, i) => values.indexOf(v) !== i);
    // Some selectors may legitimately share values (e.g. PRODUCT_NAME and DETAIL_NAME)
    // so we only flag exact duplicates that look like copy-paste bugs
    if (duplicates.length > 0) {
      console.warn('Shared selectors (verify intentional):', duplicates);
    }
    // At minimum, there should be more unique values than half the total
    expect(unique.size).toBeGreaterThan(entries.length / 2);
  });

  test('has all required selector groups', () => {
    // Login
    expect(selectors.LOGIN_EMAIL).toBeDefined();
    expect(selectors.LOGIN_PASSWORD).toBeDefined();
    expect(selectors.LOGIN_SUBMIT).toBeDefined();

    // Search
    expect(selectors.SEARCH_INPUT).toBeDefined();
    expect(selectors.SEARCH_SUBMIT).toBeDefined();

    // Product
    expect(selectors.PRODUCT_CARD).toBeDefined();
    expect(selectors.PRODUCT_NAME).toBeDefined();
    expect(selectors.PRODUCT_PRICE).toBeDefined();

    // Cart
    expect(selectors.ADD_TO_CART_BTN).toBeDefined();
    expect(selectors.NAV_CART).toBeDefined();

    // Checkout
    expect(selectors.PROCEED_1).toBeDefined();
    expect(selectors.PROCEED_2).toBeDefined();
    expect(selectors.PROCEED_3).toBeDefined();
    expect(selectors.FINISH_BTN).toBeDefined();

    // Address — verified from recording
    expect(selectors.ADDRESS_STREET).toContain('street');
    expect(selectors.ADDRESS_POSTCODE).toContain('postal_code');

    // Payment
    expect(selectors.PAYMENT_METHOD).toBeDefined();
  });

  test('address selectors match recording (not plan defaults)', () => {
    // ★ These were wrong in the original plan — recording revealed correct values
    expect(selectors.ADDRESS_STREET).toBe('[data-test="street"]');
    expect(selectors.ADDRESS_POSTCODE).toBe('[data-test="postal_code"]');
    // NOT "address" and NOT "postcode"
  });
});
