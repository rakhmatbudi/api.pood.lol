// models/MenuItemVariant.js
const db = require('../config/db'); // Your database client

class MenuItemVariant {
    /**
     * Fetches all menu item variants for a specific tenant from the database.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Array>} A promise that resolves to an array of all menu item variants for the tenant.
     */
    static async findAll(tenant) {
        if (!tenant) {
            throw new Error('Tenant ID is required to find all menu item variants.');
        }
        const query = 'SELECT * FROM public.menu_item_variants WHERE tenant = $1 ORDER BY name ASC;';
        const { rows } = await db.query(query, [tenant]);
        return rows;
    }

    /**
     * Fetches a single menu item variant by its ID for a specific tenant.
     * @param {number} id - The ID of the menu item variant.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the menu item variant object or undefined if not found.
     */
    static async findById(id, tenant) {
        if (!tenant) {
            throw new Error('Tenant ID is required to find a menu item variant by ID.');
        }
        const query = 'SELECT * FROM public.menu_item_variants WHERE id = $1 AND tenant = $2;';
        const { rows } = await db.query(query, [id, tenant]);
        return rows[0]; // Returns the first row or undefined
    }

    /**
     * Fetches all menu item variants associated with a specific menu item ID for a given tenant.
     * @param {number} menuItemId - The ID of the parent menu item.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Array>} A promise that resolves to an array of variants for the given menu item and tenant.
     */
    static async findByMenuItemId(menuItemId, tenant) {
        if (!tenant) {
            throw new Error('Tenant ID is required to find menu item variants by menu item ID.');
        }
        // It's crucial to also filter by tenant here to ensure data isolation
        const query = 'SELECT * FROM public.menu_item_variants WHERE menu_item_id = $1 AND tenant = $2 ORDER BY name ASC;';
        const { rows } = await db.query(query, [menuItemId, tenant]);
        return rows;
    }

    /**
     * Creates a new menu item variant in the database for a specific tenant.
     * @param {Object} variantData - The data for the new menu item variant.
     * @param {number} variantData.menu_item_id - The ID of the menu item this variant belongs to.
     * @param {string} variantData.name - The name of the variant (e.g., "Large", "Add Cheese").
     * @param {number} variantData.price - The price of the variant.
     * @param {boolean} variantData.is_active - Whether the variant is active (defaults to true).
     * @param {string} variantData.tenant - The ID of the tenant this variant belongs to.
     * @returns {Promise<Object>} A promise that resolves to the newly created menu item variant object.
     */
    static async create({ menu_item_id, name, price, is_active, tenant }) {
        if (!tenant) {
            throw new Error('Tenant ID is required to create a menu item variant.');
        }
        const query = `
            INSERT INTO public.menu_item_variants (menu_item_id, name, price, is_active, tenant)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [menu_item_id, name, price, is_active, tenant];
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Updates an existing menu item variant in the database for a specific tenant.
     * @param {number} id - The ID of the menu item variant to update.
     * @param {Object} variantData - The data to update the menu item variant with.
     * @param {string} [variantData.name] - The new name of the variant.
     * @param {number} [variantData.price] - The new price of the variant.
     * @param {boolean} [variantData.is_active] - The new active status of the variant.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the updated menu item variant object or undefined if not found.
     */
    static async update(id, { name, price, is_active }, tenant) {
        if (!tenant) {
            throw new Error('Tenant ID is required to update a menu item variant.');
        }
        const query = `
            UPDATE public.menu_item_variants
            SET
                name = COALESCE($1, name),
                price = COALESCE($2, price),
                is_active = COALESCE($3, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 AND tenant = $5 -- Filter by tenant
            RETURNING *;
        `;
        // COALESCE ensures that if a field is not provided (null/undefined), it retains its current value
        const values = [name, price, is_active, id, tenant];
        const { rows } = await db.query(query, values);
        return rows[0]; // Returns the updated item or undefined if not found
    }

    /**
     * Deletes a menu item variant from the database for a specific tenant.
     * @param {number} id - The ID of the menu item variant to delete.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the deleted menu item variant object or undefined if not found.
     */
    static async delete(id, tenant) {
        if (!tenant) {
            throw new Error('Tenant ID is required to delete a menu item variant.');
        }
        const query = 'DELETE FROM public.menu_item_variants WHERE id = $1 AND tenant = $2 RETURNING *;';
        const { rows } = await db.query(query, [id, tenant]);
        return rows[0]; // Returns the deleted item or undefined if not found
    }
}

module.exports = MenuItemVariant;