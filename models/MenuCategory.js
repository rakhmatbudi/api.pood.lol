// models/MenuCategory.js
const db = require('../config/db');

class MenuCategory {
    /**
     * Retrieves all displayed menu categories for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Array>} A promise that resolves to an array of menu categories.
     */
    static async findAll(tenantId) {
        const query = 'SELECT * FROM menu_categories WHERE is_displayed = TRUE AND tenant_id = $1';
        const { rows } = await db.query(query, [tenantId]);
        return rows;
    }

    /**
     * Retrieves a specific displayed menu category by ID for a specific tenant.
     * @param {string} id - The ID of the menu category.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the menu category object or undefined if not found.
     */
    static async findById(id, tenantId) {
        const query = 'SELECT * FROM menu_categories WHERE id = $1 AND is_displayed = TRUE AND tenant_id = $2';
        const { rows } = await db.query(query, [id, tenantId]);
        return rows[0];
    }

    /**
     * Creates a new menu category.
     * @param {Object} categoryData - The data for the new menu category, including tenant_id.
     * @returns {Promise<Object>} A promise that resolves to the newly created menu category object.
     */
    static async create(categoryData) {
        const {
            name,
            description,
            is_displayed,
            display_picture,
            menu_category_group,
            sku_id,
            is_highlight,
            is_display_for_self_order,
            tenant_id // New field for multi-tenancy
        } = categoryData;

        const query = `
            INSERT INTO menu_categories (
                name, description, is_displayed, display_picture,
                menu_category_group, sku_id, is_highlight, is_display_for_self_order,
                tenant_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const values = [
            name,
            description,
            is_displayed,
            display_picture,
            menu_category_group,
            sku_id,
            is_highlight,
            is_display_for_self_order,
            tenant_id // Add tenant_id to values
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Updates an existing menu category for a specific tenant.
     * @param {string} id - The ID of the menu category to update.
     * @param {Object} categoryData - The data to update.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the updated menu category object or undefined if not found.
     */
    static async update(id, categoryData, tenantId) { // Add tenantId parameter
        const fields = [];
        const values = [];
        let paramCount = 1;

        if (categoryData.name !== undefined) {
            fields.push(`name = $${paramCount}`);
            values.push(categoryData.name);
            paramCount++;
        }

        if (categoryData.description !== undefined) {
            fields.push(`description = $${paramCount}`);
            values.push(categoryData.description);
            paramCount++;
        }

        // Note: 'type' field was in your original update, but not in create.
        // Ensure your database schema supports it if you want to update it.
        // If (categoryData.type !== undefined) {
        //   fields.push(`type = $${paramCount}`);
        //   values.push(categoryData.type);
        //   paramCount++;
        // }

        if (categoryData.is_displayed !== undefined) {
            fields.push(`is_displayed = $${paramCount}`);
            values.push(categoryData.is_displayed);
            paramCount++;
        }

        if (categoryData.display_picture !== undefined) {
            fields.push(`display_picture = $${paramCount}`);
            values.push(categoryData.display_picture);
            paramCount++;
        }

        if (categoryData.menu_category_group !== undefined) {
            fields.push(`menu_category_group = $${paramCount}`);
            values.push(categoryData.menu_category_group);
            paramCount++;
        }

        if (categoryData.sku_id !== undefined) {
            fields.push(`sku_id = $${paramCount}`);
            values.push(categoryData.sku_id);
            paramCount++;
        }

        if (categoryData.is_highlight !== undefined) {
            fields.push(`is_highlight = $${paramCount}`);
            values.push(categoryData.is_highlight);
            paramCount++;
        }

        if (categoryData.is_display_for_self_order !== undefined) {
            fields.push(`is_display_for_self_order = $${paramCount}`);
            values.push(categoryData.is_display_for_self_order);
            paramCount++;
        }

        fields.push(`updated_at = NOW()`);

        if (fields.length === 1 && fields[0] === 'updated_at = NOW()') { // Only updated_at field means no actual data update
             // This condition needs to be adjusted based on the controller's expectation.
             // If the controller expects null/undefined for "not found", returning it is fine.
             // If it expects an error for "no fields to update", then re-throw or handle.
            // For multi-tenancy, it's more about 'found and no changes vs not found at all'.
            // For this model, if 'id' and 'tenantId' match but no fields, it'll still return the existing row with updated_at.
            // It might be better to return null/undefined if the specific tenant+id combination isn't found.
        }

        // Add ID and tenantId to values for the WHERE clause
        values.push(id);
        values.push(tenantId); // Add tenantId to values

        const query = `
            UPDATE menu_categories
            SET ${fields.join(', ')}
            WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
            RETURNING *
        `;

        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Soft deletes a menu category (sets is_displayed to FALSE) for a specific tenant.
     * @param {string} id - The ID of the menu category to soft delete.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the soft-deleted menu category object or undefined if not found.
     */
    static async softDelete(id, tenantId) { // Add tenantId parameter
        const query = `
            UPDATE menu_categories
            SET is_displayed = FALSE, updated_at = NOW()
            WHERE id = $1 AND tenant_id = $2
            RETURNING *
        `;
        const { rows } = await db.query(query, [id, tenantId]);
        return rows[0];
    }

    /**
     * Hard deletes a menu category from the database for a specific tenant.
     * Use with caution as this permanently removes the record.
     * @param {string} id - The ID of the menu category to delete.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the deleted menu category object or undefined if not found.
     */
    static async delete(id, tenantId) { // Add tenantId parameter
        const query = 'DELETE FROM menu_categories WHERE id = $1 AND tenant_id = $2 RETURNING *';
        const { rows } = await db.query(query, [id, tenantId]);
        return rows[0];
    }
}

module.exports = MenuCategory;