// models/OrderStatus.js
const db = require('../config/db');

class OrderStatus {
  static async findAll() {
    const query = 'SELECT id, name, description FROM order_status ORDER BY id';
    const { rows } = await db.query(query);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT id, name, description FROM order_status WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async create({ name, description }) {
    const query = `
      INSERT INTO order_status (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description
    `;
    const { rows } = await db.query(query, [name, description]);
    return rows[0];
  }

  static async update(id, { name, description }) {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (updates.length === 0) {
      return null; // No fields to update
    }

    values.push(id); // Add ID for WHERE clause
    const query = `
      UPDATE order_status
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, description
    `;
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM order_status WHERE id = $1 RETURNING id, name, description';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = OrderStatus;