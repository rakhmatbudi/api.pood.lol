const db = require('../config/db'); // Import the database utility with pg.query

class Customer {
    constructor(id, name, phone_number, email, last_visit, tenant_id) { // Add tenant_id to constructor
        this.id = id;
        this.name = name;
        this.phone_number = phone_number;
        this.email = email;
        this.last_visit = last_visit;
        this.tenant_id = tenant_id; // Store tenant_id as a property
    }

    /**
     * Finds all customers for a specific tenant.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Array<Customer>>} A promise that resolves to an array of Customer instances.
     */
    static async findAll(tenantId) { // Add tenantId parameter
        try {
            const result = await db.query(
                'SELECT id, name, phone_number, email, last_visit, tenant_id FROM customer WHERE tenant_id = $1', // Filter by tenant_id
                [tenantId]
            );
            return result.rows.map(row => new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit, row.tenant_id));
        } catch (error) {
            console.error("Error in Customer.findAll:", error);
            throw error;
        }
    }

    /**
     * Finds a customer by ID for a specific tenant.
     * @param {number|string} id - The ID of the customer.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Customer|null>} A promise that resolves to a Customer instance or null if not found.
     */
    static async findById(id, tenantId) { // Add tenantId parameter
        try {
            const result = await db.query(
                'SELECT id, name, phone_number, email, last_visit, tenant_id FROM customer WHERE id = $1 AND tenant_id = $2', // Filter by ID AND tenant_id
                [id, tenantId]
            );
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit, row.tenant_id);
        } catch (error) {
            console.error(`Error in Customer.findById(${id}, ${tenantId}):`, error);
            throw error;
        }
    }

    /**
     * Creates a new customer for a specific tenant.
     * @param {Object} customerData - The data for the new customer.
     * @param {string} customerData.name - Customer's name.
     * @param {string} customerData.phone_number - Customer's phone number.
     * @param {string} [customerData.email] - Customer's email.
     * @param {Date} [customerData.last_visit] - Date of last visit.
     * @param {string} customerData.tenant_id - The ID of the tenant.
     * @returns {Promise<Customer>} A promise that resolves to the newly created Customer instance.
     */
    static async createCustomer(customerData) {
        const { name, phone_number, email, last_visit, tenant_id } = customerData; // Destructure tenant_id
        try {
            const result = await db.query(
                'INSERT INTO customer (name, phone_number, email, last_visit, tenant_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, phone_number, email, last_visit, tenant_id', // Add tenant_id to INSERT
                [name, phone_number, email, last_visit, tenant_id] // Add tenant_id to values
            );
            const row = result.rows[0];
            return new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit, row.tenant_id);
        } catch (error) {
            console.error("Error in Customer.createCustomer:", error);
            throw error;
        }
    }

    /**
     * Updates an existing customer for a specific tenant.
     * @param {number|string} id - The ID of the customer to update.
     * @param {Object} customerData - The data to update.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<Customer|null>} A promise that resolves to the updated Customer instance or null if not found.
     */
    static async updateCustomer(id, customerData, tenantId) { // Add tenantId parameter
        const fields = [];
        const values = [];
        let paramIndex = 1;

        for (const key in customerData) {
            if (Object.prototype.hasOwnProperty.call(customerData, key)) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(customerData[key]);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return null; // No fields to update
        }

        values.push(id); // Add ID for the WHERE clause
        values.push(tenantId); // Add tenantId for the WHERE clause, will be paramIndex + 1

        const query = `UPDATE customer SET ${fields.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} RETURNING id, name, phone_number, email, last_visit, tenant_id`;

        try {
            const result = await db.query(query, values);
            if (result.rows.length === 0) {
                return null; // Customer not found for this ID and tenant
            }
            const row = result.rows[0];
            return new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit, row.tenant_id);
        } catch (error) {
            console.error(`Error in Customer.updateCustomer(${id}, ${tenantId}):`, error);
            throw error;
        }
    }

    /**
     * Deletes a customer for a specific tenant.
     * @param {number|string} id - The ID of the customer to delete.
     * @param {string} tenantId - The ID of the tenant.
     * @returns {Promise<boolean>} A promise that resolves to true if deleted, false if not found.
     */
    static async deleteCustomer(id, tenantId) { // Add tenantId parameter
        try {
            const result = await db.query(
                'DELETE FROM customer WHERE id = $1 AND tenant_id = $2 RETURNING id', // Filter by ID AND tenant_id
                [id, tenantId]
            );
            return result.rows.length > 0; // true if deleted, false if not found (for the given tenant)
        } catch (error) {
            console.error(`Error in Customer.deleteCustomer(${id}, ${tenantId}):`, error);
            throw error;
        }
    }
}

module.exports = Customer;