const db = require('../config/db');

class OrderType {
  static async create(name) {
    const query = 'INSERT INTO order_type (name) VALUES ($1) RETURNING *';
    const { rows } = await db.query(query, [name]);
    return rows[0];
  }

  static async findAll() {
    const query = 'SELECT * FROM order_type ORDER BY id ASC';
    const { rows } = await db.query(query);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM order_type WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async update(id, name) {
    const query = 'UPDATE order_type SET name = $1 WHERE id = $2 RETURNING *';
    const { rows } = await db.query(query, [name, id]);
    return rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM order_type WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = OrderType;