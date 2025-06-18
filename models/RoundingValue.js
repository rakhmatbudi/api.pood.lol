// models/RoundingValue.js
const db = require('../config/db');

class RoundingValue {
  /**
   * Creates a new rounding value record for a specific tenant.
   * @param {Object} roundingValueData - The rounding value data.
   * @param {number} roundingValueData.rounding_below - The threshold below which rounding applies.
   * @param {number} roundingValueData.rounding_digit - The ID of the rounding type.
   * @param {string} tenant- The ID of the tenant.
   * @returns {Promise<Object>} - A promise resolving to the newly created rounding value record.
   */
  static async create(roundingValueData, tenant) {
    const { rounding_below, rounding_digit } = roundingValueData;
    const query = `
            INSERT INTO rounding_value (rounding_below, rounding_digit, tenant)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
    const values = [rounding_below, rounding_digit, tenant];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  /**
   * Retrieves all rounding value records for a specific tenant.
   * @param {string} tenant - The ID of the tenant.
   * @returns {Promise<Array<Object>>} - A promise resolving to an array of rounding value records.
   */
  static async findAll(tenant) {
    const query = `
            SELECT
                rv.*,
                rt.rounding_digit AS rounding_digit_description,
                rt.rounding_number
            FROM rounding_value rv
            JOIN rounding_type rt ON rv.rounding_digit = rt.id AND rt.tenant = $1 -- Assuming rounding_type is also tenant-specific
            WHERE rv.tenant = $1
            ORDER BY rv.rounding_below ASC;
        `;
    const { rows } = await db.query(query, [tenant]);
    return rows;
  }

  /**
   * Retrieves a rounding value record by its 'rounding_below' value for a specific tenant.
   * @param {number} roundingBelow - The rounding_below value to search for.
   * @param {string} tenant - The ID of the tenant.
   * @returns {Promise<Object | null>} - A promise resolving to the retrieved record, or null if not found.
   */
  static async findByRoundingBelow(roundingBelow, tenant) {
    const query = `
            SELECT
                rv.*,
                rt.rounding_digit AS rounding_digit_description,
                rt.rounding_number
            FROM rounding_value rv
            JOIN rounding_type rt ON rv.rounding_digit = rt.id AND rt.tenant = $2 -- Assuming rounding_type is also tenant-specific
            WHERE rv.rounding_below = $1 AND rv.tenant = $2;
        `;
    const { rows } = await db.query(query, [roundingBelow, tenant]);
    return rows[0] || null;
  }

  /**
   * Updates an existing rounding value record for a specific tenant.
   * @param {number} roundingBelow - The original rounding_below value of the record to update.
   * @param {Object} newData - The new data for the rounding value.
   * @param {number} newData.rounding_digit - The new ID of the rounding type.
   * @param {string} tenant - The ID of the tenant.
   * @returns {Promise<Object | null>} - A promise resolving to the updated record, or null if not found.
   */
  static async update(roundingBelow, newData, tenant) {
    const { rounding_digit } = newData;
    const query = `
            UPDATE rounding_value
            SET rounding_digit = $2
            WHERE rounding_below = $1 AND tenant = $3
            RETURNING *;
        `;
    const values = [roundingBelow, rounding_digit, tenant];
    const { rows } = await db.query(query, values);
    return rows[0] || null;
  }

  /**
   * Deletes a rounding value record for a specific tenant.
   * @param {number} roundingBelow - The rounding_below value of the record to delete.
   * @param {string} tenant - The ID of the tenant.
   * @returns {Promise<Object | null>} - A promise resolving to the deleted record, or null if not found.
   */
  static async delete(roundingBelow, tenant) {
    const query = `
            DELETE FROM rounding_value
            WHERE rounding_below = $1 AND tenant = $2
            RETURNING *;
        `;
    const { rows } = await db.query(query, [roundingBelow, tenant]);
    return rows[0] || null;
  }

  /**
   * Retrieves the applicable rounding rule for a given amount for a specific tenant.
   * @param {number} amount - The amount for which to find the rounding rule.
   * @param {string} tenant - The ID of the tenant.
   * @returns {Promise<Object | null>} - A promise resolving to the applicable rule object, or null if no rule applies.
   */
  static async getApplicableRoundingRule(amount, tenant) {
    const query = `
            SELECT
                rv.rounding_digit AS rounding_type_id,
                rt.rounding_digit AS rounding_digit_description,
                rt.rounding_number
            FROM rounding_value rv
            JOIN rounding_type rt ON rv.rounding_digit = rt.id AND rt.tenant = $2 -- Assuming rounding_type is also tenant-specific
            WHERE $1 < rv.rounding_below AND rv.tenant = $2
            ORDER BY rv.rounding_below ASC
            LIMIT 1;
        `;
    const { rows } = await db.query(query, [amount, tenant]);
    return rows.length > 0 ? rows[0] : null;
  }
}

module.exports = RoundingValue;