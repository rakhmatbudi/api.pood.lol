// routes/customers.js
const express = require('express');
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); 

const router = express.Router();

// Define customer routes
router.get('/', authMiddleware, tenantResolverMiddleware, customerController.getAllCustomers); // Added authMiddleware, tenantResolverMiddleware
router.get('/:id', authMiddleware, tenantResolverMiddleware, customerController.getCustomerById); // Added authMiddleware, tenantResolverMiddleware
router.post('/', authMiddleware, tenantResolverMiddleware, customerController.createCustomer); // Added authMiddleware, tenantResolverMiddleware
router.put('/:id', authMiddleware, tenantResolverMiddleware, customerController.updateCustomer); // Added authMiddleware, tenantResolverMiddleware
router.delete('/:id', authMiddleware, tenantResolverMiddleware, customerController.deleteCustomer); // Added authMiddleware, tenantResolverMiddleware

module.exports = router;