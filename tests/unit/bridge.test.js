// tests/unit/bridge.test.js
//
// Tests the Bridge pattern: SiteAdapter (Abstraction) delegates to
// SiteFlows (Implementor) without knowing the concrete implementation.

const { SiteFlows, SauceDemoFlows, ToolShopFlows } = require('../../src/automation/adapters/SiteFlows');

describe('Bridge Pattern — SiteFlows (Implementor)', () => {

  // ═══ Abstract base ═══
  describe('SiteFlows (abstract base)', () => {
    test('cannot be instantiated directly', () => {
      expect(() => new SiteFlows({})).toThrow('abstract');
    });

    test('concrete subclass must implement siteName', () => {
      class IncompleteFlows extends SiteFlows {}
      const flows = new IncompleteFlows({});
      expect(() => flows.siteName).toThrow('must be implemented');
    });

    test('concrete subclass must implement login', async () => {
      class IncompleteFlows extends SiteFlows {
        get siteName() { return 'test'; }
      }
      const flows = new IncompleteFlows({});
      await expect(flows.login({})).rejects.toThrow('not implemented');
    });

    test('concrete subclass must implement search', async () => {
      class IncompleteFlows extends SiteFlows {
        get siteName() { return 'test'; }
      }
      const flows = new IncompleteFlows({});
      await expect(flows.search({}, {})).rejects.toThrow('not implemented');
    });

    test('navigateToCatalog has a no-op default', async () => {
      class MinimalFlows extends SiteFlows {
        get siteName() { return 'test'; }
      }
      const flows = new MinimalFlows({});
      // Should not throw — default is no-op
      await expect(flows.navigateToCatalog({})).resolves.toBeUndefined();
    });
  });

  // ═══ SauceDemoFlows ═══
  describe('SauceDemoFlows', () => {
    test('siteName is "saucedemo"', () => {
      const flows = new SauceDemoFlows({ baseUrl: 'x', username: 'y', password: 'z' });
      expect(flows.siteName).toBe('saucedemo');
    });

    test('stores config passed via constructor', () => {
      const cfg = { baseUrl: 'https://saucedemo.com', username: 'u', password: 'p' };
      const flows = new SauceDemoFlows(cfg);
      expect(flows._config).toEqual(cfg);
    });

    test('login, search, addToCart, checkout are functions', () => {
      const flows = new SauceDemoFlows({});
      expect(typeof flows.login).toBe('function');
      expect(typeof flows.search).toBe('function');
      expect(typeof flows.addToCart).toBe('function');
      expect(typeof flows.checkout).toBe('function');
      expect(typeof flows.navigateToCatalog).toBe('function');
    });
  });

  // ═══ ToolShopFlows ═══
  describe('ToolShopFlows', () => {
    test('siteName is "toolshop"', () => {
      const flows = new ToolShopFlows({ baseUrl: 'x', email: 'y', password: 'z' });
      expect(flows.siteName).toBe('toolshop');
    });

    test('stores config passed via constructor', () => {
      const cfg = { baseUrl: 'https://toolshop.com', email: 'e', password: 'p', apiUrl: 'a' };
      const flows = new ToolShopFlows(cfg);
      expect(flows._config).toEqual(cfg);
    });
  });

  // ═══ Bridge independence — adapter works with ANY SiteFlows ═══
  describe('Bridge independence', () => {
    test('SauceDemoAdapter accepts injected flows', () => {
      // Create a mock SiteFlows
      class MockFlows extends SiteFlows {
        get siteName() { return 'mock'; }
        async login() {}
        async search() { return [{ id: 'mock-1', title: 'Mock', price: 1 }]; }
        async addToCart() { return { itemCount: 1, screenshots: [] }; }
        async checkout() { return { status: 'completed' }; }
      }

      const { SauceDemoAdapter } = require('../../src/automation/adapters/SauceDemoAdapter');
      const adapter = new SauceDemoAdapter(new MockFlows({}));

      // Adapter stores the injected implementor
      expect(adapter._flows).toBeInstanceOf(MockFlows);
      expect(adapter._flows.siteName).toBe('mock');
    });

    test('SauceDemoAdapter creates default flows when none injected', () => {
      const { SauceDemoAdapter } = require('../../src/automation/adapters/SauceDemoAdapter');
      const adapter = new SauceDemoAdapter();

      expect(adapter._flows).toBeInstanceOf(SauceDemoFlows);
    });

    test('ToolShopAdapter creates default flows when none injected', () => {
      const { ToolShopAdapter } = require('../../src/automation/adapters/ToolShopAdapter');
      const adapter = new ToolShopAdapter();

      expect(adapter._flows).toBeInstanceOf(ToolShopFlows);
    });
  });
});
