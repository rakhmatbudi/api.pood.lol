// config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config(); // Load environment variables from .env file

const sequelize = new Sequelize(
  process.env.DB_NAME,      // e.g., 'your_database_name'
  process.env.DB_USER,      // e.g., 'postgres'
  process.env.DB_PASSWORD,  // e.g., 'your_db_password'
  {
    host: process.env.DB_HOST || 'localhost', // e.g., 'localhost' or your database host
    dialect: 'postgres', // Specifies PostgreSQL dialect
    port: process.env.DB_PORT || 5432, // Default PostgreSQL port
    logging: false, // Set to true to see SQL queries executed by Sequelize
    define: {
      freezeTableName: true // Prevent Sequelize from pluralizing table names (e.g., 'MenuItem' -> 'MenuItems' becomes 'MenuItem')
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Function to test database connection and sync models
async function connectAndSyncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Import models here to ensure they are defined before syncing
    // This order matters for associations to be properly recognized
    const MenuItem = require('../models/MenuItem');
    const MenuItemVariant = require('../models/MenuItemVariant');
    const MenuCategory = require('../models/MenuCategory'); // Import MenuCategory

    // Sync all defined models with the database.
    // In production, use migrations instead of `sync({ force: true })` or `sync({ alter: true })`.
    // `alter: true` attempts to make necessary changes to the database to match the models.
    // `force: true` drops existing tables and recreates them (DANGER: DATA LOSS).
    await sequelize.sync({ alter: true }); // Use { alter: true } for development to apply schema changes
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database or sync models:', error);
    process.exit(1); // Exit the process if database connection or sync fails
  }
}

module.exports = { sequelize, connectAndSyncDatabase }; // Export both
