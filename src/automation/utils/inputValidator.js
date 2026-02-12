// src/automation/utils/inputValidator.js

/**
 * Basic input validation BEFORE opening a browser.
 * Saves time and resources by failing fast on bad input.
 * Note: Full validation (zod) happens in Services/API layer.
 */

function validateSearchInput({ query, filters }) {
  if (query !== undefined && typeof query !== 'string') {
    throw new Error('query must be a string');
  }

  if (filters?.maxPrice !== undefined) {
    const p = Number(filters.maxPrice);
    if (isNaN(p) || p < 0) {
      throw new Error('maxPrice must be a non-negative number');
    }
  }
}

function validatePurchaseInput({ productTitle, shipping }) {
  if (!productTitle || typeof productTitle !== 'string') {
    throw new Error('productTitle is required');
  }

  if (!shipping) {
    throw new Error('shipping details are required');
  }

  const required = ['firstName', 'lastName', 'postalCode'];
  for (const field of required) {
    if (!shipping[field] || typeof shipping[field] !== 'string') {
      throw new Error(`shipping.${field} is required and must be a string`);
    }
  }
}

module.exports = { validateSearchInput, validatePurchaseInput };
