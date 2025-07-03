const db = require('../config/db'); // Assuming db connection is configured here

/**
 * Represents a Revenue Category in the system, with methods for database operations.
 * This table is now tenant-specific.
 */
class RevenueCategory {
    /**
     * Finds all revenue categories for a specific tenant.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Array>} A promise that resolves to an array of revenue category objects.
     */
    static async findAll(tenant) { // Added tenant parameter
        // SQL query to select all revenue categories for a given tenant, ordered by ID.
        const query = 'SELECT * FROM revenue_category WHERE tenant = $1 ORDER BY id'; // Filter by tenant
        // Execute the query with the tenant ID as a parameter.
        const { rows } = await db.query(query, [tenant]); // Pass tenant to query
        return rows;
    }

    /**
     * Finds a revenue category by its ID for a specific tenant.
     * @param {number|string} id - The ID of the revenue category.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the revenue category object or undefined if not found.
     */
    static async findById(id, tenant) { // Added tenant parameter
        // SQL query to select a revenue category by its ID and tenant ID.
        const query = 'SELECT * FROM revenue_category WHERE id = $1 AND tenant = $2'; // Filter by ID AND tenant
        // Execute the query with both ID and tenant ID as parameters.
        const { rows } = await db.query(query, [id, tenant]); // Pass id and tenant
        return rows[0]; // Return the first row found (should be unique for ID + tenant).
    }

    /**
     * Creates a new revenue category for a specific tenant.
     * @param {Object} categoryData - The data for the new revenue category.
     * @param {string} categoryData.description - The description of the category.
     * @param {string} categoryData.tenant - The ID of the tenant.
     * @returns {Promise<Object>} A promise that resolves to the newly created revenue category object.
     */
    static async create(categoryData) {
        // Destructure necessary fields from categoryData, including tenant.
        const { description, tenant } = categoryData; // Destructure tenant
        // SQL query to insert a new revenue category record. RETURNING * retrieves the newly inserted row.
        const query = `
            INSERT INTO revenue_category (description, tenant) 
            VALUES ($1, $2)
            RETURNING *
        `;
        // Values array matches the order of placeholders in the query.
        const values = [description, tenant]; // Add tenant to values
        const { rows } = await db.query(query, values);
        return rows[0]; // Return the newly created revenue category object.
    }

    /**
     * Updates an existing revenue category for a specific tenant.
     * @param {number|string} id - The ID of the revenue category to update.
     * @param {Object} categoryData - The data to update.
     * @param {string} categoryData.description - The new description for the category.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the updated revenue category object or undefined if not found.
     */
    static async update(id, categoryData, tenant) { // Added tenant parameter
        // Destructure updateable fields from categoryData.
        const { description } = categoryData;
        // SQL query to update an existing revenue category, filtered by ID and tenant.
        const query = `
            UPDATE revenue_category
            SET description = $1, update_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND tenant = $3 -- Filter by ID AND tenant
            RETURNING *
        `;
        // Values array matches the order of placeholders.
        const values = [description, id, tenant]; // Add tenant to values
        const { rows } = await db.query(query, values);
        return rows[0]; // Return the updated revenue category object.
    }

    /**
     * Deletes a revenue category for a specific tenant.
     * @param {number|string} id - The ID of the revenue category to delete.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the deleted revenue category object or undefined if not found.
     */
    static async delete(id, tenant) { // Added tenant parameter
        // SQL query to delete a revenue category by its ID and tenant ID.
        const query = 'DELETE FROM revenue_category WHERE id = $1 AND tenant = $2 RETURNING *'; // Filter by ID AND tenant
        // Execute the query with ID and tenant ID.
        const { rows } = await db.query(query, [id, tenant]); // Pass id and tenant
        return rows[0]; // Return the deleted revenue category object.
    }
}

module.exports = RevenueCategory;
