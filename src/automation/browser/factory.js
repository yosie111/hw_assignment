'use strict';

const { setTimeout } = require('timers/promises');
const chromium = require('playwright').chromium;
const firefox = require('playwright').firefox;

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const VIEWPORT = { width: 1280, height: 720 };

async function launchBrowser(browserType) {
    let browser;
    if (browserType === 'chromium') {
        browser = await chromium.launch();
    } else if (browserType === 'firefox') {
        browser = await firefox.launch();
    }
    return browser;
}

async function createBrowserContext(browser, options = {}) {
    const contextOptions = {
        ...options,
        viewport: VIEWPORT,
        ignoreDefaultArgs: ['--disable-extensions'],
    };
    const context = await browser.newContext(contextOptions);
    return context;
}

module.exports = { launchBrowser, createBrowserContext };