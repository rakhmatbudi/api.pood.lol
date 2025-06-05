// models/PromoItem.js
const db = require('../config/db');

class PromoItem {
    /**
     * Finds all item_ids associated with a specific promo_id.
     * @param {number|string} promoId - The ID of the promo.
     * @returns {Promise<Array<number|string>>} A promise that resolves to an array of item_ids.
     */
    static async findByPromoId(promoId) {
        try {
            // Assuming promo_item.item_id directly links to menu_items.id
            const query = `SELECT item_id FROM promo_item WHERE promo_id = $1`;
            const { rows } = await db.query(query, [promoId]);
            return rows.map(row => row.item_id);
        } catch (error) {
            console.error(`Error fetching promo items for promo_id ${promoId}:`, error);
            throw error;
        }
    }
}

module.exports = PromoItem;