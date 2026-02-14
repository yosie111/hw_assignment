// src/tax/geoResolver.js
//
// Resolves IP address → country code.
//
// Current: stub implementation with configurable defaults.
// Future:  plug in geoip-lite, MaxMind, or external API.
//
// Defaults (via .env or hardcoded):
//   Buyer  → IL (Israel)
//   Seller → US (Saucedemo is US-based)

/**
 * Resolve buyer country from IP address.
 *
 * @param {string} ip - Client IP (from req.ip)
 * @returns {string} ISO 3166-1 alpha-2 country code (e.g. 'IL', 'US')
 */
function resolveBuyerCountry(ip) {
  // TODO: integrate geoip-lite or MaxMind for real IP lookup
  //   const geo = geoip.lookup(ip);
  //   return geo?.country || getDefault();

  return process.env.DEFAULT_BUYER_COUNTRY || 'IL';
}

/**
 * Resolve seller country from site URL or config.
 *
 * @param {string} [siteUrl] - The e-commerce site URL
 * @returns {string} ISO 3166-1 alpha-2 country code
 */
function resolveSellerCountry(siteUrl) {
  // Saucedemo is US-based. Future: lookup per site.
  return process.env.DEFAULT_SELLER_COUNTRY || 'US';
}

module.exports = { resolveBuyerCountry, resolveSellerCountry };
