// src/automation/policies/selectProduct.js

/**
 * Select a product from a list based on a defined policy.
 *
 * Policies:
 *   CHEAPEST — returns the product with the lowest price
 *   FIRST    — returns the first product in the list
 *
 * @param {Array} products - List of normalized product objects
 * @param {string} [policy='CHEAPEST'] - Selection strategy
 * @returns {Object} The selected product
 * @throws {Error} If product list is empty or policy is unknown
 */
function selectProduct(products, policy = 'CHEAPEST') {
  if (!products || products.length === 0) {
    throw new Error('No products available for selection');
  }

  switch (policy) {
    case 'CHEAPEST':
      return [...products].sort((a, b) => a.price - b.price)[0];
    case 'FIRST':
      return products[0];
    default:
      throw new Error(`Unknown selection policy: ${policy}`);
  }
}

module.exports = { selectProduct };
