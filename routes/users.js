// routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware'); // <-- NEW MIDDLEWARE

// --- Endpoints ---

// GET /users - Get a list of users, optionally filtered by role (tenant-scoped)
// Order: authMiddleware (populates req.user) -> tenantResolverMiddleware (populates req.tenant) -> Controller
router.get('/', authMiddleware, tenantResolverMiddleware, userController.getUserList);

// POST /users/login - User login (global login, tenant derived from user record)
// Tenant is derived *within* the controller function and then explicitly set on req.tenant.
router.post('/login', userController.login);

// POST /users - Create a new user (tenant-scoped creation)
// Order: authMiddleware (populates req.user) -> tenantResolverMiddleware (populates req.tenant) -> Controller
router.post('/', authMiddleware, tenantResolverMiddleware, userController.createUser);

// PUT /users/:id - Update an existing user by ID (tenant-scoped update)
// Order: authMiddleware (populates req.user) -> tenantResolverMiddleware (populates req.tenant) -> Controller
router.put('/:id', authMiddleware, tenantResolverMiddleware, userController.updateUser);

// DELETE /users/:id - Delete a user by ID (tenant-scoped deletion)
// Order: authMiddleware (populates req.user) -> tenantResolverMiddleware (populates req.tenant) -> Controller
router.delete('/:id', authMiddleware, tenantResolverMiddleware, userController.deleteUser);

module.exports = router;