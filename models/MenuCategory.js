// models/MenuCategory.js
const db = require('../config/db');

class MenuCategory {
  static async findAll() {
    const query = 'SELECT * FROM menu_categories WHERE is_displayed = TRUE';
    const { rows } = await db.query(query);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM menu_categories WHERE id = $1 AND is_displayed = TRUE';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async create(categoryData) {
    const {
      name,
      description,
      is_displayed,
      display_picture,
      menu_category_group,  
      sku_id,              // New field
      is_highlight,        // New field
      is_display_for_self_order // New field
    } = categoryData;

    const query = `
      INSERT INTO menu_categories (
        name, description, is_displayed, display_picture,
      menu_category_group, 
        sku_id, is_highlight, is_display_for_self_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
      is_display_for_self_order
    ];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async update(id, categoryData) {
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

    if (categoryData.type !== undefined) {
      fields.push(`type = $${paramCount}`);
      values.push(categoryData.type);
      paramCount++;
    }

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

    // Add new fields for update
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

    if (fields.length === 1) { // Only updated_at field
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE menu_categories
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(id);

    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async softDelete(id) {
    const query = `
      UPDATE menu_categories
      SET is_displayed = FALSE, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM menu_categories WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = MenuCategory;