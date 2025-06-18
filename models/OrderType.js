const db = require('../config/db');

class OrderType {
    /**
     * Creates a new global order type.
     * @param {string} name - The name of the order type.
     * @returns {Promise<object>} A promise that resolves to the newly created order type object.
     */
    static async create(name) {
        const query = 'INSERT INTO order_type (name) VALUES ($1) RETURNING *';
        const { rows } = await db.query(query, [name]);
        return rows[0];
    }

    /**
     * Finds all global order types.
     * @returns {Promise<Array>} A promise that resolves to an array of order type objects.
     */
    static async findAll() {
        const query = 'SELECT * FROM order_type ORDER BY id ASC';
        const { rows } = await db.query(query);
        return rows;
    }

    /**
     * Finds an order type by its ID.
     * @param {number|string} id - The ID of the order type.
     * @returns {Promise<object|undefined>} A promise that resolves to the order type object or undefined if not found.
     */
    static async findById(id) {
        const query = 'SELECT * FROM order_type WHERE id = $1';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    /**
     * Updates an existing global order type.
     * @param {number|string} id - The ID of the order type to update.
     * @param {string} name - The new name for the order type.
     * @returns {Promise<object|undefined>} A promise that resolves to the updated order type object or undefined if not found.
     */
    static async update(id, name) {
        const query = 'UPDATE order_type SET name = $1 WHERE id = $2 RETURNING *';
        const { rows } = await db.query(query, [name, id]);
        return rows[0];
    }

    /**
     * Deletes a global order type.
     * @param {number|string} id - The ID of the order type to delete.
     * @returns {Promise<object|undefined>} A promise that resolves to the deleted order type object or undefined if not found.
     */
    static async delete(id) {
        const query = 'DELETE FROM order_type WHERE id = $1 RETURNING *';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }
}

module.exports = OrderType;