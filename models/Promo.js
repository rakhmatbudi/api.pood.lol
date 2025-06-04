// models/Promo.js
const db = require('../config/db');

class Promo {
  // Get all promos, optionally including associated items
  static async findAll() {
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
        promo_item pi ON p.promo_id = pi.promo_id
      LEFT JOIN
        menu_items mi ON pi.item_id = mi.id
      GROUP BY
        p.promo_id
      ORDER BY
        p.promo_id DESC;
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  // Get a promo by ID, including associated items
  static async findById(id) {
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
        promo_item pi ON p.promo_id = pi.promo_id
      LEFT JOIN
        menu_items mi ON pi.item_id = mi.id
      WHERE
        p.promo_id = $1
      GROUP BY
        p.promo_id;
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  // Create a new promo and optionally link items
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
      is_active = false, // Default to false if not provided
      item_ids = [] // Array of menu_item_ids
    } = promoData;

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const promoQuery = `
        INSERT INTO promo (promo_name, promo_description, start_date, end_date, term_and_condition, picture, type, discount_type, discount_amount, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        is_active
      ];
      const { rows: promoRows } = await client.query(promoQuery, promoValues);
      const newPromoId = promoRows[0].promo_id;

      if (item_ids && item_ids.length > 0) {
        const itemInsertPromises = item_ids.map(itemId => {
          return client.query('INSERT INTO promo_item (promo_id, item_id) VALUES ($1, $2);', [newPromoId, itemId]);
        });
        await Promise.all(itemInsertPromises);
      }

      await client.query('COMMIT');
      return this.findById(newPromoId); // Return the full promo object with items
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating promo:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update an existing promo and its associated items
  static async update(id, promoData) {
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

      if (promo_name !== undefined) {
        updates.push(`promo_name = $${paramIndex}`);
        values.push(promo_name);
        paramIndex++;
      }
      if (promo_description !== undefined) {
        updates.push(`promo_description = $${paramIndex}`);
        values.push(promo_description);
        paramIndex++;
      }
      if (start_date !== undefined) {
        updates.push(`start_date = $${paramIndex}`);
        values.push(start_date);
        paramIndex++;
      }
      if (end_date !== undefined) {
        updates.push(`end_date = $${paramIndex}`);
        values.push(end_date);
        paramIndex++;
      }
      if (term_and_condition !== undefined) {
        updates.push(`term_and_condition = $${paramIndex}`);
        values.push(term_and_condition);
        paramIndex++;
      }
      if (picture !== undefined) {
        updates.push(`picture = $${paramIndex}`);
        values.push(picture);
        paramIndex++;
      }
      if (type !== undefined) {
        updates.push(`type = $${paramIndex}`);
        values.push(type);
        paramIndex++;
      }
      if (discount_type !== undefined) {
        updates.push(`discount_type = $${paramIndex}`);
        values.push(discount_type);
        paramIndex++;
      }
      if (discount_amount !== undefined) {
        updates.push(`discount_amount = $${paramIndex}`);
        values.push(discount_amount);
        paramIndex++;
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(is_active);
        paramIndex++;
      }

      if (updates.length > 0) {
        const promoQuery = `
          UPDATE promo
          SET ${updates.join(', ')}
          WHERE promo_id = $${paramIndex}
          RETURNING promo_id;
        `;
        values.push(id);
        await client.query(promoQuery, values);
      }

      // Handle promo_items update: Delete existing and insert new ones
      if (item_ids !== undefined) { // Check if item_ids was explicitly passed
        await client.query('DELETE FROM promo_item WHERE promo_id = $1;', [id]);
        if (item_ids.length > 0) {
          const itemInsertPromises = item_ids.map(itemId => {
            return client.query('INSERT INTO promo_item (promo_id, item_id) VALUES ($1, $2);', [id, itemId]);
          });
          await Promise.all(itemInsertPromises);
        }
      }

      await client.query('COMMIT');
      return this.findById(id); // Return the updated full promo object with items
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating promo:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete a promo and its associated items
  static async delete(id) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Delete associated promo_items first due to foreign key constraint
      await client.query('DELETE FROM promo_item WHERE promo_id = $1;', [id]);

      const query = 'DELETE FROM promo WHERE promo_id = $1 RETURNING *;';
      const { rows } = await client.query(query, [id]);

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