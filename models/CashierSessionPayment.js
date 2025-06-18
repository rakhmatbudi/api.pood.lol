const db = require('../config/db'); // Import your PostgreSQL connection pool

class CashierSessionPayment {
  /**
   * Represents the CashierSessionPayment model.
   * This class provides methods for interacting with the cashier_session_payments table in the database.
   */

  /**
   * Creates a new CashierSessionPayment record for a specific tenant.
   * @param {Object} paymentData - The payment data.
   * @param {number} paymentData.cashier_session_id - The ID of the cashier session.
   * @param {number} paymentData.payment_mode_id - The ID of the payment mode.
   * @param {number} paymentData.expected_amount - The expected amount.
   * @param {number} paymentData.actual_amount - The actual amount.
   * @param {string} [paymentData.notes] - Optional notes.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<Object>} - A promise resolving to the newly created payment record.
   */
  static async create(paymentData, tenantId) {
    const { cashier_session_id, payment_mode_id, expected_amount, actual_amount, notes } = paymentData;
    const query = `
      INSERT INTO cashier_session_payments (cashier_session_id, payment_mode_id, expected_amount, actual_amount, notes, created_at, updated_at, tenant_id)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)
      RETURNING *
    `;
    const values = [cashier_session_id, payment_mode_id, expected_amount, actual_amount, notes, tenantId];
    try {
      const client = await db.connect(); // Get a client from the pool
      try {
        const { rows } = await client.query(query, values);
        return rows[0]; // Return the created payment record
      } finally {
        client.release(); // Return the client to the pool
      }
    } catch (error) {
      console.error('Error creating CashierSessionPayment:', error);
      throw error; // Re-throw the error for the caller to handle
    }
  }

  /**
   * Retrieves a CashierSessionPayment record by its ID and tenant.
   * @param {number} id - The ID of the CashierSessionPayment record to retrieve.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<Object | null>} - A promise resolving to the retrieved record, or null if not found.
   */
  static async getById(id, tenantId) {
    const query = `
        SELECT *
        FROM cashier_session_payments
        WHERE id = $1 AND tenant_id = $2
    `;
    const values = [id, tenantId];
    try {
      const client = await db.connect();
      try {
        const { rows } = await client.query(query, values);
        return rows[0] || null; // Return the first row or null if no rows
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error retrieving CashierSessionPayment by ID:', error);
      throw error;
    }
  }

  /**
   * Retrieves all CashierSessionPayment records associated with a given cashier session ID and tenant.
   * @param {number} sessionId - The ID of the cashier session.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<Array<Object>>} - A promise resolving to an array of payment records.
   */
  static async getBySessionId(sessionId, tenantId) {
    const query = `
        SELECT csp.*, pm.description as payment_mode
        FROM cashier_session_payments csp
        JOIN payment_modes pm ON csp.payment_mode_id = pm.id
        WHERE csp.cashier_session_id = $1 AND csp.tenant_id = $2
    `;
    const values = [sessionId, tenantId];
    try {
      const client = await db.connect();
      try {
        const { rows } = await client.query(query, values);
        return rows;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error retrieving payments by session ID:', error);
      throw error;
    }
  }

  // Add other static methods as needed (e.g., for updating, deleting, etc.)
  // Remember to include tenantId in all future methods as well!
}

// Export the entire class
module.exports = CashierSessionPayment;