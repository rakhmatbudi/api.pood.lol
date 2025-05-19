// models/PaymentMode.js
const db = require('../config/db');

class PaymentMode {
  static async findAll() {
    const query = 'SELECT * FROM payment_modes order by id';
    const { rows } = await db.query(query);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM payment_modes WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async create(paymentModeData) {
    const { payment_mode_type_id, description, is_active = true } = paymentModeData;
    const query = `
      INSERT INTO payment_modes (payment_mode_type_id, description, is_active)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [payment_mode_type_id, description, is_active];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async update(id, paymentModeData) {
    const { payment_mode_type_id, description, is_active } = paymentModeData;
    const query = `
      UPDATE payment_modes
      SET payment_mode_type_id = $1, description = $2, is_active = $3, updated_at = DEFAULT
      WHERE id = $4
      RETURNING *
    `;
    const values = [payment_mode_type_id, description, is_active, id];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM payment_modes WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = PaymentMode;