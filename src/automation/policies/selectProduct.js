// src/automation/policies/selectProduct.js
//
// ★ DEPRECATED — re-exports from src/domain/selectProduct.js for backward compatibility.
//   selectProduct is pure domain logic and now lives in the domain layer.
//   New code should import from '../../domain/selectProduct' instead.

const { selectProduct } = require('../../domain/selectProduct');

module.exports = { selectProduct };
