// src/domain/Product.js

/**
 * Product domain model.
 * Represents a product scraped from an e-commerce site.
 *
 * Fields follow assignment requirements:
 *   id       — Unique stable identifier (slug from DOM, NOT loop index) ★ G1
 *   title    — Product name
 *   price    — Normalized float (e.g. 29.99)
 *   currency — ISO code (e.g. "USD")
 *   url      — Full URL to product page (BASE_URL + href) ★ G2
 *   imageUrl — Product image URL (if available)
 *   source   — Origin site identifier (e.g. "saucedemo.com") ★ G3
 */

class Product {
  constructor({ id, title, price, currency, url, imageUrl, source }) {
    if (!id || typeof id !== 'string') {
      throw new Error('Product id is required and must be a non-empty string');
    }
    if (/^\d+$/.test(id)) {
      throw new Error('Product id must be a stable slug, not a numeric index');
    }
    if (!title || typeof title !== 'string') {
      throw new Error('Product title is required and must be a non-empty string');
    }
    if (typeof price !== 'number' || isNaN(price) || price < 0) {
      throw new Error('Product price must be a non-negative number');
    }
    if (!currency || typeof currency !== 'string') {
      throw new Error('Product currency is required');
    }
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      throw new Error('Product url must be a full URL starting with http');
    }
    if (!source || typeof source !== 'string') {
      throw new Error('Product source is required');
    }

    this.id = id;
    this.title = title;
    this.price = price;
    this.currency = currency;
    this.url = url;
    this.imageUrl = imageUrl || null;
    this.source = source;
  }

  /**
   * Factory method — creates a Product from a plain object.
   * @param {Object} data
   * @returns {Product}
   */
  static create(data) {
    return new Product(data);
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      price: this.price,
      currency: this.currency,
      url: this.url,
      imageUrl: this.imageUrl,
      source: this.source,
    };
  }
}

module.exports = { Product };
