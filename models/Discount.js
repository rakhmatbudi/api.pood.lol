const db = require('../config/db');

class Discount {
    /**
     * Finds all discounts for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Array>} A promise that resolves to an array of discount objects.
     */
    static async findAll(tenantId) { // Added tenantId parameter
        const query = 'SELECT * FROM discount WHERE tenant_id = $1 ORDER BY id'; // Filter by tenant_id
        const { rows } = await db.query(query, [tenantId]); // Pass tenantId to query
        return rows;
    }

    /**
     * Finds a discount by its ID for a specific tenant.
     * @param {number|string} id - The ID of the discount.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the discount object or undefined if not found.
     */
    static async findById(id, tenantId) { // Added tenantId parameter
        const query = 'SELECT * FROM discount WHERE id = $1 AND tenant_id = $2'; // Filter by ID AND tenant_id
        const { rows } = await db.query(query, [id, tenantId]); // Pass id and tenantId
        return rows[0];
    }

    /**
     * Creates a new discount for a specific tenant.
     * @param {Object} discountData - The data for the new discount.
     * @param {string} discountData.name - The name of the discount.
     * @param {string} [discountData.description] - The description of the discount.
     * @param {number} discountData.amount - The discount amount.
     * @param {string} discountData.tenant_id - The ID of the tenant.
     * @returns {Promise<Object>} A promise that resolves to the newly created discount object.
     */
    static async create(discountData) {
        const { name, description, amount, tenant_id } = discountData; // Destructure tenant_id
        const query = `
            INSERT INTO discount (name, description, amount, tenant_id) -- Add tenant_id column
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const values = [name, description, amount, tenant_id]; // Add tenant_id to values
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Updates an existing discount for a specific tenant.
     * @param {number|string} id - The ID of the discount to update.
     * @param {Object} discountData - The data to update.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the updated discount object or undefined if not found.
     */
    static async update(id, discountData, tenantId) { // Added tenantId parameter
        const { name, description, amount } = discountData;
        const query = `
            UPDATE discount
            SET name = $1, description = $2, amount = $3, updated_at = NOW()
            WHERE id = $4 AND tenant_id = $5 -- Filter by ID AND tenant_id
            RETURNING *
        `;
        const values = [name, description, amount, id, tenantId]; // Add tenantId to values
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Deletes a discount for a specific tenant.
     * @param {number|string} id - The ID of the discount to delete.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the deleted discount object or undefined if not found.
     */
    static async delete(id, tenantId) { // Added tenantId parameter
        const query = 'DELETE FROM discount WHERE id = $1 AND tenant_id = $2 RETURNING *'; // Filter by ID AND tenant_id
        const { rows } = await db.query(query, [id, tenantId]); // Pass id and tenantId
        return rows[0];
    }
}

module.exports = Discount;