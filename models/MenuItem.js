// models/MenuItem.js
const db = require('../config/db'); 

class MenuItem {
  
  
  static async findAll() {
    const query = `
      SELECT
        mi.id,
        mi.name,
        mi.description,
        mi.price,
        mi.is_active,
        mi.image_path,
        mi.created_at,
        mi.updated_at,
        mc.id AS category_id,
        mc.name AS category_name,
        mc.description AS category_description
      FROM menu_items mi
      JOIN menu_categories mc ON mi.category_id = mc.id;
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM menu_items WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async create(menuItemData) {
    const { name, description, price, category_id, is_active, image_path } = menuItemData;
    const query = `
      INSERT INTO menu_items (name, description, price, category_id, is_active, image_path)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [name, description, price, category_id, is_active, image_path];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async update(id, menuItemData) {
    const { name, description, price, category_id, is_active, image_path } = menuItemData;
    const query = `
      UPDATE menu_items
      SET name = $1, description = $2, price = $3, category_id = $4, is_active = $5, image_path = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const values = [name, description, price, category_id, is_active, image_path, id];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM menu_items WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = MenuItem;