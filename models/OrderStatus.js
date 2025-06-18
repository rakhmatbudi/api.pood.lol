// models/OrderStatus.js
const db = require('../config/db');

class OrderStatus {
    /**
     * Finds all global order statuses.
     * @returns {Promise<Array>} A promise that resolves to an array of order status objects.
     */
    static async findAll() {
        const query = 'SELECT id, name, description FROM order_status ORDER BY id';
        const { rows } = await db.query(query);
        return rows;
    }

    /**
     * Finds an order status by its ID.
     * @param {number|string} id - The ID of the order status.
     * @returns {Promise<Object|undefined>} A promise that resolves to the order status object or undefined if not found.
     */
    static async findById(id) {
        const query = 'SELECT id, name, description FROM order_status WHERE id = $1';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    /**
     * Creates a new global order status.
     * @param {Object} data - The data for the new order status.
     * @param {string} data.name - The name of the order status.
     * @param {string} [data.description] - The description of the order status.
     * @returns {Promise<Object>} A promise that resolves to the newly created order status object.
     */
    static async create({ name, description }) {
        const query = `
            INSERT INTO order_status (name, description)
            VALUES ($1, $2)
            RETURNING id, name, description
        `;
        const { rows } = await db.query(query, [name, description]);
        return rows[0];
    }

    /**
     * Updates an existing global order status.
     * @param {number|string} id - The ID of the order status to update.
     * @param {Object} data - The data to update.
     * @param {string} [data.name] - The new name for the order status.
     * @param {string} [data.description] - The new description for the order status.
     * @returns {Promise<Object|undefined>} A promise that resolves to the updated order status object or undefined if not found.
     */
    static async update(id, { name, description }) {
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex}`);
            values.push(name);
            paramIndex++;
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex}`);
            values.push(description);
            paramIndex++;
        }

        if (updates.length === 0) {
            return null; // No fields to update
        }

        values.push(id); // Add ID for WHERE clause
        const query = `
            UPDATE order_status
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, name, description
        `;
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Deletes a global order status.
     * @param {number|string} id - The ID of the order status to delete.
     * @returns {Promise<Object|undefined>} A promise that resolves to the deleted order status object or undefined if not found.
     */
    static async delete(id) {
        const query = 'DELETE FROM order_status WHERE id = $1 RETURNING id, name, description';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }
}

module.exports = OrderStatus;