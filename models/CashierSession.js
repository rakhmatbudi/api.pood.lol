const db = require('../config/db');

class CashierSession {
  /**
   * Get all cashier sessions with pagination
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Number of items per page (default: 10)
   * @returns {Promise} - Promise resolving to { rows, pagination }
   */
  static async getAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    // Query to get paginated results
    const result = await db.query(
      `SELECT cs.*, TO_CHAR(cs.opened_at, 'DD/MM/YYYY HH:MI') as cashier_time,  u.name as cashier_name 
       FROM cashier_sessions cs
       LEFT JOIN users u ON cs.user_id = u.id
       ORDER BY cs.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count for pagination metadata
    const countResult = await db.query('SELECT COUNT(*) FROM cashier_sessions');
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
   * Get a cashier session by ID
   * @param {number} id - Cashier session ID
   * @returns {Promise} - Promise resolving to the session or null
   */
  static async getById(id) {
    const result = await db.query(
      'SELECT * FROM cashier_sessions WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get current open session for a user
   * @param {number} userId - User ID
   * @returns {Promise} - Promise resolving to the session or null
   */
  static async getCurrentByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM cashier_sessions WHERE user_id = $1 AND closed_at IS NULL ORDER BY opened_at DESC LIMIT 1',
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }
  
  /**
   * Get current open session 
   * @returns {Promise} - Promise resolving to the session or null
   */
  static async getCurrentSession() {
    try {
        const result = await db.query(
          'SELECT u.id user_id, u."name" as cashier_name, cs.id session_id,  cs.opening_amount, cs.notes, cs.opened_at  FROM cashier_sessions cs inner join users u on u.id = cs.user_id WHERE closed_at IS NULL'
        );
    
        if (result.rows.length > 0) {
          return result.rows[0]; // Return the current session object
        } else {
          return null; // No active session found
        }
      } catch (error) {
        console.error('Error fetching current session:', error);
        return null; // Handle potential database errors
      }
  }

  /**
   * Open a new cashier session
   * @param {Object} sessionData - Session data
   * @param {number} sessionData.user_id - User ID
   * @param {number} sessionData.opening_amount - Opening cash amount
   * @param {string} [sessionData.notes] - Optional notes
   * @returns {Promise} - Promise resolving to the created session
   */
  static async open(sessionData) {
    const { user_id, opening_amount, notes } = sessionData;

    // Create new session
    const result = await db.query(
      `INSERT INTO cashier_sessions 
        (user_id, opening_amount, notes, opened_at) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [user_id, opening_amount, notes || null]
    );

    return result.rows[0];
  }

    /**
     * Close an existing cashier session
     * @param {number} id - Cashier session ID
     * @param {Object} closeData - Session closing data
     * @param {number} closeData.closing_amount - Closing cash amount
     * @param {number} [closeData.expected_amount] - Expected cash amount based on sales
     * @param {string} [closeData.notes] - Optional closing notes
     * @returns {Promise} - Promise resolving to the updated session
     */
    static async close(id, closeData) {
      const { closing_amount, expected_amount, notes } = closeData;
      
      // Debug output to verify values
      console.log('ID type:', typeof id, 'value:', id);
      console.log('closing_amount type:', typeof closing_amount, 'value:', closing_amount);
      console.log('expected_amount type:', typeof expected_amount, 'value:', expected_amount);
      console.log('notes type:', typeof notes, 'value:', notes);
      
      try {
        // Use a different approach with prepared statement
        const query = {
          text: `UPDATE cashier_sessions
                 SET closing_amount = $1::numeric,
                     expected_amount = $2::numeric,
                     difference = $2::numeric - $1::numeric,
                     notes = $3,
                     closed_at = CURRENT_TIMESTAMP,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4::integer
                 RETURNING *`,
          values: [closing_amount, expected_amount, notes, id]
        };
        
        console.log('Executing query:', query.text);
        console.log('With values:', query.values);
        
        const result = await db.query(query);
        
        if (result.rows.length === 0) {
          throw new Error('Cashier session not found or could not be updated');
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
   * Check if a user has an open session
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} - Promise resolving to true if user has open session
   */
  static async hasOpenSession(userId) {
    const result = await db.query(
      'SELECT COUNT(*) FROM cashier_sessions WHERE user_id = $1 AND closed_at IS NULL',
      [userId]
    );
    
    return parseInt(result.rows[0].count) > 0;
  }
}

module.exports = CashierSession;