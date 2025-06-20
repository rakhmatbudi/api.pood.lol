// controllers/userController.js
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const bcrypt = require('bcryptjs');

const TOKEN_EXPIRES_IN = '12h'; // 12 hours

// --- Controller Functions ---

exports.getUserList = async (req, res) => {
    // req.tenant is now guaranteed to be set by tenantResolverMiddleware for this authenticated route.
    const tenant = req.tenant;

    // Authorization: Only administrators (role_id 1) can list all users.
    // Ensure you have a central place for role IDs (e.g., a constants file or an enum)
    // For now, assuming ADMIN role_id is 1
    if (req.user.role_id !== 1) { // <-- CORRECTED: Use req.user.role_id
        return res.status(403).json({ status: 'error', message: 'Forbidden: Only administrators can view the user list.' });
    }

    try {
        const { role, limit, offset, orderBy, orderDirection } = req.query;
        const filter = {};
        if (role) filter.role = role;
        if (limit) filter.limit = parseInt(limit, 10);
        if (offset) filter.offset = parseInt(offset, 10);
        if (orderBy) filter.orderBy = orderBy;
        if (orderDirection) filter.orderDirection = orderDirection;

        const users = await User.findAll(tenant, filter);

        res.status(200).json({
            status: 'success',
            count: users.length,
            data: { users },
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch users',
            error: process.env.NODE_ENV === 'development' ? error.message : {},
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide email and password',
            });
        }

        // 1. Find user globally by email (tenant is unknown at this point for login)
        const user = await User.findByEmailGlobally(email);

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials', // Generic message to prevent user enumeration
            });
        }

        // 2. Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials', // Generic message
            });
        }

        // 3. Retrieve Tenant Information using the tenant_code found on the user record
        const tenantInfo = await Tenant.findByTenantCode(user.tenant); // user.tenant is the tenant_code
        if (!tenantInfo) {
            console.error(`Data inconsistency: User ${user.id} belongs to non-existent tenant_code ${user.tenant}`);
            return res.status(500).json({
                status: 'error',
                message: 'Login failed: Tenant information not found for this user.'
            });
        }

        // Removed: req.tenant = user.tenant; // This line is not strictly needed for this flow

        // 4. Generate JWT Token (payload includes tenant_code from user record)
        const token = jwt.sign(
            { id: user.id, email: user.email, role_id: user.role_id, tenant: user.tenant }, // <-- CORRECTED: use role_id directly from user model
            process.env.JWT_SECRET,
            { expiresIn: TOKEN_EXPIRES_IN }
        );

        // Remove password hash before sending user object to client
        delete user.password;

        res.status(200).json({
            status: 'success',
            data: {
                user,
                tenant: tenantInfo, // Include full tenant object in the response
                token,
            },
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({
            status: 'error',
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : {},
        });
    }
};

