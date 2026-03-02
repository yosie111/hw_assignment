// src/automation/sites/toolshop/selectors.js
//
// ★ Single source of truth for ToolShop selectors.
// ★ Verified against Playwright recording — do NOT guess selectors.
// ★ Site changes? Fix ONLY here.

module.exports = {
  // === Login ===
  LOGIN_EMAIL:        '[data-test="email"]',
  LOGIN_PASSWORD:     '[data-test="password"]',
  LOGIN_SUBMIT:       '[data-test="login-submit"]',
  LOGIN_ERROR:        '.alert-danger',

  // === Navigation ===
  NAV_HOME:           '[data-test="nav-home"]',
  NAV_SIGN_IN:        '[data-test="nav-sign-in"]',
  NAV_CART:           '[data-test="nav-cart"]',
  NAV_USER_MENU:      '[data-test="nav-menu"]',          // appears after login
  CART_QUANTITY:       '[data-test="cart-quantity"]',      // badge on cart icon

  // === Search & Catalog ===
  SEARCH_INPUT:       '[data-test="search-query"]',
  SEARCH_SUBMIT:      '[data-test="search-submit"]',
  SEARCH_RESET:       '[data-test="search-reset"]',
  SORT_SELECT:        '[data-test="sort"]',

  // === Product Cards (catalog page) ===
  // Note: individual products have dynamic IDs like [data-test="product-01KJN21V..."]
  // ★ MUST use "a" tag — otherwise also matches product-name/product-price inside cards!
  //   Without "a": 9 cards + 9 names + 9 prices = 27 matches → timeout on 10+
  PRODUCT_CARD:       'a[data-test^="product-"]',
  PRODUCT_NAME:       '[data-test="product-name"]',
  PRODUCT_PRICE:      '[data-test="product-price"]',
  PRODUCT_IMAGE:      'img.card-img-top',

  // === Product Detail Page ===
  DETAIL_NAME:        '[data-test="product-name"]',
  DETAIL_PRICE:       '[data-test="unit-price"]',
  ADD_TO_CART_BTN:    '[data-test="add-to-cart"]',
  ADDED_TOAST:        '.toast-body',                      // "Product added to cart"

  // === Filters (sidebar) ===
  ECO_FRIENDLY:       '[data-test="eco-friendly-filter"]',
  // Brands/categories use dynamic IDs: [data-test="brand-01KJN..."], [data-test="category-01KJN..."]

  // === Cart (/checkout) ===
  CART_TABLE:         '.table',
  CART_ITEM_ROW:      'tbody tr',
  CART_TOTAL:         '[data-test="cart-total"]',              // ★ Verified from screenshot
  CONTINUE_SHOPPING:  '[data-test="continue-shopping"]',
  PROCEED_1:          '[data-test="proceed-1"]',

  // === Checkout Step 2 — Billing/Shipping Address ===
  PROCEED_2:          '[data-test="proceed-2"]',
  ADDRESS_STREET:     '[data-test="street"]',              // ★ NOT "address"!
  ADDRESS_CITY:       '[data-test="city"]',
  ADDRESS_STATE:      '[data-test="state"]',
  ADDRESS_COUNTRY:    '[data-test="country"]',
  ADDRESS_POSTCODE:   '[data-test="postal_code"]',         // ★ NOT "postcode"!

  // === Checkout Step 3 — Payment ===
  PROCEED_3:          '[data-test="proceed-3"]',
  PAYMENT_METHOD:     '[data-test="payment-method"]',
  // Credit Card fields
  CC_NUMBER:          '[data-test="credit_card_number"]',
  CC_EXPIRATION:      '[data-test="expiration_date"]',
  CC_CVV:             '[data-test="cvv"]',
  CC_HOLDER_NAME:     '[data-test="card_holder_name"]',
  // Buy Now Pay Later fields
  BNPL_INSTALLMENTS:  '[data-test="monthly_installments"]',
  // Bank Transfer fields
  BANK_NAME:          '[data-test="bank_name"]',
  BANK_ACCOUNT:       '[data-test="account_number"]',

  // === Checkout Step 4 — Confirm & Finish ===
  FINISH_BTN:         '[data-test="finish"]',

  // === Order Confirmation ===
  CONFIRM_MESSAGE:    '#order-confirmation',
  ORDER_SUCCESS:      '.help-block',                       // success message after order
};
