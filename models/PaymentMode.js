// models/PaymentMode.js
const db = require('../config/db');

class PaymentMode {
  /**
   * Retrieves all payment modes for a specific tenant.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<Array<Object>>} - A promise resolving to an array of payment mode records.
   */
  static async findAll(tenantId) {
    const query = 'SELECT * FROM payment_modes WHERE tenant_id = $1 ORDER BY id';
    const { rows } = await db.query(query, [tenantId]);
    return rows;
  }

  /**
   * Retrieves a specific payment mode by its ID for a specific tenant.
   * @param {number} id - The ID of the payment mode to retrieve.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<Object | null>} - A promise resolving to the retrieved payment mode record, or null if not found.
   */
  static async findById(id, tenantId) {
    const query = 'SELECT * FROM payment_modes WHERE id = $1 AND tenant_id = $2';
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0] || null;
  }

  /**
   * Creates a new payment mode record for a specific tenant.
   * @param {Object} paymentModeData - The payment mode data.
   * @param {number} paymentModeData.payment_mode_type_id - The ID of the payment mode type.
   * @param {string} paymentModeData.description - The description of the payment mode.
   * @param {boolean} [paymentModeData.is_active=true] - Whether the payment mode is active.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<Object>} - A promise resolving to the newly created payment mode record.
   */
  static async create(paymentModeData, tenantId) {
    const { payment_mode_type_id, description, is_active = true } = paymentModeData;
    const query = `
      INSERT INTO payment_modes (payment_mode_type_id, description, is_active, tenant_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [payment_mode_type_id, description, is_active, tenantId];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  /**
   * Updates an existing payment mode record for a specific tenant.
   * @param {number} id - The ID of the payment mode to update.
   * @param {Object} paymentModeData - The updated payment mode data.
   * @param {number} paymentModeData.payment_mode_type_id - The ID of the payment mode type.
   * @param {string} paymentModeData.description - The description of the payment mode.
   * @param {boolean} paymentModeData.is_active - Whether the payment mode is active.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<Object | null>} - A promise resolving to the updated payment mode record, or null if not found.
   */
  static async update(id, paymentModeData, tenantId) {
    const { payment_mode_type_id, description, is_active } = paymentModeData;
    const query = `
      UPDATE payment_modes
      SET payment_mode_type_id = $1, description = $2, is_active = $3, updated_at = DEFAULT
      WHERE id = $4 AND tenant_id = $5
      RETURNING *
    `;
    const values = [payment_mode_type_id, description, is_active, id, tenantId];
    const { rows } = await db.query(query, values);
    return rows[0] || null;
  }

  /**
   * Deletes a payment mode record for a specific tenant.
   * @param {number} id - The ID of the payment mode to delete.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<Object | null>} - A promise resolving to the deleted payment mode record, or null if not found.
   */
  static async delete(id, tenantId) {
    const query = 'DELETE FROM payment_modes WHERE id = $1 AND tenant_id = $2 RETURNING *';
    const { rows } = await db.query(query, [id, tenantId]);
    return rows[0] || null;
  }
}

module.exports = PaymentMode;