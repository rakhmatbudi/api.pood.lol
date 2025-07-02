const db = require('../config/db'); // Assuming db connection is configured here

/**
 * Represents an Other Revenue entry in the system, with methods for database operations.
 * All operations are tenant-aware, ensuring data isolation.
 */
class OtherRevenue {
    /**
     * Finds all other revenue entries for a specific tenant.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Array>} A promise that resolves to an array of other revenue objects.
     */
    static async findAll(tenant) {
        // SQL query to select all other revenue entries for a given tenant, ordered by ID.
        const query = 'SELECT * FROM other_revenue WHERE tenant = $1 ORDER BY id';
        // Execute the query with the tenant ID as a parameter.
        const { rows } = await db.query(query, [tenant]);
        return rows;
    }

    /**
     * Finds an other revenue entry by its ID for a specific tenant.
     * @param {number|string} id - The ID of the other revenue entry.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the other revenue object or undefined if not found.
     */
    static async findById(id, tenant) {
        // SQL query to select an other revenue entry by its ID and tenant ID.
        const query = 'SELECT * FROM other_revenue WHERE id = $1 AND tenant = $2';
        // Execute the query with both ID and tenant ID as parameters.
        const { rows } = await db.query(query, [id, tenant]);
        return rows[0]; // Return the first row found (should be unique for ID + tenant).
    }

    /**
     * Creates a new other revenue entry for a specific tenant.
     * @param {Object} revenueData - The data for the new other revenue entry.
     * @param {string} revenueData.date - The date of the revenue.
     * @param {string} [revenueData.description] - The description of the revenue.
     * @param {number} revenueData.amount - The revenue amount.
     * @param {number} [revenueData.category] - The category ID of the revenue.
     * @param {string} revenueData.tenant - The ID of the tenant.
     * @returns {Promise<Object>} A promise that resolves to the newly created other revenue object.
     */
    static async create(revenueData) {
        // Destructure necessary fields from revenueData, including tenant.
        const { date, description, amount, category, tenant } = revenueData;
        // SQL query to insert a new other revenue record. RETURNING * retrieves the newly inserted row.
        const query = `
            INSERT INTO other_revenue (date, description, amount, category, tenant) 
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        // Values array matches the order of placeholders in the query.
        const values = [date, description, amount, category, tenant];
        const { rows } = await db.query(query, values);
        return rows[0]; // Return the newly created other revenue object.
    }

    /**
     * Updates an existing other revenue entry for a specific tenant.
     * @param {number|string} id - The ID of the other revenue entry to update.
     * @param {Object} revenueData - The data to update.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the updated other revenue object or undefined if not found.
     */
    static async update(id, revenueData, tenant) {
        // Destructure updateable fields from revenueData.
        const { date, description, amount, category } = revenueData;
        // SQL query to update an existing other revenue entry, filtered by ID and tenant.
        // `updated_at = NOW()` automatically sets the timestamp.
        const query = `
            UPDATE other_revenue
            SET date = $1, description = $2, amount = $3, category = $4, updated_at = NOW()
            WHERE id = $5 AND tenant = $6
            RETURNING *
        `;
        // Values array matches the order of placeholders.
        const values = [date, description, amount, category, id, tenant];
        const { rows } = await db.query(query, values);
        return rows[0]; // Return the updated other revenue object.
    }

    /**
     * Deletes an other revenue entry for a specific tenant.
     * @param {number|string} id - The ID of the other revenue entry to delete.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the deleted other revenue object or undefined if not found.
     */
    static async delete(id, tenant) {
        // SQL query to delete an other revenue entry by its ID and tenant ID.
        const query = 'DELETE FROM other_revenue WHERE id = $1 AND tenant = $2 RETURNING *';
        // Execute the query with ID and tenant ID.
        const { rows } = await db.query(query, [id, tenant]);
        return rows[0]; // Return the deleted other revenue object.
    }
}

module.exports = OtherRevenue;
