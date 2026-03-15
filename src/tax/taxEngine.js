// src/tax/taxEngine.js
//
// TaxEngine — Context in the Strategy pattern.
//
// Chapter 12 mapping:
//   Context  = this module (resolve function)
//   Strategy = TaxStrategy (base class in taxStrategies.js)
//
// The engine selects a strategy based on buyer/seller countries,
// then delegates the actual rate calculation to the strategy.
// It never knows HOW the rate is computed — only that it can
// call strategy.calculate(subtotal) and get back { rate, ruleSuffix }.
//
// Design:
//   geoResolver(ip) → country code
//   taxPolicies[country] → raw policy config
//   createStrategy(policy) → TaxStrategy instance
//   strategy.calculate(subtotal) → { rate, ruleSuffix }

const policies = require('./taxPolicies');
const { createStrategy } = require('./taxStrategies');
const { resolveBuyerCountry, resolveSellerCountry } = require('./geoResolver');

/**
 * Resolve tax parameters for a transaction.
 *
 * @param {Object} params
 * @param {string}  [params.buyerIp]        - Client IP (for geo lookup)
 * @param {string}  [params.buyerCountry]    - Override: direct country code
 * @param {string}  [params.sellerCountry]   - Override: seller country code
 * @param {number}   params.subtotal         - Pre-tax amount in USD
 * @returns {Object} { taxRate, taxAmount, rule, label, buyerCountry, sellerCountry }
 */
function resolve({
  buyerIp = null,
  buyerCountry = null,
  sellerCountry = null,
  subtotal = 0,
} = {}) {
  // Step 1: Determine countries
  const buyer = buyerCountry || resolveBuyerCountry(buyerIp);
  const seller = sellerCountry || resolveSellerCountry();

  // Step 2: Select the policy key
  const isDomestic = buyer === seller;
  const policyKey = isDomestic ? seller : buyer;
  const policyConfig = policies[policyKey] || policies.DEFAULT;

  // Step 3: ★ Strategy Pattern — create strategy from policy config
  const strategy = createStrategy(policyConfig);

  // Step 4: Delegate rate calculation to the strategy
  const { rate: taxRate, ruleSuffix } = strategy.calculate(subtotal);

  // Step 5: Calculate tax amount (IEEE 754 safe)
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;

  // Step 6: Build rule name
  const tradeType = isDomestic ? 'DOMESTIC' : 'IMPORT';
  const rule = `${policyKey}_${tradeType}_${ruleSuffix}`;

  return Object.freeze({
    taxRate,
    taxAmount,
    rule,
    label: strategy.label,
    buyerCountry: buyer,
    sellerCountry: seller,
    threshold: strategy.threshold || null,
  });
}

module.exports = { resolve };
