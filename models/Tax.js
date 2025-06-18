// models/Tax.js
const db = require('../config/db'); // Assuming you have a database connection setup

class Tax {
    /**
     * Finds all taxes for a specific tenant.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Array>} A promise that resolves to an array of tax objects.
     */
    static async findAll(tenant) { // Added tenant parameter
        const query = `
            SELECT
                id,
                name,
                description,
                amount
            FROM public.tax
            WHERE tenant = $1 -- Filter by tenant
            ORDER BY id DESC;
        `;
        const { rows } = await db.query(query, [tenant]); // Pass tenant to query
        return rows;
    }

    /**
     * Finds a tax by its ID for a specific tenant.
     * @param {number|string} id - The ID of the tax.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the tax object or undefined if not found.
     */
    static async findById(id, tenant) { // Added tenant parameter
        const query = `
            SELECT
                id,
                name,
                description,
                amount
            FROM public.tax
            WHERE id = $1 AND tenant_ = $2; -- Filter by ID AND tenant_
        `;
        const { rows } = await db.query(query, [id, tenant]); // Pass id and tenant
        return rows[0];
    }

    /**
     * Creates a new tax for a specific tenant.
     * @param {Object} taxData - The data for the new tax.
     * @param {string} taxData.name - The name of the tax.
     * @param {string} [taxData.description] - The description of the tax.
     * @param {number} taxData.amount - The tax amount/percentage.
     * @param {string} taxData.tenant - The ID of the tenant.
     * @returns {Promise<Object>} A promise that resolves to the newly created tax object.
     */
    static async create(taxData) {
        const { name, description, amount, tenant } = taxData; // Destructure tenant
        const query = `
            INSERT INTO public.tax (name, description, amount, tenant) 
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, description, amount;
        `;
        const values = [name, description, amount, tenant]; 
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Updates an existing tax for a specific tenant.
     * @param {number|string} id - The ID of the tax to update.
     * @param {Object} taxData - The data to update.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the updated tax object or undefined if not found.
     */
    static async update(id, taxData, tenant) { // Added tenant parameter
        const { name, description, amount } = taxData;
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramIndex}`);
            values.push(name);
            paramIndex++;
        }

        if (description !== undefined) {
            updates.push(`description = $${paramIndex}`);
            values.push(description);
            paramIndex++;
        }

        if (amount !== undefined) {
            updates.push(`amount = $${paramIndex}`);
            values.push(amount);
            paramIndex++;
        }

        if (updates.length === 0) {
            return null; // No fields to update
        }

        // Add id and tenant to values for WHERE clause
        values.push(id);
        values.push(tenant);

        const query = `
            UPDATE public.tax
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex} AND tenant = $${paramIndex + 1} -- Filter by ID AND tenant
            RETURNING id, name, description, amount;
        `;

        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Deletes a tax for a specific tenant.
     * @param {number|string} id - The ID of the tax to delete.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<Object|undefined>} A promise that resolves to the deleted tax object or undefined if not found.
     */
    static async delete(id, tenant) { // Added tenant parameter
        const query = `
            DELETE FROM public.tax
            WHERE id = $1 AND tenant = $2 -- Filter by ID AND tenant
            RETURNING id;
        `;
        const { rows } = await db.query(query, [id, tenant]); // Pass id and tenant
        return rows[0];
    }
}

module.exports = Tax;