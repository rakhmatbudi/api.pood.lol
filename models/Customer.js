const db = require('../config/db'); // Import the database utility with pg.query

class Customer {
    constructor(id, name, phone_number, email, last_visit, tenant) { // Add tenant to constructor
        this.id = id;
        this.name = name;
        this.phone_number = phone_number;
        this.email = email;
        this.last_visit = last_visit;
        this.tenant = tenant; // Store tenant as a property
    }

    /**
     * Finds all customers for a specific tenant.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Array<Customer>>} A promise that resolves to an array of Customer instances.
     */
    static async findAll(tenant) { // Add tenant parameter
        try {
            const result = await db.query(
                'SELECT id, name, phone_number, email, last_visit, tenant FROM customer WHERE tenant = $1', // Filter by tenant
                [tenant]
            );
            return result.rows.map(row => new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit, row.tenant));
        } catch (error) {
            console.error("Error in Customer.findAll:", error);
            throw error;
        }
    }

    /**
     * Finds a customer by ID for a specific tenant.
     * @param {number|string} id - The ID of the customer.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Customer|null>} A promise that resolves to a Customer instance or null if not found.
     */
    static async findById(id, tenant) { // Add tenant parameter
        try {
            const result = await db.query(
                'SELECT id, name, phone_number, email, last_visit, tenant FROM customer WHERE id = $1 AND tenant = $2', // Filter by ID AND tenant
                [id, tenant]
            );
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit, row.tenant);
        } catch (error) {
            console.error(`Error in Customer.findById(${id}, ${tenant}):`, error);
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
     * @param {string} customerData.tenant - The ID of the tenant.
     * @returns {Promise<Customer>} A promise that resolves to the newly created Customer instance.
     */
    static async createCustomer(customerData) {
        const { name, phone_number, email, last_visit, tenant } = customerData; // Destructure tenant
        try {
            const result = await db.query(
                'INSERT INTO customer (name, phone_number, email, last_visit, tenant) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, phone_number, email, last_visit, tenant', // Add tenant to INSERT
                [name, phone_number, email, last_visit, tenant] // Add tenant to values
            );
            const row = result.rows[0];
            return new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit, row.tenant);
        } catch (error) {
            console.error("Error in Customer.createCustomer:", error);
            throw error;
        }
    }

    /**
     * Updates an existing customer for a specific tenant.
     * @param {number|string} id - The ID of the customer to update.
     * @param {Object} customerData - The data to update.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Customer|null>} A promise that resolves to the updated Customer instance or null if not found.
     */
    static async updateCustomer(id, customerData, tenant) { // Add tenant parameter
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
        values.push(tenant); // Add tenant for the WHERE clause, will be paramIndex + 1

        const query = `UPDATE customer SET ${fields.join(', ')} WHERE id = $${paramIndex} AND tenant = $${paramIndex + 1} RETURNING id, name, phone_number, email, last_visit, tenant`;

        try {
            const result = await db.query(query, values);
            if (result.rows.length === 0) {
                return null; // Customer not found for this ID and tenant
            }
            const row = result.rows[0];
            return new Customer(row.id, row.name, row.phone_number, row.email, row.last_visit, row.tenant);
        } catch (error) {
            console.error(`Error in Customer.updateCustomer(${id}, ${tenant}):`, error);
            throw error;
        }
    }

    /**
     * Deletes a customer for a specific tenant.
     * @param {number|string} id - The ID of the customer to delete.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<boolean>} A promise that resolves to true if deleted, false if not found.
     */
    static async deleteCustomer(id, tenant) { // Add tenant parameter
        try {
            const result = await db.query(
                'DELETE FROM customer WHERE id = $1 AND tenant = $2 RETURNING id', // Filter by ID AND tenant
                [id, tenant]
            );
            return result.rows.length > 0; // true if deleted, false if not found (for the given tenant)
        } catch (error) {
            console.error(`Error in Customer.deleteCustomer(${id}, ${tenant}):`, error);
            throw error;
        }
    }
}

module.exports = Customer;