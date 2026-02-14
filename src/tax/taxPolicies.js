// src/tax/taxPolicies.js
//
// Tax rules per country — data only, no logic.
//
// Policy types:
//   FLAT      → fixed rate regardless of amount
//   THRESHOLD → different rates above/below a dollar threshold
//
// Operator can add countries by adding entries here.
// No code changes needed anywhere else.

module.exports = {
  US: {
    type: 'FLAT',
    rate: 0.08,
    label: 'US Sales Tax (8%)',
  },

  IL: {
    type: 'THRESHOLD',
    threshold: 150,
    belowRate: 0,
    aboveRate: 0.18,
    label: 'Israel VAT (18%)',
  },

  GB: {
    type: 'FLAT',
    rate: 0.20,
    label: 'UK VAT (20%)',
  },

  DE: {
    type: 'FLAT',
    rate: 0.19,
    label: 'Germany VAT (19%)',
  },

  DEFAULT: {
    type: 'FLAT',
    rate: 0,
    label: 'No Tax',
  },
};
