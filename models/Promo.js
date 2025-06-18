// models/Promo.js
const db = require('../config/db');

class Promo {
    /**
     * Get all promos for a specific tenant, optionally including associated items.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Array>} A promise that resolves to an array of promo objects.
     */
    static async findAll(tenantId) { // Added tenantId parameter
        const query = `
            SELECT
                p.promo_id,
                p.promo_name,
                p.promo_description,
                p.start_date,
                p.end_date,
                p.term_and_condition,
                p.picture,
                p.type,
                p.discount_type,
                p.discount_amount,
                p.is_active,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', pi.id,
                            'item_id', mi.id,
                            'item_name', mi.name
                        )
                    ) FILTER (WHERE pi.id IS NOT NULL),
                    '[]'::json
                ) AS promo_items
            FROM
                promo p
            LEFT JOIN
                promo_item pi ON p.promo_id = pi.promo_id AND pi.tenant_id = $1 -- Join condition for promo_item with tenant_id
            LEFT JOIN
                menu_items mi ON pi.item_id = mi.id AND mi.tenant_id = $1 -- Join condition for menu_items with tenant_id
            WHERE
                p.tenant_id = $1 -- Filter promos by tenant_id
            GROUP BY
                p.promo_id
            ORDER BY
                p.promo_id DESC;
        `;
        const { rows } = await db.query(query, [tenantId]); // Pass tenantId to query
        return rows;
    }

    /**
     * Get a promo by ID for a specific tenant, including associated items.
     * @param {string} id - The ID of the promo.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the promo object or undefined if not found.
     */
    static async findById(id, tenantId) { // Added tenantId parameter
        const query = `
            SELECT
                p.promo_id,
                p.promo_name,
                p.promo_description,
                p.start_date,
                p.end_date,
                p.term_and_condition,
                p.picture,
                p.type,
                p.discount_type,
                p.discount_amount,
                p.is_active,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', pi.id,
                            'item_id', mi.id,
                            'item_name', mi.name
                        )
                    ) FILTER (WHERE pi.id IS NOT NULL),
                    '[]'::json
                ) AS promo_items
            FROM
                promo p
            LEFT JOIN
                promo_item pi ON p.promo_id = pi.promo_id AND pi.tenant_id = $2 -- Join condition for promo_item with tenant_id
            LEFT JOIN
                menu_items mi ON pi.item_id = mi.id AND mi.tenant_id = $2 -- Join condition for menu_items with tenant_id
            WHERE
                p.promo_id = $1 AND p.tenant_id = $2 -- Filter by promo_id AND tenant_id
            GROUP BY
                p.promo_id;
        `;
        const { rows } = await db.query(query, [id, tenantId]); // Pass id and tenantId
        return rows[0];
    }

