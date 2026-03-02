// client/src/api/client.js
//
// Centralized HTTP client — single point of contact with backend.
// proxy in package.json handles dev forwarding to :3000.
// In production, Express serves React from same port → '/api' works directly.

import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30s — automation takes time
  headers: { 'Content-Type': 'application/json' },
});

// ─── Error Interceptor ───
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 400) throw new ValidationError(data.details || []);
      if (status === 404) throw new NotFoundError(data.error);
      if (status >= 500) throw new ServerError(data.error);
    } else if (error.request) {
      throw new NetworkError('Cannot connect to server. Is the backend running?');
    }
    throw error;
  }
);

// ─── Error Classes ───

export class ValidationError extends Error {
  constructor(details) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(msg) {
    super(msg || 'Not found');
    this.name = 'NotFoundError';
  }
}

export class ServerError extends Error {
  constructor(msg) {
    super(msg || 'Server error');
    this.name = 'ServerError';
  }
}

export class NetworkError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'NetworkError';
  }
}

// ─── API Functions ───

/**
 * POST /api/search
 * @param {{ site?: string, query?: string, filters?: { maxPrice?: number } }} params
 * @returns {Promise<{ requestId: string, products: Array }>}
 */
export const searchProducts = async ({ site = 'saucedemo', query = '', filters = {} } = {}) => {
  const response = await apiClient.post('/search', { site, query, filters });
  return response.data;
};

/**
 * POST /api/purchase (Fire-and-Forget → 202)
 * @param {{ site?: string, product: Object, shipping: Object }} params
 * @returns {Promise<{ requestId: string, message: string, statusUrl: string }>}
 */
export const purchaseProduct = async ({ site = 'saucedemo', product, shipping }) => {
  const response = await apiClient.post('/purchase', { site, product, shipping });
  return response.data;
};

/**
 * GET /api/status/:requestId (Polling)
 * @param {string} requestId
 * @returns {Promise<Object>} status entry from statusStore
 */
export const getStatus = async (requestId) => {
  const response = await apiClient.get(`/status/${requestId}`);
  return response.data;
};

export default apiClient;
