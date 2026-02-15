// src/automation/sites/amazon/parsers/productParser.js

const { normalizePrice } = require('../../../utils/normalizePrice');

/**
 * Parse a single product element from Amazon search results
 * Extracts: id, title, price, currency, productUrl, source, imageUrl
 *
 * @param {import('playwright').Locator} itemLocator - Locator for a search result item
 * @returns {Promise<Object>} Normalized product object
 */
async function parseProduct(itemLocator) {
  try {
    // Title
    const titleElement = itemLocator.locator('h2 a span');
    const name = await titleElement.first().textContent().catch(() => '');
    
    if (!name || name.trim() === '') {
      throw new Error('No title found');
    }

    // Price + Currency
    let price = 0;
    let currency = 'USD';
    try {
      const priceElement = itemLocator.locator('.a-price .a-offscreen').first();
      const priceText = await priceElement.textContent();
      const parsed = normalizePrice(priceText);
      price = parsed.price;
      currency = parsed.currency;
    } catch (error) {
      // Some products may not have visible prices
      console.log(`Could not parse price for product: ${name.substring(0, 30)}`);
    }

    // Product URL
    let productUrl = '';
    try {
      const linkElement = itemLocator.locator('h2 a').first();
      const href = await linkElement.getAttribute('href');
      productUrl = href ? `https://www.amazon.com${href}` : '';
    } catch (error) {
      console.log(`Could not get product URL for: ${name.substring(0, 30)}`);
    }

    // Image URL
    let imageUrl = null;
    try {
      const imgElement = itemLocator.locator('.s-image').first();
      imageUrl = await imgElement.getAttribute('src');
    } catch (error) {
      // Image not critical
    }

    // Generate stable ID from ASIN if available, otherwise from title
    let id = `amazon-${name.trim().toLowerCase().replace(/\s+/g, '-').substring(0, 50)}`;
    try {
      const dataAsin = await itemLocator.getAttribute('data-asin');
      if (dataAsin) {
        id = `amazon-${dataAsin}`;
      }
    } catch (error) {
      // Fallback to title-based ID
    }

    return {
      id,
      title: name.trim(),
      price,
      currency,
      productUrl,
      imageUrl,
      source: 'Amazon',
    };
  } catch (error) {
    throw new Error(`Failed to parse product: ${error.message}`);
  }
}

module.exports = { parseProduct };
