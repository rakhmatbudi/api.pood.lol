// models/User.js
const db = require('../config/db');
const bcrypt = require('bcrypt'); // Add this import

class User  {
  static async findAll(filter) {
    let query = 'SELECT id, name, email, created_at, updated_at, role_id FROM public.users';
    const values = [];
    const conditions = [];

    if (filter && filter.role) {
      conditions.push('role_id = $1');
      values.push(filter.role);
    } else if (filter && Array.isArray(filter.roles) && filter.roles.length > 0) {
      conditions.push(`role_id IN (${filter.roles.map((_, index) => `$${index + 1}`).join(', ')})`);
      values.push(...filter.roles);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const { rows } = await db.query(query);
    return rows;
  }
  
  static async findByEmail(email) {
    const query = 'SELECT id, name, email, password, role_id, created_at, updated_at FROM public.users WHERE email = $1';
    const { rows } = await db.query(query, [email]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  
  static async create(userData) {
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
    
    // Get current timestamp
    const now = new Date();
    
    // Insert the user into the database
    const query = `
      INSERT INTO public.users 
      (name, email, password, role_id, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, name, email, role_id, created_at, updated_at
    `;
    
    const values = [
      userData.name,
      userData.email,
      hashedPassword,
      userData.role_id || 2, // Default to role 2 if not specified (adjust as needed)
      now,
      now
    ];
    
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  // Method to check if an email already exists
  static async emailExists(email) {
    const query = 'SELECT COUNT(*) as count FROM public.users WHERE email = $1';
    const { rows } = await db.query(query, [email]);
    return parseInt(rows[0].count) > 0;
  }
};

module.exports = User;