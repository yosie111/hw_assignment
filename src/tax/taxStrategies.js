// src/tax/taxStrategies.js
//
// Strategy Pattern — encapsulates each tax-calculation algorithm
// behind a common interface.
//
// Chapter 12 mapping:
//   Context     = TaxEngine (resolve function)
//   Strategy    = TaxStrategy (base class — the interface)
//   ConcreteA   = FlatTaxStrategy (fixed rate)
//   ConcreteB   = ThresholdTaxStrategy (rate depends on subtotal)
//
// Why Strategy here:
//   The original taxEngine had an if/else chain checking policy.type.
//   Every new tax rule type (tiered, progressive, exempt-category)
//   required touching that function. With Strategy, each rule type
//   is a self-contained class — adding a new type means adding one
//   class + one entry in taxPolicies.js. Zero changes to taxEngine.

/**
 * Base Strategy — defines the interface every tax strategy must follow.
 * @abstract
 */
class TaxStrategy {
  /**
   * @param {Object} config - policy configuration from taxPolicies.js
   */
  constructor(config) {
    if (new.target === TaxStrategy) {
      throw new Error('TaxStrategy is abstract — use a concrete strategy');
    }
    this._config = config;
  }

  /** Human-readable label (e.g. "US Sales Tax (8%)") */
  get label() {
    return this._config.label || 'Tax';
  }

  /**
   * Compute the tax rate for a given subtotal.
   * @param {number} subtotal — pre-tax amount
   * @returns {{ rate: number, ruleSuffix: string }}
   * @abstract
   */
  calculate(subtotal) {
    throw new Error('TaxStrategy.calculate() must be implemented');
  }
}

/**
 * Flat strategy — single rate regardless of amount.
 * Used by: US (8%), GB (20%), DE (19%), DEFAULT (0%).
 */
class FlatTaxStrategy extends TaxStrategy {
  /** @param {{ rate: number, label: string }} config */
  constructor(config) {
    super(config);
    this._rate = config.rate;
  }

  calculate(_subtotal) {
    return { rate: this._rate, ruleSuffix: 'FLAT' };
  }
}

/**
 * Threshold strategy — different rates above/below a dollar threshold.
 * Used by: IL (0% below $150, 18% above $150).
 */
class ThresholdTaxStrategy extends TaxStrategy {
  /** @param {{ threshold: number, belowRate: number, aboveRate: number, label: string }} config */
  constructor(config) {
    super(config);
    this._threshold = config.threshold;
    this._belowRate = config.belowRate;
    this._aboveRate = config.aboveRate;
  }

  get threshold() {
    return this._threshold;
  }

  calculate(subtotal) {
    if (subtotal <= this._threshold) {
      return { rate: this._belowRate, ruleSuffix: 'BELOW_THRESHOLD' };
    }
    return { rate: this._aboveRate, ruleSuffix: 'ABOVE_THRESHOLD' };
  }
}

/**
 * Factory helper: create the right strategy from a raw policy object.
 * Used by taxEngine to resolve country → strategy.
 *
 * @param {Object} policy — raw policy from taxPolicies.js
 * @returns {TaxStrategy}
 */
function createStrategy(policy) {
  switch (policy.type) {
    case 'FLAT':
      return new FlatTaxStrategy(policy);
    case 'THRESHOLD':
      return new ThresholdTaxStrategy(policy);
    default:
      throw new Error(`Unknown tax policy type: "${policy.type}"`);
  }
}

module.exports = {
  TaxStrategy,
  FlatTaxStrategy,
  ThresholdTaxStrategy,
  createStrategy,
};
