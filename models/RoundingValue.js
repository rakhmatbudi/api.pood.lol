// models/RoundingValue.js
const db = require('../config/db');

class RoundingValue {
    static async create(roundingValueData) {
        const { rounding_below, rounding_digit } = roundingValueData;
        const query = `
            INSERT INTO rounding_value (rounding_below, rounding_digit)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const values = [rounding_below, rounding_digit];
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    static async findAll() {
        const query = `
            SELECT
                rv.*,
                rt.rounding_digit AS rounding_digit_description,
                rt.rounding_number -- Include rounding_number
            FROM rounding_value rv
            JOIN rounding_type rt ON rv.rounding_digit = rt.id
            ORDER BY rv.rounding_below ASC;
        `;
        const { rows } = await db.query(query);
        return rows;
    }

    static async findByRoundingBelow(roundingBelow) {
        const query = `
            SELECT
                rv.*,
                rt.rounding_digit AS rounding_digit_description,
                rt.rounding_number -- Include rounding_number
            FROM rounding_value rv
            JOIN rounding_type rt ON rv.rounding_digit = rt.id
            WHERE rv.rounding_below = $1;
        `;
        const { rows } = await db.query(query, [roundingBelow]);
        return rows[0];
    }

    static async update(roundingBelow, newData) {
        const { rounding_digit } = newData;
        const query = `
            UPDATE rounding_value
            SET rounding_digit = $2
            WHERE rounding_below = $1
            RETURNING *;
        `;
        const values = [roundingBelow, rounding_digit];
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    static async delete(roundingBelow) {
        const query = `
            DELETE FROM rounding_value
            WHERE rounding_below = $1
            RETURNING *;
        `;
        const { rows } = await db.query(query, [roundingBelow]);
        return rows[0];
    }

    // Renamed to getApplicableRoundingRule and returns the full rule object
    static async getApplicableRoundingRule(amount) {
        const query = `
            SELECT
                rv.rounding_digit AS rounding_type_id,
                rt.rounding_digit AS rounding_digit_description,
                rt.rounding_number -- Include rounding_number
            FROM rounding_value rv
            JOIN rounding_type rt ON rv.rounding_digit = rt.id
            WHERE $1 < rv.rounding_below
            ORDER BY rv.rounding_below ASC
            LIMIT 1;
        `;
        const { rows } = await db.query(query, [amount]);
        return rows.length > 0 ? rows[0] : null; // Return the entire rule object
    }
}

module.exports = RoundingValue;