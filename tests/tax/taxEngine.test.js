// tests/tax/taxEngine.test.js

// Mock geoResolver so tests don't depend on env vars
jest.mock('../../src/tax/geoResolver', () => ({
  resolveBuyerCountry: jest.fn(() => 'IL'),
  resolveSellerCountry: jest.fn(() => 'US'),
}));

const { resolve } = require('../../src/tax/taxEngine');
const { resolveBuyerCountry, resolveSellerCountry } = require('../../src/tax/geoResolver');

describe('TaxEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveBuyerCountry.mockReturnValue('IL');
    resolveSellerCountry.mockReturnValue('US');
  });

  // ═══════════════════════════════════════
  // Buyer-side tax: import uses buyer's policy
  // ═══════════════════════════════════════
  describe('buyer-side tax (import uses buyer policy)', () => {
    test('IL buyer + US seller → IL threshold (below 150 → 0%)', () => {
      const result = resolve({ buyerCountry: 'IL', sellerCountry: 'US', subtotal: 29.99 });

      expect(result.taxRate).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.rule).toBe('IL_IMPORT_BELOW_THRESHOLD');
      expect(result.label).toBe('Israel VAT (18%)');
      expect(result.buyerCountry).toBe('IL');
      expect(result.sellerCountry).toBe('US');
    });

    test('unknown buyer + US seller → DEFAULT 0%', () => {
      const result = resolve({ buyerCountry: 'XX', sellerCountry: 'US', subtotal: 50 });

      expect(result.taxRate).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.rule).toBe('XX_IMPORT_FLAT');
      expect(result.label).toBe('No Tax');
    });

    test('GB buyer + US seller → GB 20%', () => {
      const result = resolve({ buyerCountry: 'GB', sellerCountry: 'US', subtotal: 50 });

      expect(result.taxRate).toBe(0.20);
      expect(result.taxAmount).toBe(10);
      expect(result.rule).toBe('GB_IMPORT_FLAT');
      expect(result.label).toBe('UK VAT (20%)');
    });
  });

  // ═══════════════════════════════════════
  // US DOMESTIC — FLAT 8%
  // ═══════════════════════════════════════
  describe('US domestic (FLAT 8%)', () => {
    test('$29.99 → rate=0.08, tax=$2.40', () => {
      const result = resolve({ buyerCountry: 'US', sellerCountry: 'US', subtotal: 29.99 });

      expect(result.taxRate).toBe(0.08);
      expect(result.taxAmount).toBe(2.40);
      expect(result.rule).toBe('US_DOMESTIC_FLAT');
      expect(result.label).toBe('US Sales Tax (8%)');
      expect(result.buyerCountry).toBe('US');
      expect(result.sellerCountry).toBe('US');
    });

    test('$7.99 → tax=$0.64', () => {
      const result = resolve({ buyerCountry: 'US', sellerCountry: 'US', subtotal: 7.99 });

      expect(result.taxRate).toBe(0.08);
      expect(result.taxAmount).toBe(0.64);
    });

    test('$0.01 (tiny) → tax=$0.00 (rounds to zero)', () => {
      const result = resolve({ buyerCountry: 'US', sellerCountry: 'US', subtotal: 0.01 });

      expect(result.taxRate).toBe(0.08);
      expect(result.taxAmount).toBe(0);
    });

    test('$9999.99 (large) → tax=$800.00', () => {
      const result = resolve({ buyerCountry: 'US', sellerCountry: 'US', subtotal: 9999.99 });

      expect(result.taxRate).toBe(0.08);
      expect(result.taxAmount).toBe(800.00);
    });
  });

  // ═══════════════════════════════════════
  // Defaults — geoResolver returns IL/US
  // ═══════════════════════════════════════
  describe('defaults (geoResolver)', () => {
    test('null countries → uses geoResolver defaults (IL/US)', () => {
      const result = resolve({ subtotal: 50 });

      expect(resolveBuyerCountry).toHaveBeenCalled();
      expect(resolveSellerCountry).toHaveBeenCalled();
      expect(result.buyerCountry).toBe('IL');
      expect(result.sellerCountry).toBe('US');
    });

    test('no params at all → IL buyer policy (below threshold → 0%)', () => {
      const result = resolve();

      expect(result.taxRate).toBe(0);
      expect(result.taxAmount).toBe(0);
    });
  });

  // ═══════════════════════════════════════
  // Non-US seller scenarios
  // ═══════════════════════════════════════
  describe('non-US seller', () => {
    test('US buyer + GB seller → US 8%', () => {
      const result = resolve({ buyerCountry: 'US', sellerCountry: 'GB', subtotal: 50 });

      expect(result.taxRate).toBe(0.08);
      expect(result.taxAmount).toBe(4);
      expect(result.rule).toBe('US_IMPORT_FLAT');
      expect(result.label).toBe('US Sales Tax (8%)');
    });

    test('IL buyer + DE seller → IL threshold (below 150 → 0%)', () => {
      const result = resolve({ buyerCountry: 'IL', sellerCountry: 'DE', subtotal: 100 });

      expect(result.taxRate).toBe(0);
      expect(result.taxAmount).toBe(0);
      expect(result.rule).toBe('IL_IMPORT_BELOW_THRESHOLD');
      expect(result.label).toBe('Israel VAT (18%)');
    });

    test('unknown seller + US buyer → US 8%', () => {
      const result = resolve({ buyerCountry: 'US', sellerCountry: 'XX', subtotal: 50 });

      expect(result.taxRate).toBe(0.08);
      expect(result.taxAmount).toBe(4);
      expect(result.rule).toBe('US_IMPORT_FLAT');
      expect(result.label).toBe('US Sales Tax (8%)');
    });
  });

  // ═══════════════════════════════════════
  // RESULT OBJECT
  // ═══════════════════════════════════════
  describe('result object', () => {
    test('is frozen (immutable)', () => {
      const result = resolve({ buyerCountry: 'US', sellerCountry: 'US', subtotal: 10 });

      result.taxRate = 0.99;
      expect(result.taxRate).toBe(0.08); // assignment silently ignored
    });

    test('contains all required fields', () => {
      const result = resolve({ buyerCountry: 'US', sellerCountry: 'US', subtotal: 10 });

      expect(result).toHaveProperty('taxRate');
      expect(result).toHaveProperty('taxAmount');
      expect(result).toHaveProperty('rule');
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('buyerCountry');
      expect(result).toHaveProperty('sellerCountry');
      expect(result).toHaveProperty('threshold');
    });
  });
});
