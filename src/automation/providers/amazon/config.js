// src/automation/providers/amazon/config.js
// Amazon-specific configuration (TEMPLATE)

require('dotenv').config();

module.exports = {
  // Site credentials and URLs
  BASE_URL: process.env.AMAZON_BASE_URL || 'https://www.amazon.com',
  USERNAME: process.env.AMAZON_USERNAME || '',
  PASSWORD: process.env.AMAZON_PASSWORD || '',

  // Selectors - To be filled with actual Amazon selectors
  SELECTORS: {
    // Login page
    LOGIN_EMAIL: '#ap_email',
    LOGIN_PASSWORD: '#ap_password',
    LOGIN_BUTTON: '#signInSubmit',
    LOGIN_ERROR: '.auth-error-message-box',

    // Search
    SEARCH_INPUT: '#twotabsearchtextbox',
    SEARCH_BUTTON: '#nav-search-submit-button',

    // Product listing
    PRODUCT_ITEM: '[data-component-type="s-search-result"]',
    PRODUCT_TITLE: 'h2 a span',
    PRODUCT_PRICE: '.a-price .a-offscreen',
    PRODUCT_IMAGE: '.s-image',

    // Product detail
    ADD_TO_CART_BTN: '#add-to-cart-button',
    CART_CONFIRM: '#sw-atc-buy-box',

    // Cart
    CART_LINK: '#nav-cart',
    CART_ITEMS: '.sc-list-item',
    PROCEED_TO_CHECKOUT: 'input[name="proceedToRetailCheckout"]',

    // Checkout - To be filled based on actual Amazon checkout flow
    SHIPPING_ADDRESS: '#address-ui-widgets-enterAddressFullName',
    PAYMENT_METHOD: '#payment-method',
    PLACE_ORDER: 'input[name="placeYourOrder1"]',

    // Order confirmation
    ORDER_CONFIRMATION: '.a-alert-success',
  },
};
