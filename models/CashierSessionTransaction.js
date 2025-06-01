// models/CashierSessionTransaction.js

const db = require('../config/db');

class CashierSessionTransaction {
    /**
     * Create a new cashier session transaction
     * @param {object} transactionData - Data for the transaction
     * @param {number} transactionData.cashier_session_id - The ID of the cashier session
     * @param {string} transactionData.type - Type of transaction ('deposit' or 'withdrawal')
     * @param {number} transactionData.amount - The amount of the transaction
     * @param {string} [transactionData.description] - Optional description for the transaction
     * @returns {Promise<object>} - Promise resolving to the created transaction
     */
    static async create(transactionData) {
        const { cashier_session_id, type, amount, description } = transactionData;
        const result = await db.query(
            `INSERT INTO cashier_session_transaction
             (cashier_session_id, type, amount, description, created_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
             RETURNING *`,
            [cashier_session_id, type, amount, description || null]
        );
        return result.rows[0];
    }

    /**
     * Get transactions for a specific cashier session
     * @param {number} cashierSessionId - The ID of the cashier session
     * @returns {Promise<Array>} - Promise resolving to an array of transactions
     */
    static async getBySessionId(cashierSessionId) {
        const result = await db.query(
            `SELECT * FROM cashier_session_transaction
             WHERE cashier_session_id = $1
             ORDER BY created_at DESC`,
            [cashierSessionId]
        );
        return result.rows;
    }
}

module.exports = CashierSessionTransaction;