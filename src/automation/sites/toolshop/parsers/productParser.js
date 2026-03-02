// src/automation/sites/toolshop/parsers/productParser.js
//
// Parse a single product card from the ToolShop catalog page.
// Returns a NormalizedProduct matching the SiteAdapter contract.

const { normalizePrice } = require('../../../utils/normalizePrice');

const BASE_URL = 'https://practicesoftwaretesting.com';

/**
 * Parse a single product card from the ToolShop catalog.
 *
 * ToolShop product cards have:
 *   - data-test="product-{ULID}" on the card wrapper (link)
 *   - data-test="product-name" for the title
 *   - data-test="product-price" for the price
 *   - img.card-img-top for the image
 *
 * @param {import('playwright').Locator} card - A single [data-test^="product-"] element
 * @param {number} index - Position in the list (for fallback ID)
 * @returns {Promise<NormalizedProduct>}
 */
async function parseProduct(card, index = 0) {
  // Title
  const titleEl = card.locator('[data-test="product-name"]');
  const title = (await titleEl.textContent()).trim();

  // Price — ToolShop displays "$XX.XX"
  const priceEl = card.locator('[data-test="product-price"]');
  const priceText = (await priceEl.textContent()).trim();
  const { price, currency } = normalizePrice(priceText);

  // Image URL
  let imageUrl = null;
  try {
    imageUrl = await card.locator('img.card-img-top').getAttribute('src');
    if (imageUrl && !imageUrl.startsWith('http')) {
      // Ensure slash between base URL and relative path
      const sep = imageUrl.startsWith('/') ? '' : '/';
      imageUrl = `${BASE_URL}${sep}${imageUrl}`;
    }
  } catch (_) { /* no image */ }

  // Product URL — the card itself is an <a> tag
  let productUrl = '';
  try {
    productUrl = await card.getAttribute('href') || '';
  } catch (_) { /* no link */ }

  // ID — from data-test attribute (e.g. "product-01KJN21VEDHPR8BY46715P27Q0")
  // or from the URL (/product/{id})
  let id = `toolshop-${index}`;
  try {
    const dataTest = await card.getAttribute('data-test');
    if (dataTest && dataTest.startsWith('product-')) {
      id = dataTest.replace('product-', '');
    }
  } catch (_) { /* use fallback */ }

  // Ensure productUrl is absolute
  if (productUrl && !productUrl.startsWith('http')) {
    const sep = productUrl.startsWith('/') ? '' : '/';
    productUrl = `${BASE_URL}${sep}${productUrl}`;
  }

  return {
    id,
    title,
    price,
    currency,
    productUrl,
    imageUrl,
    source: 'ToolShop',
  };
}

module.exports = { parseProduct };
