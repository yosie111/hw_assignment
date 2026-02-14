// src/automation/sites/saucedemo/selectors.js
// ★ Single source of truth — site changes? Fix ONLY here.

module.exports = {
  // Login
  LOGIN_USERNAME:     '[data-test="username"]',
  LOGIN_PASSWORD:     '[data-test="password"]',
  LOGIN_BUTTON:       '[data-test="login-button"]',
  LOGIN_ERROR:        '[data-test="error"]',

  // Inventory / Catalog
  PRODUCT_SORT:       '[data-test="product-sort-container"]',
  INVENTORY_LIST:     '[data-test="inventory-list"]',
  INVENTORY_ITEM:     '[data-test="inventory-item"]',
  ITEM_NAME:          '[data-test="inventory-item-name"]',
  ITEM_PRICE:         '[data-test="inventory-item-price"]',
  ITEM_DESC:          '[data-test="inventory-item-desc"]',
  ITEM_IMAGE:         'img.inventory_item_img',
  ADD_TO_CART_BTN:    'button[data-test^="add-to-cart"]',

  // Cart
  CART_BADGE:         '[data-test="shopping-cart-badge"]',
  CART_LINK:          '[data-test="shopping-cart-link"]',
  CART_ITEM:          '[data-test="inventory-item"]',
  CHECKOUT_BUTTON:    '[data-test="checkout"]',

  // Checkout - Step 1 (Your Information)
  FIRST_NAME:         '[data-test="firstName"]',
  LAST_NAME:          '[data-test="lastName"]',
  POSTAL_CODE:        '[data-test="postalCode"]',
  CONTINUE_BUTTON:    '[data-test="continue"]',

  // Checkout - Step 2 (Overview)
  SUMMARY_SUBTOTAL:   '[data-test="subtotal-label"]',
  SUMMARY_TAX:        '[data-test="tax-label"]',
  SUMMARY_TOTAL:      '[data-test="total-label"]',
  FINISH_BUTTON:      '[data-test="finish"]',

  // Checkout - Complete
  COMPLETE_HEADER:    '[data-test="complete-header"]',
};
