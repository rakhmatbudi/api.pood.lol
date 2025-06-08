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
    const { name, description, type, is_displayed, display_picture } = categoryData;
    const query = `
      INSERT INTO menu_categories (name, description, type, is_displayed, display_picture)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [name, description, type, is_displayed, display_picture];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async update(id, categoryData) {
    // Build dynamic query based on provided fields
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

    // Always update the updated_at field
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

  // Soft delete: set is_displayed to FALSE
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

  // Permanent delete (use with caution)
  static async delete(id) {
    const query = 'DELETE FROM menu_categories WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = MenuCategory;