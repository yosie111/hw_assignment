// src/domain/Cart.js

/**
 * Cart — Aggregate Root managing product collection integrity.
 *
 * ★ Design decisions (per research doc):
 *   - Aggregate Root: guards business invariants (no duplicates)
 *   - Immutable Style: spread operator for add, filter for remove
 *   - getItems() returns a COPY — external code can't mutate internal state
 *   - Domain-level validation (not UI-level)
 *
 * @returns {Cart} Cart instance with add/remove/clear/getItems/getCount/isEmpty
 */
function createCart() {
  let items = [];

  return {
    /**
     * Add a product to the cart.
     * ★ Business rule: duplicate IDs are rejected (Aggregate Root pattern)
     * @param {Product} product - Frozen Product object from createProduct()
     * @throws {Error} If product is invalid or already in cart
     */
    addItem(product) {
      if (!product || !product.id) {
        throw new Error('Cannot add invalid product to cart');
      }
      if (items.find(item => item.id === product.id)) {
        throw new Error(`Product "${product.id}" already in cart`);
      }
      // ★ Immutable style — new array, not push()
      items = [...items, product];
    },

    /**
     * Remove a product by id.
     * ★ Uses filter (immutable) instead of splice (mutating)
     */
    removeItem(productId) {
      items = items.filter(item => item.id !== productId);
    },

    /** Clear all items */
    clear() {
      items = [];
    },

    /**
     * Get all items.
     * ★ Returns a COPY — external code cannot mutate internal state
     */
    getItems() {
      return [...items];
    },

    /** Get number of items */
    getCount() {
      return items.length;
    },

    /** Check if empty */
    isEmpty() {
      return items.length === 0;
    },
  };
}

module.exports = { createCart };
