// routes/customers.js
const express = require('express');
const customerController = require('../controllers/customerController');

const router = express.Router();

// Define customer routes
router.get('/', customerController.getAllCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;