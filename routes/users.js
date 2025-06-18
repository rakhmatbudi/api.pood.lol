const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware');

// --- Existing Endpoints ---

// GET /users - Get a list of users, optionally filtered by role (tenant-scoped)
router.get('/', getTempTenantId, userController.getUserList);

// POST /users/login - User login (tenant-scoped login)
router.post('/login', getTempTenantId, userController.login);

// POST /users - Create a new user (tenant-scoped creation)
router.post('/', getTempTenantId, userController.createUser);

// --- New Endpoints ---

// PUT /users/:id - Update an existing user by ID (tenant-scoped update)
// This endpoint allows updating user details. It should ensure that:
// 1. Only users belonging to the current tenant can be updated.
// 2. The user attempting the update has the necessary permissions.
// 3. Sensitive fields like 'password' might have separate update endpoints or require special handling.
router.put('/:id', getTempTenantId, userController.updateUser);

// DELETE /users/:id - Delete a user by ID (tenant-scoped deletion)
// This endpoint allows deleting a user. It should ensure that:
// 1. Only users belonging to the current tenant can be deleted.
// 2. The user attempting the deletion has the necessary permissions (e.g., admin role).
// 3. A user cannot delete themselves (unless explicitly allowed).
router.delete('/:id', getTempTenantId, userController.deleteUser);

module.exports = router;