// src/automation/providers/saucedemo/flows/login-flow.js

const { LoginPage } = require('../pages/login-page');

/**
 * Login flow for Saucedemo
 * 
 * @param {import('playwright').Page} page
 * @param {Object} credentials - { username, password, baseUrl }
 * @throws {Error} If login fails
 */
async function login(page, { username, password, baseUrl }) {
  const loginPage = new LoginPage(page);

  await loginPage.goto(baseUrl);
  await loginPage.fillUsername(username);
  await loginPage.fillPassword(password);
  await loginPage.clickLogin();

  const result = await loginPage.waitForResult();

  if (result === 'error') {
    const errorText = await loginPage.getErrorMessage();
    throw new Error(`Login failed: ${errorText}`);
  }
}

module.exports = { login };
