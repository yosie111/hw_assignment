// src/automation/sites/amazon/selectors.js
// ★ Single source of truth for Amazon selectors

module.exports = {

  // Login/Sign-in
  
  // Login/Sign-in
  SIGN_IN_LINK:       '#nav-link-accountList',
  EMAIL_INPUT:        '#ap_email_login',                     // ← שונה
  CONTINUE_BUTTON:    'input[type=submit].a-button-input',   // ← שונה
  PASSWORD_INPUT:     '#ap_password',                        // ← מקורי, נשאר
  SIGN_IN_BUTTON:     '#signInSubmit',                       // ← מקורי, נשאר
  LOGIN_ERROR:        '#auth-error-message-box',
  
// Post-login interstitials
  SKIP_NOT_NOW:       'a:has-text("Not now"), button:has-text("Not now")',

  // Search
  SEARCH_INPUT:       '#twotabsearchtextbox',
  SEARCH_BUTTON:      '#nav-search-submit-button',
  SEARCH_RESULTS:     '[data-component-type="s-search-result"]',
  
  // Product listing
  PRODUCT_TITLE:      'h2 a.a-link-normal span',
  PRODUCT_PRICE:      '.a-price .a-offscreen',
  PRODUCT_LINK:       'h2 a.a-link-normal',
  PRODUCT_IMAGE:      '.s-image',
  
  // Product detail page
  ADD_TO_CART_BTN:    '#add-to-cart-button',
  ADD_TO_CART_ALT:    'input[name="submit.add-to-cart"]',
  CART_CONFIRM:       '#sw-atc-buy-box',
  PROCEED_TO_CHECKOUT: 'input[name="proceedToRetailCheckout"]',
  
  // Cart
  CART_LINK:          '#nav-cart',
  CART_COUNT:         '#nav-cart-count',
  CART_ITEMS:         '.sc-list-item',
  CHECKOUT_BUTTON:    'input[name="proceedToRetailCheckout"]',
  
  // Checkout
  ADDRESS_FORM:       '#address-ui-widgets-enterAddressFullName',
  SHIPPING_ADDRESS:   'input[name="address-ui-widgets-enterAddressFullName"]',
  SHIPPING_ADDRESS_LINE1: 'input[name="address-ui-widgets-enterAddressLine1"]',
  SHIPPING_CITY:      'input[name="address-ui-widgets-enterAddressCity"]',
  SHIPPING_STATE:     'input[name="address-ui-widgets-enterAddressStateOrRegion"]',
  SHIPPING_ZIP:       'input[name="address-ui-widgets-enterAddressPostalCode"]',
  USE_THIS_ADDRESS:   'input[name="address-ui-widgets-use-as-my-default"]',
  
  // Order summary
  ORDER_TOTAL:        '#order-summary .grand-total-price',
  PLACE_ORDER:        'input[name="placeYourOrder1"]',
  ORDER_CONFIRMATION: '.order-confirmation',
};
