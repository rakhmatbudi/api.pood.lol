// models/ExpenseCategory.js

const db = require('../config/db'); // Assuming db connection is configured here

/**
 * Represents an Expense Category in the system, with methods for database operations.
 * This table is tenant-specific.
 */
class ExpenseCategory {
    /**
     * Finds all expense categories for a specific tenant.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Array>} A promise that resolves to an array of expense category objects.
     */
    static async findAll(tenant) {
        // SQL query to select all expense categories for a given tenant, ordered by ID.
        const query = 'SELECT * FROM expense_category WHERE tenant = $1 ORDER BY id';
        // Execute the query with the tenant ID as a parameter.
        const { rows } = await db.query(query, [tenant]);
        return rows;
    }

    /**
     * Finds an expense category by its ID for a specific tenant.
     * @param {number|string} id - The ID of the expense category.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the expense category object or undefined if not found.
     */
    static async findById(id, tenant) {
        // SQL query to select an expense category by its ID and tenant ID.
        const query = 'SELECT * FROM expense_category WHERE id = $1 AND tenant = $2';
        // Execute the query with both ID and tenant ID as parameters.
        const { rows } = await db.query(query, [id, tenant]);
        return rows[0]; // Return the first row found (should be unique for ID + tenant).
    }

    /**
     * Creates a new expense category for a specific tenant.
     * @param {Object} categoryData - The data for the new expense category.
     * @param {string} categoryData.description - The description of the category.
     * @param {string} categoryData.tenant - The ID of the tenant.
     * @returns {Promise<Object>} A promise that resolves to the newly created expense category object.
     */
    static async create(categoryData) {
        // Destructure necessary fields from categoryData, including tenant.
        const { description, tenant } = categoryData;
        // SQL query to insert a new expense category record. RETURNING * retrieves the newly inserted row.
        const query = `
            INSERT INTO expense_category (description, tenant) 
            VALUES ($1, $2)
            RETURNING *
        `;
        // Values array matches the order of placeholders in the query.
        const values = [description, tenant];
        const { rows } = await db.query(query, values);
        return rows[0]; // Return the newly created expense category object.
    }

    /**
     * Updates an existing expense category for a specific tenant.
     * @param {number|string} id - The ID of the expense category to update.
     * @param {Object} categoryData - The data to update.
     * @param {string} categoryData.description - The new description for the category.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the updated expense category object or undefined if not found.
     */
    static async update(id, categoryData, tenant) {
        // Destructure updateable fields from categoryData.
        const { description } = categoryData;
        // SQL query to update an existing expense category, filtered by ID and tenant.
        const query = `
            UPDATE expense_category
            SET description = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND tenant = $3
            RETURNING *
        `;
        // Values array matches the order of placeholders.
        const values = [description, id, tenant];
        const { rows } = await db.query(query, values);
        return rows[0]; // Return the updated expense category object.
    }

    /**
     * Deletes an expense category for a specific tenant.
     * @param {number|string} id - The ID of the expense category to delete.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the deleted expense category object or undefined if not found.
     */
    static async delete(id, tenant) {
        // SQL query to delete an expense category by its ID and tenant ID.
        const query = 'DELETE FROM expense_category WHERE id = $1 AND tenant = $2 RETURNING *';
        // Execute the query with ID and tenant ID.
        const { rows } = await db.query(query, [id, tenant]);
        return rows[0]; // Return the deleted expense category object.
    }
}

module.exports = ExpenseCategory;