    /**
     * Create a new promo and optionally link items for a specific tenant.
     * @param {Object} promoData - The data for the new promo, including tenant_id.
     * @returns {Promise<Object>} A promise that resolves to the newly created promo object with items.
     */
    static async create(promoData) {
        const {
            promo_name,
            promo_description,
            start_date,
            end_date,
            term_and_condition,
            picture,
            type,
            discount_type,
            discount_amount,
            is_active = false,
            item_ids = [], // Array of menu_item_ids
            tenant_id // Expect tenant_id in promoData
        } = promoData;

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const promoQuery = `
                INSERT INTO promo (
                    promo_name, promo_description, start_date, end_date,
                    term_and_condition, picture, type, discount_type,
                    discount_amount, is_active, tenant_id -- Add tenant_id here
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) -- Add $11 for tenant_id
                RETURNING promo_id;
            `;
            const promoValues = [
                promo_name,
                promo_description,
                start_date,
                end_date,
                term_and_condition,
                picture,
                type,
                discount_type,
                discount_amount,
                is_active,
                tenant_id // Pass tenant_id here
            ];
            const { rows: promoRows } = await client.query(promoQuery, promoValues);
            const newPromoId = promoRows[0].promo_id;

            if (item_ids && item_ids.length > 0) {
                const itemInsertPromises = item_ids.map(itemId => {
                    // Insert promo_item with tenant_id
                    return client.query('INSERT INTO promo_item (promo_id, item_id, tenant_id) VALUES ($1, $2, $3);', [newPromoId, itemId, tenant_id]);
                });
                await Promise.all(itemInsertPromises);
            }

            await client.query('COMMIT');
            return this.findById(newPromoId, tenant_id); // Fetch the full promo object with items using tenantId
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating promo:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update an existing promo and its associated items for a specific tenant.
     * @param {string} id - The ID of the promo to update.
     * @param {Object} promoData - The data to update.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the updated promo object or undefined if not found.
     */
    static async update(id, promoData, tenantId) { // Added tenantId parameter
        const {
            promo_name,
            promo_description,
            start_date,
            end_date,
            term_and_condition,
            picture,
            type,
            discount_type,
            discount_amount,
            is_active,
            item_ids // Array of menu_item_ids for update
        } = promoData;

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const updates = [];
            const values = [];
            let paramIndex = 1;

            if (promo_name !== undefined) { updates.push(`promo_name = $${paramIndex}`); values.push(promo_name); paramIndex++; }
            if (promo_description !== undefined) { updates.push(`promo_description = $${paramIndex}`); values.push(promo_description); paramIndex++; }
            if (start_date !== undefined) { updates.push(`start_date = $${paramIndex}`); values.push(start_date); paramIndex++; }
            if (end_date !== undefined) { updates.push(`end_date = $${paramIndex}`); values.push(end_date); paramIndex++; }
            if (term_and_condition !== undefined) { updates.push(`term_and_condition = $${paramIndex}`); values.push(term_and_condition); paramIndex++; }
            if (picture !== undefined) { updates.push(`picture = $${paramIndex}`); values.push(picture); paramIndex++; }
            if (type !== undefined) { updates.push(`type = $${paramIndex}`); values.push(type); paramIndex++; }
            if (discount_type !== undefined) { updates.push(`discount_type = $${paramIndex}`); values.push(discount_type); paramIndex++; }
            if (discount_amount !== undefined) { updates.push(`discount_amount = $${paramIndex}`); values.push(discount_amount); paramIndex++; }
            if (is_active !== undefined) { updates.push(`is_active = $${paramIndex}`); values.push(is_active); paramIndex++; }

            if (updates.length > 0) {
                const promoQuery = `
                    UPDATE promo
                    SET ${updates.join(', ')}
                    WHERE promo_id = $${paramIndex} AND tenant_id = $${paramIndex + 1} -- Filter by tenant_id
                    RETURNING promo_id;
                `;
                values.push(id);
                values.push(tenantId); // Add tenantId to values for the WHERE clause
                await client.query(promoQuery, values);
            }

            // Handle promo_items update: Delete existing and insert new ones
            if (item_ids !== undefined) { // Check if item_ids was explicitly passed
                // Delete existing promo_item associations for this promo and tenant
                await client.query('DELETE FROM promo_item WHERE promo_id = $1 AND tenant_id = $2;', [id, tenantId]);
                if (item_ids.length > 0) {
                    const itemInsertPromises = item_ids.map(itemId => {
                        // Insert new promo_item associations with tenant_id
                        return client.query('INSERT INTO promo_item (promo_id, item_id, tenant_id) VALUES ($1, $2, $3);', [id, itemId, tenantId]);
                    });
                    await Promise.all(itemInsertPromises);
                }
            }

            await client.query('COMMIT');
            return this.findById(id, tenantId); // Return the updated full promo object with items using tenantId
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating promo:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Delete a promo and its associated items for a specific tenant.
     * @param {string} id - The ID of the promo to delete.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the deleted promo object or undefined if not found.
     */
    static async delete(id, tenantId) { // Added tenantId parameter
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Delete associated promo_items first due to foreign key constraint, filtered by tenant_id
            await client.query('DELETE FROM promo_item WHERE promo_id = $1 AND tenant_id = $2;', [id, tenantId]);

            // Delete the promo itself, filtered by tenant_id
            const query = 'DELETE FROM promo WHERE promo_id = $1 AND tenant_id = $2 RETURNING *;';
            const { rows } = await client.query(query, [id, tenantId]);

            await client.query('COMMIT');
            return rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error deleting promo:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = Promo;