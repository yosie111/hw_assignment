// src/domain/OrderResult.js

/**
 * OrderResult domain model.
 * Represents the outcome of a purchase automation flow.
 */

const VALID_STATUSES = ['completed', 'failed'];

class OrderResult {
  constructor({ status, lastStep, requestId, screenshotPath, error, cartVerification }) {
    if (!status || !VALID_STATUSES.includes(status)) {
      throw new Error(`OrderResult status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    if (!requestId || typeof requestId !== 'string') {
      throw new Error('OrderResult requestId is required');
    }

    this.status = status;
    this.lastStep = lastStep || null;
    this.requestId = requestId;
    this.screenshotPath = screenshotPath || null;
    this.error = error || null;
    this.cartVerification = cartVerification || null; // ★ G4
  }

  /**
   * Factory method.
   * @param {Object} data
   * @returns {OrderResult}
   */
  static create(data) {
    return new OrderResult(data);
  }

  get isSuccess() {
    return this.status === 'completed';
  }

  toJSON() {
    const json = {
      status: this.status,
      lastStep: this.lastStep,
      requestId: this.requestId,
      screenshotPath: this.screenshotPath,
    };
    if (this.error) json.error = this.error;
    if (this.cartVerification) json.cartVerification = this.cartVerification;
    return json;
  }
}

module.exports = { OrderResult };
