//apps.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config(); // Load environment variables from .env file

// Import Sequelize connection and sync function
const sequelize = require('./config/database');
const { connectAndSyncDatabase } = require('./config/database');

// Import your routes
const orderRoutes = require('./routes/orders');
const cashierSessionRoutes = require('./routes/cashierSessions');
const userRoutes = require('./routes/users');
const cashDenominationRoutes = require('./routes/cashDenominations');
const menuItemRoutes = require('./routes/menuItems'); // This is your existing menu item route
const paymentRoutes = require('./routes/payments');
const paymentModeRoutes = require('./routes/paymentModes');
const dataSyncRoutes = require('./routes/dataSyncServices');
const taxRoutes = require('./routes/taxes');
const discountRoutes = require('./routes/discounts');
const roundingRoutes = require('./routes/roundings');
const customerRoutes = require('./routes/customers');


const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE CONNECTION AND MODEL SYNC ---
// Call the function to connect to the database and synchronize models
// This should happen early in your application's lifecycle
connectAndSyncDatabase();

// --- MIDDLEWARE ---
app.use(helmet()); // Basic security headers
app.use(cors());   // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies

// --- ROUTES ---
app.use('/orders', orderRoutes);
app.use('/cashier-sessions', cashierSessionRoutes);
app.use('/users', userRoutes);
app.use('/cash-denominations', cashDenominationRoutes);
app.use('/menu-items', menuItemRoutes); 
app.use('/payments', paymentRoutes);
app.use('/payment-modes', paymentModeRoutes);
app.use('/data-sync', dataSyncRoutes);
app.use('/taxes', taxRoutes);
app.use('/discounts', discountRoutes);
app.use('/roundings', roundingRoutes); 
app.use('/customers', customerRoutes); 

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Orders API' });
});

// --- ERROR HANDLING MIDDLEWARE ---
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {} // Provide more detail in development
  });
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});