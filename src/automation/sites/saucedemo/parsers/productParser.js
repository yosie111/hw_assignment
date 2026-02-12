// src/automation/sites/saucedemo/parsers/productParser.js

const { normalizePrice } = require('../../../utils/normalizePrice');

const BASE_URL = 'https://www.saucedemo.com';

/**
 * Parse a single product element from the Saucedemo inventory DOM.
 * Extracts: id, title, price, currency, productUrl, source, imageUrl
 *
 * ★ ID: Extracted from the add-to-cart button's data-test attribute
 *   e.g. data-test="add-to-cart-sauce-labs-backpack" → id: "sauce-labs-backpack"
 *   This is stable (doesn't change with sort order), unlike a loop index.
 *
 * @param {import('playwright').Locator} itemLocator - Locator for a single inventory-item
 * @returns {Promise<Object>} Normalized product object
 */
async function parseProduct(itemLocator) {
  // Title
  const name = await itemLocator.locator('[data-test="inventory-item-name"]').textContent();

  // Price + Currency
  const priceText = await itemLocator.locator('[data-test="inventory-item-price"]').textContent();
  const { price, currency } = normalizePrice(priceText);

  // ★ Stable ID from add-to-cart button's data-test attribute
  // "add-to-cart-sauce-labs-backpack" → "sauce-labs-backpack"
  let id = null;
  try {
    const addBtn = itemLocator.locator('button[data-test^="add-to-cart"]');
    const dataTest = await addBtn.getAttribute('data-test');
    id = dataTest ? dataTest.replace('add-to-cart-', '') : null;
  } catch (_) { /* fallback below */ }

  // ★ Product URL from the title link's href
  let productUrl = '';
  try {
    const href = await itemLocator.locator('[data-test="inventory-item-name"]').getAttribute('href');
    productUrl = href ? `${BASE_URL}${href}` : '';
  } catch (_) { /* no link available */ }

  // Image URL
  let imageUrl = null;
  try {
    imageUrl = await itemLocator.locator('img.inventory_item_img').getAttribute('src');
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${BASE_URL}${imageUrl}`;
    }
  } catch (_) { /* image not available */ }

  return {
    id: id || `saucedemo-${name.trim().toLowerCase().replace(/\s+/g, '-')}`,
    title: name.trim(),
    price,
    currency,
    productUrl,
    imageUrl,
    source: 'Saucedemo',
  };
}

module.exports = { parseProduct };
