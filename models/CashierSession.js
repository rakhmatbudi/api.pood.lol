// models/CashierSession.js

const db = require('../config/db');

class CashierSession {
    /**
     * Get all cashier sessions for a specific tenant with pagination
     * @param {string} tenantId - The ID of the tenant.
     * @param {number} page - Page number (default: 1)
     * @param {number} limit - Number of items per page (default: 10)
     * @returns {Promise} - Promise resolving to { rows, pagination }
     */
    static async getAll(tenantId, page = 1, limit = 10) { // Added tenantId
        const offset = (page - 1) * limit;

        // Query to get paginated results for the specific tenant
        const result = await db.query(
            `SELECT cs.*, TO_CHAR(cs.opened_at, 'DD/MM/YYYY HH:MI') as cashier_time, u.name as cashier_name
             FROM cashier_sessions cs
             LEFT JOIN users u ON cs.user_id = u.id AND u.tenant_id = $3 -- Ensure users also belong to the tenant
             WHERE cs.tenant_id = $3 -- Filter sessions by tenant_id
             ORDER BY cs.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset, tenantId] // Pass tenantId as a parameter
        );

        // Get total count for pagination metadata for the specific tenant
        const countResult = await db.query(
            'SELECT COUNT(*) FROM cashier_sessions WHERE tenant_id = $1',
            [tenantId] // Filter count by tenant_id
        );
        const totalCount = parseInt(countResult.rows[0].count);

        return {
            rows: result.rows,
            pagination: {
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                limit
            }
        };
    }

    /**
     * Get a cashier session by ID for a specific tenant
     * @param {number} id - Cashier session ID
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise} - Promise resolving to the session or null
     */
    static async getById(id, tenantId) { // Added tenantId
        const result = await db.query(
            'SELECT * FROM cashier_sessions WHERE id = $1 AND tenant_id = $2', // Filter by tenant_id
            [id, tenantId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Get current open session for a user within a specific tenant
     * @param {number} userId - User ID
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise} - Promise resolving to the session or null
     */
    static async getCurrentByUserId(userId, tenantId) { // Added tenantId
        const result = await db.query(
            'SELECT * FROM cashier_sessions WHERE user_id = $1 AND closed_at IS NULL AND tenant_id = $2 ORDER BY opened_at DESC LIMIT 1', // Filter by tenant_id
            [userId, tenantId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Get current open session for the active tenant
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise} - Promise resolving to the session or null
     */
    static async getCurrentSession(tenantId) { // Added tenantId
        try {
            const result = await db.query(
                `SELECT u.id user_id, u.name as cashier_name, cs.id session_id,
                        cs.opening_amount, cs.notes, cs.opened_at
                 FROM cashier_sessions cs
                 INNER JOIN users u ON u.id = cs.user_id AND u.tenant_id = $1 -- Join with users filtered by tenant_id
                 WHERE cs.closed_at IS NULL AND cs.tenant_id = $1`, // Filter cashier_sessions by tenant_id
                [tenantId]
            );

            if (result.rows.length > 0) {
                return result.rows[0];
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error fetching current session:', error);
            return null;
        }
    }

    /**
     * Open a new cashier session for a specific tenant
     * @param {Object} sessionData - Session data
     * @param {number} sessionData.user_id - User ID
     * @param {number} sessionData.opening_amount - Opening cash amount
     * @param {string} [sessionData.notes] - Optional notes
     * @param {string} sessionData.tenant_id - Tenant ID (added to sessionData)
     * @returns {Promise} - Promise resolving to the created session
     */
    static async open(sessionData) {
        const { user_id, opening_amount, notes, tenant_id } = sessionData; // Destructure tenant_id

        // Create new session, including tenant_id
        const result = await db.query(
            `INSERT INTO cashier_sessions
             (user_id, opening_amount, notes, opened_at, tenant_id) -- Added tenant_id column
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4) -- Added $4 for tenant_id
             RETURNING *`,
            [user_id, opening_amount, notes || null, tenant_id] // Pass tenant_id
        );

        return result.rows[0];
    }

    /**
     * Close an existing cashier session for a specific tenant
     * @param {number} id - Cashier session ID
     * @param {Object} closeData - Session closing data
     * @param {number} closeData.closing_amount - Closing cash amount
     * @param {number} [closeData.expected_amount] - Expected cash amount based on sales
     * @param {string} [closeData.notes] - Optional closing notes
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise} - Promise resolving to the updated session
     */
    static async close(id, closeData, tenantId) { // Added tenantId
        const { closing_amount, expected_amount, notes } = closeData;

        try {
            const query = {
                text: `UPDATE cashier_sessions
                       SET closing_amount = $1::numeric,
                           expected_amount = $2::numeric,
                           difference = $2::numeric - $1::numeric,
                           notes = $3,
                           closed_at = CURRENT_TIMESTAMP,
                           updated_at = CURRENT_TIMESTAMP
                       WHERE id = $4::integer AND tenant_id = $5 -- Filter by tenant_id
                       RETURNING *`,
                values: [closing_amount, expected_amount, notes, id, tenantId] // Pass tenantId
            };

            const result = await db.query(query);

            if (result.rows.length === 0) {
                // It's possible the session wasn't found for THIS tenant, or not found at all.
                // For multi-tenancy, be clear it wasn't found within the tenant's scope.
                throw new Error('Cashier session not found for this tenant or could not be updated');
            }

            return result.rows[0];
        } catch (error) {
            console.error('PostgreSQL Error Code:', error.code);
            console.error('PostgreSQL Error Detail:', error.detail);
            console.error('PostgreSQL Error Constraint:', error.constraint);
            console.error('PostgreSQL Error Column:', error.column);
            throw error;
        }
    }

    /**
     * Check if a user has an open session within a specific tenant
     * @param {number} userId - User ID
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<boolean>} - Promise resolving to true if user has open session
     */
    static async hasOpenSession(userId, tenantId) { // Added tenantId
        const result = await db.query(
            'SELECT COUNT(*) FROM cashier_sessions WHERE user_id = $1 AND closed_at IS NULL AND tenant_id = $2', // Filter by tenant_id
            [userId, tenantId]
        );

        return parseInt(result.rows[0].count) > 0;
    }
}

module.exports = CashierSession;