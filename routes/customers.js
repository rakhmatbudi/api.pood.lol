// routes/customers.js
const express = require('express');
const customerController = require('../controllers/customerController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware

const router = express.Router();

// Define customer routes
router.get('/', getTempTenantId, customerController.getAllCustomers); // Added getTempTenantId
router.get('/:id', getTempTenantId, customerController.getCustomerById); // Added getTempTenantId
router.post('/', getTempTenantId, customerController.createCustomer); // Added getTempTenantId
router.put('/:id', getTempTenantId, customerController.updateCustomer); // Added getTempTenantId
router.delete('/:id', getTempTenantId, customerController.deleteCustomer); // Added getTempTenantId

module.exports = router;