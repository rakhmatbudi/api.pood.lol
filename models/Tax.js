// models/Tax.js
const db = require('../config/db'); // Assuming you have a database connection setup

class Tax {
  static async findAll() {
    const query = `
      SELECT
        id,
        name,
        description,
        amount
      FROM public.tax
      ORDER BY id DESC;
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async findById(id) {
    const query = `
      SELECT
        id,
        name,
        description,
        amount
      FROM public.tax
      WHERE id = $1;
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async create(taxData) {
    const { name, description, amount } = taxData;
    const query = `
      INSERT INTO public.tax (name, description, amount)
      VALUES ($1, $2, $3)
      RETURNING id, name, description, amount;
    `;
    const values = [name, description, amount];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async update(id, taxData) {
    const { name, description, amount } = taxData;
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

    if (amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      values.push(amount);
      paramIndex++;
    }

    if (updates.length === 0) {
      return null; // No fields to update
    }

    const query = `
      UPDATE public.tax
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, description, amount;
    `;

    values.push(id);
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = `
      DELETE FROM public.tax
      WHERE id = $1
      RETURNING id;
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
}

module.exports = Tax;