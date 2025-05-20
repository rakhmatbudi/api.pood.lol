// models/Discount.js
const db = require('../config/db');

class Discount {
  static async findAll() {
    const query = 'SELECT * FROM discount';
    const { rows } = await db.query(query);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM discount WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async create(discountData) {
    const { name, description, amount } = discountData;
    const query = `
      INSERT INTO discount (name, description, amount)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [name, description, amount];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async update(id, discountData) {
    const { name, description, amount } = discountData;
    const query = `
      UPDATE discount
      SET name = $1, description = $2, amount = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;
    const values = [name, description, amount, id];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM discount WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = Discount;