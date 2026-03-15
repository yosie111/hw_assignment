// tests/unit/abstractFactory.test.js
//
// Tests the Abstract Factory pattern — each concrete factory
// produces a consistent family of site-specific objects.

const {
  SiteAbstractFactory,
  SauceDemoFactory,
  ToolShopFactory,
  getFactory,
  getAvailableSites,
} = require('../../src/automation/adapters/abstractFactory');

describe('Abstract Factory Pattern', () => {

  // ═══ Base class is abstract ═══
  describe('SiteAbstractFactory (abstract base)', () => {
    // We need a concrete subclass to instantiate
    class TestFactory extends SiteAbstractFactory {}

    test('siteName throws if not overridden', () => {
      const f = new TestFactory();
      expect(() => f.siteName).toThrow('must be implemented');
    });

    test('createAdapter throws if not overridden', () => {
      const f = new TestFactory();
      expect(() => f.createAdapter()).toThrow('must be implemented');
    });

    test('createFlows throws if not overridden', () => {
      const f = new TestFactory();
      expect(() => f.createFlows()).toThrow('must be implemented');
    });

    test('getSiteConfig throws if not overridden', () => {
      const f = new TestFactory();
      expect(() => f.getSiteConfig()).toThrow('must be implemented');
    });
  });

  // ═══ SauceDemoFactory ═══
  describe('SauceDemoFactory', () => {
    const factory = new SauceDemoFactory();

    test('siteName is "saucedemo"', () => {
      expect(factory.siteName).toBe('saucedemo');
    });

    test('createAdapter returns SauceDemoAdapter', () => {
      const adapter = factory.createAdapter();
      expect(adapter.name).toBe('saucedemo');
    });

    test('createFlows returns all four flow functions', () => {
      const flows = factory.createFlows();
      expect(typeof flows.login).toBe('function');
      expect(typeof flows.search).toBe('function');
      expect(typeof flows.addToCart).toBe('function');
      expect(typeof flows.checkout).toBe('function');
    });

    test('getSiteConfig returns saucedemo credentials', () => {
      const config = factory.getSiteConfig();
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('username');
      expect(config).toHaveProperty('password');
      expect(config.baseUrl).toContain('saucedemo');
    });

    test('family consistency — adapter name matches factory siteName', () => {
      const adapter = factory.createAdapter();
      expect(adapter.name).toBe(factory.siteName);
    });
  });

  // ═══ ToolShopFactory ═══
  describe('ToolShopFactory', () => {
    const factory = new ToolShopFactory();

    test('siteName is "toolshop"', () => {
      expect(factory.siteName).toBe('toolshop');
    });

    test('createAdapter returns ToolShopAdapter', () => {
      const adapter = factory.createAdapter();
      expect(adapter.name).toBe('toolshop');
    });

    test('createFlows returns all four flow functions', () => {
      const flows = factory.createFlows();
      expect(typeof flows.login).toBe('function');
      expect(typeof flows.search).toBe('function');
      expect(typeof flows.addToCart).toBe('function');
      expect(typeof flows.checkout).toBe('function');
    });

    test('getSiteConfig returns toolshop credentials', () => {
      const config = factory.getSiteConfig();
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('email');
      expect(config).toHaveProperty('password');
      expect(config.baseUrl).toContain('practicesoftwaretesting');
    });
  });

  // ═══ getFactory() registry ═══
  describe('getFactory()', () => {
    test('returns SauceDemoFactory for "saucedemo"', () => {
      const factory = getFactory('saucedemo');
      expect(factory).toBeInstanceOf(SauceDemoFactory);
    });

    test('returns ToolShopFactory for "toolshop"', () => {
      const factory = getFactory('toolshop');
      expect(factory).toBeInstanceOf(ToolShopFactory);
    });

    test('throws for unknown site', () => {
      expect(() => getFactory('nonexistent')).toThrow('Unknown site');
    });
  });

  // ═══ getAvailableSites() ═══
  describe('getAvailableSites()', () => {
    test('returns all registered site names', () => {
      const sites = getAvailableSites();
      expect(sites).toContain('saucedemo');
      expect(sites).toContain('toolshop');
      expect(sites).toContain('amazon');
    });
  });
});
