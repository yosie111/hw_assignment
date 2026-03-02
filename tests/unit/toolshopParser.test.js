// tests/unit/toolshopParser.test.js
//
// Tests product parser WITHOUT a browser — uses mock locators.
// Validates:
//   ✓ parseProduct returns correct NormalizedProduct shape
//   ✓ price is a number (not string)
//   ✓ currency extracted from "$" prefix
//   ✓ source is 'ToolShop'
//   ✓ ID extracted from data-test attribute

const { parseProduct } = require('../../src/automation/sites/toolshop/parsers/productParser');

// Helper: create a mock Playwright locator that returns canned values
function createMockCard({ title, price, imageSrc, href, dataTest }) {
  const locators = {};

  const mockLocator = (selector) => {
    // Return a sub-locator for nested elements
    return {
      textContent: async () => {
        if (selector.includes('product-name')) return title;
        if (selector.includes('product-price')) return price;
        return '';
      },
      getAttribute: async (attr) => {
        if (attr === 'src') return imageSrc || null;
        if (attr === 'href') return href || null;
        return null;
      },
      first: () => ({
        getAttribute: async (attr) => {
          if (attr === 'href') return href || null;
          return null;
        },
      }),
    };
  };

  return {
    locator: mockLocator,
    getAttribute: async (attr) => {
      if (attr === 'data-test') return dataTest || null;
      if (attr === 'href') return href || null;
      return null;
    },
  };
}

describe('ToolShop Product Parser', () => {
  test('parses a standard product card', async () => {
    const card = createMockCard({
      title: 'Combination Pliers',
      price: '$14.15',
      imageSrc: '/assets/img/products/pliers01.jpg',
      href: '/product/01KJN21VEDHPR8BY46715P27Q0',
      dataTest: 'product-01KJN21VEDHPR8BY46715P27Q0',
    });

    const product = await parseProduct(card, 0);

    expect(product.title).toBe('Combination Pliers');
    expect(product.price).toBe(14.15);
    expect(typeof product.price).toBe('number');
    expect(product.currency).toBe('USD');
    expect(product.source).toBe('ToolShop');
    expect(product.id).toBe('01KJN21VEDHPR8BY46715P27Q0');
    expect(product.productUrl).toContain('https://');
    expect(product.imageUrl).toContain('https://');
  });

  test('parses price with euro sign', async () => {
    const card = createMockCard({
      title: 'Hammer',
      price: '€9.99',
      dataTest: 'product-abc123',
    });

    const product = await parseProduct(card, 1);
    expect(product.price).toBe(9.99);
    expect(product.currency).toBe('EUR');
  });

  test('ID falls back to index when data-test missing', async () => {
    const card = createMockCard({
      title: 'Wrench',
      price: '$5.00',
      dataTest: null,
    });

    const product = await parseProduct(card, 7);
    expect(product.id).toBe('toolshop-7');
  });

  test('source is always ToolShop', async () => {
    const card = createMockCard({
      title: 'Screwdriver',
      price: '$3.50',
      dataTest: 'product-xyz',
    });

    const product = await parseProduct(card, 0);
    expect(product.source).toBe('ToolShop');
  });

  test('handles missing image gracefully', async () => {
    const card = createMockCard({
      title: 'Bolt Cutters',
      price: '$48.63',
      imageSrc: null,
      dataTest: 'product-qwe789',
    });

    const product = await parseProduct(card, 0);
    expect(product.title).toBe('Bolt Cutters');
    expect(product.price).toBe(48.63);
    // imageUrl should be null, not crash
  });

  test('returns all required NormalizedProduct fields', async () => {
    const card = createMockCard({
      title: 'Test Product',
      price: '$1.00',
      dataTest: 'product-test1',
    });

    const product = await parseProduct(card, 0);

    // Verify shape matches SiteAdapter contract
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('title');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('currency');
    expect(product).toHaveProperty('productUrl');
    expect(product).toHaveProperty('imageUrl');
    expect(product).toHaveProperty('source');
  });
});
