// models/RoundingType.js
const db = require('../config/db');

class RoundingType {
    static async create(roundingTypeData) {
        const { rounding_digit, rounding_number } = roundingTypeData; // Added rounding_number
        const query = `
            INSERT INTO rounding_type (rounding_digit, rounding_number)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const values = [rounding_digit, rounding_number]; // Added rounding_number
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    static async findAll() {
        const query = 'SELECT id, rounding_digit, rounding_number FROM rounding_type ORDER BY id ASC'; // Select rounding_number
        const { rows } = await db.query(query);
        return rows;
    }

    static async findById(id) {
        const query = 'SELECT id, rounding_digit, rounding_number FROM rounding_type WHERE id = $1'; // Select rounding_number
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    // You might add an update or delete method if needed
}

module.exports = RoundingType;