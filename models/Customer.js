// models/Customer.js
const db = require('../config/db'); // Import the database utility with pg.query


class Customer {
  constructor(id, name, phone_number, email, last_visit) {
    this.id = id;
    this.name = name;
    this.phone_number = phone_number;
    this.email = email;
    this.last_visit = last_visit;
  }

  static async findAll() {
    try {
      const result = await db.query('SELECT id, name, phone_number, email, last_visit FROM customer');
      // Map rows to Customer instances if desired, or just return plain objects
      return result.rows.map(row => new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit));
    } catch (error) {
      console.error("Error in Customer.findAll:", error);
      throw error; // Re-throw to be caught by the controller
    }
  }

  static async findById(id) {
    try {
      const result = await db.query('SELECT id, name, phone_number, email, last_visit FROM customer WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return null;
      }
      const row = result.rows[0];
      return new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit);
    } catch (error) {
      console.error(`Error in Customer.findById(${id}):`, error);
      throw error;
    }
  }

  static async createCustomer(customerData) {
    const { name, phone_number, email, last_visit } = customerData;
    try {
      const result = await db.query(
        'INSERT INTO customer (name, phone_number, email, last_visit) VALUES ($1, $2, $3, $4) RETURNING id, name, phone_number, email, last_visit',
        [name, phone_number, email, last_visit]
      );
      const row = result.rows[0];
      return new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit);
    } catch (error) {
      console.error("Error in Customer.createCustomer:", error);
      throw error;
    }
  }

  static async updateCustomer(id, customerData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const key in customerData) {
      if (Object.prototype.hasOwnProperty.call(customerData, key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(customerData[key]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return null; // No fields to update
    }

    values.push(id); // Add ID for the WHERE clause
    const query = `UPDATE customer SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, phone_number, email, last_visit`;

    try {
      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        return null; // Customer not found
      }
      const row = result.rows[0];
      return new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit);
    } catch (error) {
      console.error(`Error in Customer.updateCustomer(${id}):`, error);
      throw error;
    }
  }

  static async deleteCustomer(id) {
    try {
      const result = await db.query('DELETE FROM customer WHERE id = $1 RETURNING id', [id]);
      return result.rows.length > 0; // true if deleted, false if not found
    } catch (error) {
      console.error(`Error in Customer.deleteCustomer(${id}):`, error);
      throw error;
    }
  }
}

module.exports = Customer;