// controllers/userController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing

/**
 * Helper to ensure tenant is present
 */
const gettenant = (req, res) => {
    const tenant = req.tenant; // Assuming tenant is attached by middleware
    if (!tenant) {
        res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        return null;
    }
    return tenant;
};

exports.getUserList = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return;

    try {
        const { role, limit, offset, orderBy, orderDirection } = req.query; // Added pagination/ordering params

        const filter = {}; // Initialize an empty filter object

        if (role) {
            filter.role = role;
        }
        if (limit) {
            filter.limit = parseInt(limit, 10);
        }
        if (offset) {
            filter.offset = parseInt(offset, 10);
        }
        if (orderBy) {
            filter.orderBy = orderBy;
        }
        if (orderDirection) {
            filter.orderDirection = orderDirection;
        }

        const users = await User.findAll(tenant, filter); // Pass tenant separately

        res.status(200).json({
            status: 'success',
            count: users.length,
            data: {
                users,
            },
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
    const tenant = gettenant(req, res); // Get tenant for login scope
    if (!tenant) return;

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide email and password',
            });
        }

        // Find user by email AND tenant
        const user = await User.findByEmail(email, tenant);

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials', // Generic message to prevent email enumeration
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password); // Use bcrypt.compare

        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid credentials', // Generic message
            });
        }

        // Include tenant in JWT payload for future authenticated requests
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role_id, tenant: user.tenant },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Remove password hash before sending user object to client
        delete user.password;

        res.status(200).json({
            status: 'success',
            data: {
                user,
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
    const tenant = gettenant(req, res);
    if (!tenant) return;

    try {
        const schema = Joi.object({
            name: Joi.string().required().min(2).max(100),
            email: Joi.string().email().required(),
            password: Joi.string().required().min(8),
            role_id: Joi.number().integer().min(1)
        });

        const { error, value } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid input data',
                error: error.details[0].message
            });
        }

        // Pass tenant to emailExists to scope the check
        const emailExists = await User.emailExists(value.email, tenant);
        if (emailExists) {
            return res.status(400).json({
                status: 'error',
                message: 'Email is already in use for this tenant.' // More specific message
            });
        }

        // Hash the password before sending it to the model
        value.password = await bcrypt.hash(value.password, 10);

        // Create the new user with tenant
        const newUser = await User.create({ ...value, tenant: tenant });

        // Include tenant in the token payload for consistency
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, role: newUser.role_id, tenant: newUser.tenant },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // Remove password hash before sending user object to client
        delete newUser.password;

        res.status(201).json({
            status: 'success',
            data: {
                user: newUser,
                token
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
    const tenant = gettenant(req, res);
    if (!tenant) return;

    const userId = req.params.id; // User ID from the URL parameter

    try {
        // Joi validation for update: fields are optional but at least one must be present
        const schema = Joi.object({
            name: Joi.string().min(2).max(100).optional(),
            email: Joi.string().email().optional(),
            password: Joi.string().min(8).optional(), // Password update handled separately
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

        // --- Authorization Check (Example - highly recommended) ---
        // Assuming you have an authentication middleware that populates req.user
        // This is a basic example; adjust based on your actual roles and permissions.
        // E.g., only an admin (role_id 1) or the user themselves can update their profile.
        /*
        if (!req.user || (req.user.role_id !== 1 && String(req.user.id) !== userId)) {
            return res.status(403).json({
                status: 'error',
                message: 'Forbidden: You do not have permission to update this user.'
            });
        }
        */
        // --- End Authorization Check ---


        // If email is being updated, check for uniqueness within the tenant
        if (value.email) {
            const existingUserWithEmail = await User.findByEmail(value.email, tenant);
            // If an email exists AND it belongs to a different user (not the one being updated)
            if (existingUserWithEmail && String(existingUserWithEmail.id) !== userId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Email is already in use by another user in this tenant.'
                });
            }
        }

        // Hash new password if provided in the update payload
        if (value.password) {
            value.password = await bcrypt.hash(value.password, 10);
        }

        // Call the User model's update method
        const updatedUser = await User.update(userId, tenant, value);

        if (!updatedUser) {
            // This means the user was not found within the specified tenant,
            // or no valid fields were provided for update.
            return res.status(404).json({
                status: 'error',
                message: 'User not found or does not belong to this tenant, or no valid fields to update.'
            });
        }

        // Remove password hash before sending user object to client
        delete updatedUser.password;

        res.status(200).json({
            status: 'success',
            message: 'User updated successfully',
            data: {
                user: updatedUser
            }
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
    const tenant = gettenant(req, res);
    if (!tenant) return;

    const userId = req.params.id; // User ID from the URL parameter

    try {
        // --- Authorization Check (Example - highly recommended) ---
        // Only allow specific roles (e.g., admin) to delete users.
        // Prevent a user from deleting themselves (unless that's an explicit feature).
        /*
        if (!req.user || req.user.role_id !== 1) { // Assuming role_id 1 is admin
            return res.status(403).json({
                status: 'error',
                message: 'Forbidden: You do not have permission to delete users.'
            });
        }
        if (String(req.user.id) === userId) {
            return res.status(403).json({
                status: 'error',
                message: 'Forbidden: You cannot delete your own account.'
            });
        }
        */
        // --- End Authorization Check ---

        // Call the User model's delete method
        const deletedCount = await User.delete(userId, tenant);

        if (deletedCount === 0) {
            // User not found within the specified tenant, or already deleted
            return res.status(404).json({
                status: 'error',
                message: 'User not found or does not belong to this tenant.'
            });
        }

        // 204 No Content for successful deletion with no body
        res.status(204).send();

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete user',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};