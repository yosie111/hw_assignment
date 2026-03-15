// tests/tax/taxStrategies.test.js
//
// Tests the Strategy pattern classes directly (unit tests).
// The taxEngine integration tests (taxEngine.test.js) verify end-to-end behavior.

const {
  TaxStrategy,
  FlatTaxStrategy,
  ThresholdTaxStrategy,
  createStrategy,
} = require('../../src/tax/taxStrategies');

describe('TaxStrategy (Strategy Pattern)', () => {

  // ═══ Base class is abstract ═══
  describe('TaxStrategy (abstract base)', () => {
    test('cannot be instantiated directly', () => {
      expect(() => new TaxStrategy({})).toThrow('abstract');
    });
  });

  // ═══ FlatTaxStrategy ═══
  describe('FlatTaxStrategy', () => {
    test('returns constant rate regardless of subtotal', () => {
      const strategy = new FlatTaxStrategy({ rate: 0.08, label: 'US 8%' });

      expect(strategy.calculate(10)).toEqual({ rate: 0.08, ruleSuffix: 'FLAT' });
      expect(strategy.calculate(999)).toEqual({ rate: 0.08, ruleSuffix: 'FLAT' });
      expect(strategy.calculate(0)).toEqual({ rate: 0.08, ruleSuffix: 'FLAT' });
    });

    test('exposes label from config', () => {
      const strategy = new FlatTaxStrategy({ rate: 0.20, label: 'UK VAT (20%)' });
      expect(strategy.label).toBe('UK VAT (20%)');
    });

    test('zero rate for DEFAULT policy', () => {
      const strategy = new FlatTaxStrategy({ rate: 0, label: 'No Tax' });
      expect(strategy.calculate(100)).toEqual({ rate: 0, ruleSuffix: 'FLAT' });
    });
  });

  // ═══ ThresholdTaxStrategy ═══
  describe('ThresholdTaxStrategy', () => {
    const strategy = new ThresholdTaxStrategy({
      threshold: 150,
      belowRate: 0,
      aboveRate: 0.18,
      label: 'Israel VAT (18%)',
    });

    test('below threshold → belowRate', () => {
      expect(strategy.calculate(100)).toEqual({ rate: 0, ruleSuffix: 'BELOW_THRESHOLD' });
    });

    test('at threshold → belowRate (<=)', () => {
      expect(strategy.calculate(150)).toEqual({ rate: 0, ruleSuffix: 'BELOW_THRESHOLD' });
    });

    test('above threshold → aboveRate', () => {
      expect(strategy.calculate(151)).toEqual({ rate: 0.18, ruleSuffix: 'ABOVE_THRESHOLD' });
    });

    test('exposes threshold value', () => {
      expect(strategy.threshold).toBe(150);
    });

    test('exposes label from config', () => {
      expect(strategy.label).toBe('Israel VAT (18%)');
    });
  });

  // ═══ createStrategy factory ═══
  describe('createStrategy()', () => {
    test('FLAT type → FlatTaxStrategy', () => {
      const strategy = createStrategy({ type: 'FLAT', rate: 0.08, label: 'test' });
      expect(strategy).toBeInstanceOf(FlatTaxStrategy);
    });

    test('THRESHOLD type → ThresholdTaxStrategy', () => {
      const strategy = createStrategy({
        type: 'THRESHOLD', threshold: 100, belowRate: 0, aboveRate: 0.1, label: 'test',
      });
      expect(strategy).toBeInstanceOf(ThresholdTaxStrategy);
    });

    test('unknown type → throws', () => {
      expect(() => createStrategy({ type: 'PROGRESSIVE', label: 'test' }))
        .toThrow('Unknown tax policy type');
    });
  });
});
