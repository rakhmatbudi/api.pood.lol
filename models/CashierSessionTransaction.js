const db = require('../config/db');

class CashierSessionTransaction {
    /**
     * Create a new cashier session transaction for a specific tenant
     * @param {object} transactionData - Data for the transaction
     * @param {number} transactionData.cashier_session_id - The ID of the cashier session
     * @param {string} transactionData.type - Type of transaction ('deposit' or 'withdrawal')
     * @param {number} transactionData.amount - The amount of the transaction
     * @param {string} [transactionData.description] - Optional description for the transaction
     * @param {string} transactionData.tenant - The ID of the tenant
     * @returns {Promise<object>} - Promise resolving to the created transaction
     */
    static async create(transactionData) {
        const { cashier_session_id, type, amount, description, tenant } = transactionData;
        const result = await db.query(
            `INSERT INTO cashier_session_transaction (cashier_session_id, type, amount, description, created_at, tenant)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
             RETURNING *`,
            [cashier_session_id, type, amount, description || null, tenant]
        );
        return result.rows[0];
    }

    /**
     * Get transactions for a specific cashier session within a tenant
     * @param {number} cashierSessionId - The ID of the cashier session
     * @param {string} tenant - The ID of the tenant
     * @returns {Promise<Array>} - Promise resolving to an array of transactions
     */
    static async getBySessionId(cashierSessionId, tenant) {
        const result = await db.query(
            `SELECT * FROM cashier_session_transaction
             WHERE cashier_session_id = $1 AND tenant = $2
             ORDER BY created_at DESC`,
            [cashierSessionId, tenant]
        );
        return result.rows;
    }
}

module.exports = CashierSessionTransaction;