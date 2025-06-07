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
    const { name, description, is_displayed, display_picture } = categoryData;
    const query = `
      INSERT INTO menu_categories (name, description, is_displayed, display_picture)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [name, description, is_displayed, display_picture];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async update(id, categoryData) {
    const { name, description, is_displayed, display_picture } = categoryData;
    const query = `
      UPDATE menu_categories
      SET name = $1, description = $2, is_displayed = $3, display_picture = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;
    const values = [name, description, is_displayed, display_picture, id];
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