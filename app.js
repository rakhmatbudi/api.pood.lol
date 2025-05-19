const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

require('dotenv').config();

const orderRoutes = require('./routes/orders');
const cashierSessionRoutes = require('./routes/cashierSessions');
const userRoutes = require('./routes/users');
const cashDenominationRoutes = require('./routes/cashDenominations');
const menuItemRoutes = require('./routes/menuItems');
const paymentRoutes = require('./routes/payments');
const paymentModeRoutes = require('./routes/paymentModes');
const dataSyncRoutes = require('./routes/dataSyncServices');
const taxRoutes = require('./routes/taxes'); // Import the new tax route

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/orders', orderRoutes);
app.use('/cashier-sessions', cashierSessionRoutes);
app.use('/users', userRoutes);
app.use('/cash-denominations', cashDenominationRoutes);
app.use('/menu-items', menuItemRoutes);
app.use('/payments', paymentRoutes);
app.use('/payment-modes', paymentModeRoutes);
app.use('/data-sync', dataSyncRoutes);
app.use('/taxes', taxRoutes); // Use the new tax route

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Orders API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});