exports.createUser = async (req, res) => {
    // req.tenant is now guaranteed to be set by tenantResolverMiddleware for this authenticated route.
    const tenant = req.tenant; // Use req.tenant directly

    // Authorization: Only administrators (role_id 1) can create new users,
    // and they can only create users within their own tenant.
    // tenantResolverMiddleware ensures req.user and req.tenant are present.
    if (req.user.role_id !== 1 || req.user.tenant !== tenant) { // <-- CORRECTED: Use req.user.role_id
        return res.status(403).json({ status: 'error', message: 'Forbidden: You do not have permission to create users.' });
    }

    try {
        const schema = Joi.object({
            name: Joi.string().required().min(2).max(100),
            email: Joi.string().email().required(),
            password: Joi.string().required().min(8),
            role_id: Joi.number().integer().min(1).required() // role_id should be required for new user
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid input data',
                error: error.details[0].message
            });
        }

        // Check if email already exists within THIS TENANT (from req.tenant)
        // CRITICAL: Ensure User.emailExists method is tenant-scoped (e.g., WHERE email = $1 AND tenant = $2)
        const emailExists = await User.emailExists(value.email, tenant);
        if (emailExists) {
            return res.status(400).json({
                status: 'error',
                message: 'Email is already in use for this tenant.'
            });
        }

        // Verify the tenant actually exists (it should, as req.tenant is from an authenticated user)
        const tenantInfo = await Tenant.findByTenantCode(tenant);
        if (!tenantInfo) {
            console.error(`Internal error: Authenticated user's tenant code '${tenant}' not found in database.`);
            return res.status(500).json({
                status: 'error',
                message: 'Internal server error: Associated tenant information missing.'
            });
        }

        value.password = await bcrypt.hash(value.password, 10);

        // Create the new user, linking via the tenant from req.tenant
        const newUser = await User.create({ ...value, tenant: tenant });

        delete newUser.password;

        res.status(201).json({
            status: 'success',
            data: {
                user: newUser,
                tenant: tenantInfo
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create user',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

/**
 * Update an existing user by ID within a specific tenant.
 */
exports.updateUser = async (req, res) => {
    // req.tenant is now guaranteed to be set by tenantResolverMiddleware for this authenticated route.
    const tenant = req.tenant; // Use req.tenant directly

    // Authorization check (tenantResolverMiddleware ensures req.user and req.tenant exist)
    const userId = req.params.id;
    // Admin can update any user in their tenant; user can only update themselves.
    if (req.user.role_id !== 1 && String(req.user.id) !== userId) { // <-- CORRECTED: Use req.user.role_id
        return res.status(403).json({
            status: 'error',
            message: 'Forbidden: You can only update your own profile unless you are an administrator.'
        });
    }

    try {
        const schema = Joi.object({
            name: Joi.string().min(2).max(100).optional(),
            email: Joi.string().email().optional(),
            password: Joi.string().min(8).optional(),
            role_id: Joi.number().integer().min(1).optional()
        }).min(1).messages({
            'object.min': 'At least one field (name, email, password, or role_id) must be provided for update.'
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid input data for update',
                error: error.details[0].message
            });
        }

        if (value.email) {
            // Check uniqueness within req.tenant, excluding the current user being updated.
            // CRITICAL: Ensure User.findByEmail method is tenant-scoped (e.g., WHERE email = $1 AND tenant = $2)
            const existingUserWithEmail = await User.findByEmail(value.email, tenant);
            if (existingUserWithEmail && String(existingUserWithEmail.id) !== userId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email is already in use by another user in this tenant.'
                });
            }
        }

        if (value.password) {
            value.password = await bcrypt.hash(value.password, 10);
        }

        // Pass userId, tenant, and the update data to the User model
        const updatedUser = await User.update(userId, tenant, value);

        if (!updatedUser) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or does not belong to this tenant, or no valid fields to update.'
            });
        }

        delete updatedUser.password;

        res.status(200).json({
            status: 'success',
            message: 'User updated successfully',
            data: { user: updatedUser }
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update user',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

/**
 * Delete a user by ID within a specific tenant.
 */
exports.deleteUser = async (req, res) => {
    // req.tenant is now guaranteed to be set by tenantResolverMiddleware for this authenticated route.
    const tenant = req.tenant; // Use req.tenant directly

    // Authorization check (tenantResolverMiddleware ensures req.user and req.tenant exist)
    const userId = req.params.id;
    // Only administrators (role_id 1) can delete users.
    if (req.user.role_id !== 1) { // <-- CORRECTED: Use req.user.role_id
        return res.status(403).json({
            status: 'error',
            message: 'Forbidden: Only administrators can delete users.'
        });
    }
    // Prevent a user from deleting their own account.
    if (String(req.user.id) === userId) {
        return res.status(403).json({
            status: 'error',
            message: 'Forbidden: You cannot delete your own account.'
        });
    }

    try {
        // Pass userId and tenant to the User model
        const deletedCount = await User.delete(userId, tenant);

        if (deletedCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found or does not belong to this tenant.'
            });
        }

        res.status(204).send(); // 204 No Content for successful deletion

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete user',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};