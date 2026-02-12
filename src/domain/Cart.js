// src/domain/Cart.js

/**
 * Cart domain model.
 * Holds a list of products and provides total calculation.
 */

class Cart {
  constructor() {
    this.items = [];
  }

  /**
   * Add a product to the cart.
   * @param {Object} product — must have { title, price }
   */
  addItem(product) {
    if (!product || typeof product.price !== 'number') {
      throw new Error('Cannot add item: product must have a numeric price');
    }
    this.items.push(product);
  }

  /**
   * Get the subtotal (sum of all item prices).
   * @returns {number}
   */
  getTotal() {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }

  /**
   * Get the number of items in the cart.
   * @returns {number}
   */
  get count() {
    return this.items.length;
  }

  /**
   * Clear all items from the cart.
   */
  clear() {
    this.items = [];
  }

  toJSON() {
    return {
      items: this.items.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
      })),
      count: this.count,
      total: this.getTotal(),
    };
  }
}

module.exports = { Cart };
