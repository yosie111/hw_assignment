// src/tax/taxEngine.js
//
// TaxEngine — resolves applicable tax rate.
//
// Architecture:
//   geoResolver(ip) → country code
//   taxPolicies[country] → rule (FLAT / THRESHOLD)
//   resolve() → { taxRate, taxAmount, rule, label, ... }
//
// Design:
//   - Domestic purchase (buyer === seller) → seller country policy
//   - Import purchase   (buyer !== seller) → buyer country policy (import tax)
//   - Unknown country → DEFAULT policy (0%)
//
// The engine does NOT calculate the cart. It only decides the rate.
// CartCalculator does the actual math.

const policies = require('./taxPolicies');
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

  // Step 2: Pick policy
  //   The Oracle must match the SITE's tax behavior.
  //   Saucedemo (and most e-commerce sites) apply SELLER-side tax
  //   regardless of where the buyer is located.
  //   → Always use the seller's policy.
  const isDomestic = buyer === seller;
  const policyKey = isDomestic ? seller : buyer;
  const policy = policies[policyKey] || policies.DEFAULT;

  // Step 3: Calculate rate based on policy type
  let taxRate;
  let ruleSuffix;

  if (policy.type === 'THRESHOLD') {
    if (subtotal <= policy.threshold) {
      taxRate = policy.belowRate;
      ruleSuffix = 'BELOW_THRESHOLD';
    } else {
      taxRate = policy.aboveRate;
      ruleSuffix = 'ABOVE_THRESHOLD';
    }
  } else {
    // FLAT
    taxRate = policy.rate;
    ruleSuffix = 'FLAT';
  }

  // Step 4: Calculate tax amount (IEEE 754 safe)
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;

  // Step 5: Build rule name
  const tradeType = isDomestic ? 'DOMESTIC' : 'IMPORT';
  const rule = `${policyKey}_${tradeType}_${ruleSuffix}`;

  return Object.freeze({
    taxRate,
    taxAmount,
    rule,
    label: policy.label,
    buyerCountry: buyer,
    sellerCountry: seller,
    threshold: policy.threshold || null,
  });
}

module.exports = { resolve };
