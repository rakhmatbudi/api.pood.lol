// models/PromoItem.js
const db = require('../config/db');

class PromoItem {
    /**
     * Finds all item_ids associated with a specific promo_id for a specific tenant.
     * @param {number|string} promoId - The ID of the promo.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Array<number|string>>} A promise that resolves to an array of item_ids.
     */
    static async findByPromoId(promoId, tenantId) {
        try {
            // Assuming promo_item.item_id directly links to menu_items.id
            // Add tenant_id to the WHERE clause to ensure multi-tenancy
            const query = `SELECT item_id FROM promo_item WHERE promo_id = $1 AND tenant_id = $2`;
            const { rows } = await db.query(query, [promoId, tenantId]);
            return rows.map(row => row.item_id);
        } catch (error) {
            console.error(`Error fetching promo items for promo_id ${promoId} and tenant ${tenantId}:`, error);
            throw error;
        }
    }

    // You might also need methods to create and delete promo_item entries,
    // which would also need to be tenant-aware. For example:

    /**
     * Associates an item with a promo for a specific tenant.
     * @param {number|string} promoId - The ID of the promo.
     * @param {number|string} itemId - The ID of the item.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object>} A promise that resolves to the newly created association.
     */
    static async create(promoId, itemId, tenantId) {
        try {
            const query = `INSERT INTO promo_item (promo_id, item_id, tenant_id) VALUES ($1, $2, $3) RETURNING *`;
            const { rows } = await db.query(query, [promoId, itemId, tenantId]);
            return rows[0];
        } catch (error) {
            console.error(`Error creating promo item association for promo ${promoId}, item ${itemId}, tenant ${tenantId}:`, error);
            throw error;
        }
    }

    /**
     * Removes an item association from a promo for a specific tenant.
     * @param {number|string} promoId - The ID of the promo.
     * @param {number|string} itemId - The ID of the item.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the deleted association or undefined if not found.
     */
    static async delete(promoId, itemId, tenantId) {
        try {
            const query = `DELETE FROM promo_item WHERE promo_id = $1 AND item_id = $2 AND tenant_id = $3 RETURNING *`;
            const { rows } = await db.query(query, [promoId, itemId, tenantId]);
            return rows[0];
        } catch (error) {
            console.error(`Error deleting promo item association for promo ${promoId}, item ${itemId}, tenant ${tenantId}:`, error);
            throw error;
        }
    }
}

module.exports = PromoItem;