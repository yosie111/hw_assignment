// src/domain/Product.js

/**
 * Factory Function for creating a validated, immutable Product object.
 *
 * ★ Design decisions (per research doc):
 *   - Factory Function (not Class) → POJO, JSON-serializable, no methods
 *   - Object.freeze → immutable, prevents accidental mutation
 *   - Fail Fast → throws immediately on invalid input
 *   - title.trim() → normalizes whitespace from DOM scraping
 *   - price validated as non-negative Number → prevents NaN in calculations
 *
 * @param {Object} data - Raw product data (from parser or API)
 * @returns {Readonly<Product>} Frozen, validated product object
 * @throws {Error} If required fields are missing or invalid
 */
function createProduct({ id, title, price, currency, productUrl, imageUrl, source }) {
  // ★ Fail Fast — validate at creation, not downstream
  if (!id || typeof id !== 'string') {
    throw new Error('Product id is required and must be a string');
  }
  if (!title || typeof title !== 'string') {
    throw new Error('Product title is required and must be a string');
  }
  if (typeof price !== 'number' || isNaN(price) || price < 0) {
    throw new Error('Product price must be a non-negative number');
  }

  // ★ Object.freeze — immutable POJO (cannot change price after creation)
  return Object.freeze({
    id,
    title: title.trim(),
    price,
    currency: currency || 'USD',
    productUrl: productUrl || '',
    imageUrl: imageUrl || null,
    source: source || 'unknown',
  });
}

module.exports = { createProduct };
