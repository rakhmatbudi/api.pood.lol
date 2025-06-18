// models/User.js
const db = require('../config/db');
const bcrypt = require('bcryptjs'); // Correct import: bcryptjs (commonly used for async operations)

class User {
    /**
     * Finds all users for a specific tenant, optionally filtered by role(s) and paginated/ordered.
     * @param {string} tenantId - The ID of the tenant.
     * @param {object} [filter] - Optional filter criteria (role, roles, limit, offset, orderBy, orderDirection).
     * @param {number} [filter.role] - Single role ID to filter by.
     * @param {Array<number>} [filter.roles] - Array of role IDs to filter by.
     * @param {number} [filter.limit] - Max number of results to return.
     * @param {number} [filter.offset] - Number of results to skip.
     * @param {string} [filter.orderBy] - Column to order by (e.g., 'id', 'name').
     * @param {string} [filter.orderDirection] - Order direction ('ASC' or 'DESC').
     * @returns {Promise<Array<object>>} - A promise resolving to an array of user records (without password).
     */
    static async findAll(tenantId, filter) {
        let query = 'SELECT id, name, email, created_at, updated_at, role_id, tenant FROM public.users WHERE tenant = $1';
        const values = [tenantId];
        const conditions = [];

        let paramIndex = 2; // Start parameter indexing from $2 because $1 is tenantId

        if (filter) {
            if (filter.role) {
                conditions.push(`role_id = $${paramIndex++}`);
                values.push(filter.role);
            } else if (Array.isArray(filter.roles) && filter.roles.length > 0) {
                conditions.push(`role_id IN (${filter.roles.map((_, index) => `$${paramIndex + index}`).join(', ')})`);
                values.push(...filter.roles);
                paramIndex += filter.roles.length;
            }
        }

        if (conditions.length > 0) {
            query += ` AND ${conditions.join(' AND ')}`;
        }

        // Dynamic Ordering (with whitelisting for security)
        const allowedOrderByColumns = ['id', 'name', 'email', 'created_at', 'updated_at', 'role_id'];
        let orderByClause = ' ORDER BY id ASC'; // Default order

        if (filter && filter.orderBy && allowedOrderByColumns.includes(filter.orderBy)) {
            const orderDirection = (filter.orderDirection && filter.orderDirection.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
            orderByClause = ` ORDER BY ${filter.orderBy} ${orderDirection}`;
        }
        query += orderByClause;

        // Pagination
        let limitOffsetClause = '';
        if (filter && typeof filter.limit === 'number' && filter.limit > 0) {
            limitOffsetClause += ` LIMIT $${paramIndex++}`;
            values.push(filter.limit);
        }
        if (filter && typeof filter.offset === 'number' && filter.offset >= 0) {
            limitOffsetClause += ` OFFSET $${paramIndex++}`;
            values.push(filter.offset);
        }
        query += limitOffsetClause;

        // console.log("findAll Query:", query);
        // console.log("findAll Values:", values);

        const { rows } = await db.query(query, values);
        return rows;
    }

    /**
     * Finds a user by their email for a specific tenant.
     * @param {string} email - The email of the user.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<object | null>} - A promise resolving to the user record (including password for auth), or null.
     */
    static async findByEmail(email, tenantId) {
        const query = 'SELECT id, name, email, password, role_id, tenant, created_at, updated_at FROM public.users WHERE email = $1 AND tenant = $2';
        const { rows } = await db.query(query, [email, tenantId]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Finds a user by their ID for a specific tenant.
     * @param {string} userId - The ID of the user.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<object | null>} - A promise resolving to the user record (excluding password), or null.
     */
    static async findById(userId, tenantId) {
        const query = 'SELECT id, name, email, role_id, tenant, created_at, updated_at FROM public.users WHERE id = $1 AND tenant = $2';
        const { rows } = await db.query(query, [userId, tenantId]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Verifies a plain text password against a hashed password.
     * @param {string} plainPassword - The plain text password.
     * @param {string} hashedPassword - The hashed password from the database.
     * @returns {Promise<boolean>} - True if passwords match, false otherwise.
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Creates a new user record for a specific tenant.
     * Assumes password hashing is done *before* calling this method.
     * @param {object} userData - The user data.
     * @param {string} userData.name - The user's name.
     * @param {string} userData.email - The user's email.
     * @param {string} userData.password - The user's hashed password.
     * @param {number} [userData.role_id=2] - The user's role ID.
     * @param {string} userData.tenant_id - The ID of the tenant this user belongs to.
     * @returns {Promise<object>} - A promise resolving to the newly created user record (excluding password).
     */
    static async create(userData) { // tenantId is now part of userData.tenant_id
        // No need to hash here, it's done in the controller

        // Get current timestamp
        const now = new Date();

        // Insert the user into the database
        const query = `
            INSERT INTO public.users
            (name, email, password, role_id, tenant, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, email, role_id, tenant, created_at, updated_at
        `;

        const values = [
            userData.name,
            userData.email,
            userData.password, // Already hashed from controller
            userData.role_id || 2, // Default to role 2 if not specified (adjust as needed)
            userData.tenant_id, // Correctly use userData.tenant_id
            now,
            now
        ];

        // console.log('User.create: SQL query:', query);
        // console.log('User.create: SQL values:', values);

        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Checks if an email already exists for a specific tenant.
     * @param {string} email - The email to check.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<boolean>} - True if the email exists for the tenant, false otherwise.
     */
    static async emailExists(email, tenantId) {
        const query = 'SELECT COUNT(*) as count FROM public.users WHERE email = $1 AND tenant = $2';
        const { rows } = await db.query(query, [email, tenantId]);
        return parseInt(rows[0].count) > 0;
    }

    /**
     * Updates a user record for a specific tenant.
     * Assumes password hashing is done *before* calling this method if password is provided.
     * @param {string} id - The ID of the user to update.
     * @param {string} tenantId - The ID of the tenant.
     * @param {object} userData - The user data to update.
     * @returns {Promise<object | null>} - The updated user record (excluding password), or null if not found.
     */
    static async update(id, tenantId, userData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Dynamically build SET clause and values array
        if (userData.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(userData.name);
        }
        if (userData.email !== undefined) {
            fields.push(`email = $${paramIndex++}`);
            values.push(userData.email);
        }
        if (userData.password !== undefined) { // Password should already be hashed by controller
            fields.push(`password = $${paramIndex++}`);
            values.push(userData.password); // Use the already hashed password
        }
        if (userData.role_id !== undefined) {
            fields.push(`role_id = $${paramIndex++}`);
            values.push(userData.role_id);
        }

        if (fields.length === 0) {
            return null; // No fields to update
        }

        fields.push(`updated_at = NOW()`); // Always update timestamp

        // Add WHERE clause parameters at the end of values array
        values.push(id); // This will be $paramIndex for the id
        values.push(tenantId); // This will be $paramIndex + 1 for the tenant

        const query = `
            UPDATE public.users
            SET ${fields.join(', ')}
            WHERE id = $${paramIndex++} AND tenant = $${paramIndex++}
            RETURNING id, name, email, role_id, tenant, created_at, updated_at
        `;
        // Corrected paramIndex for WHERE clause referencing the final values in the array
        const correctQuery = `
            UPDATE public.users
            SET ${fields.join(', ')}
            WHERE id = $${values.length - 1} AND tenant = $${values.length}
            RETURNING id, name, email, role_id, tenant, created_at, updated_at
        `;

        // console.log("Update Query:", correctQuery);
        // console.log("Update Values:", values);

        const { rows } = await db.query(correctQuery, values);
        return rows[0] || null;
    }

    /**
     * Deletes a user record for a specific tenant.
     * @param {string} id - The ID of the user to delete.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<number>} - The number of rows deleted (0 or 1).
     */
    static async delete(id, tenantId) {
        const query = 'DELETE FROM public.users WHERE id = $1 AND tenant = $2'; // Removed RETURNING
        const { rowCount } = await db.query(query, [id, tenantId]);
        return rowCount; // Returns 1 if deleted, 0 if not found/not in tenant
    }
}

module.exports = User;