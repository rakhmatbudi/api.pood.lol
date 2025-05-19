// models/CashDenomination.js
const db = require('../config/db');

class CashDenomination {
  static async findAll() {
    let query = 'SELECT id, value FROM cash_denominations';
    const { rows } = await db.query(query);
    return rows;
  }
};

module.exports = CashDenomination;