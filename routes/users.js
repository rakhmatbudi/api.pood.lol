const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware

// GET /users - Get a list of users, optionally filtered by role (tenant-scoped)
router.get('/', getTempTenantId, userController.getUserList); // Added getTempTenantId

// POST /users/login - User login (tenant-scoped login)
// The login process would typically involve verifying credentials AND the tenant.
// The tenantId from the header would help in routing or user lookup within that tenant's scope.
router.post('/login', getTempTenantId, userController.login); // Added getTempTenantId

// POST /users - Create a new user (tenant-scoped creation)
// New users created via this endpoint would be associated with the tenant from the header.
router.post('/', getTempTenantId, userController.createUser); // Added getTempTenantId

module.exports = router;