// models/Tenant.js
const db = require('../config/db');

class Tenant {
    /**
     * Finds a tenant by its tenant_code (referred to as 'tenant' in application logic).
     * @param {string} tenant - The unique code of the tenant.
     * @returns {Promise<object | null>} - A promise resolving to the tenant record, or null if not found.
     */
    static async findByTenantCode(tenant) { // Renamed for clarity, but you'll call it with the 'tenant' variable
        const query = 'SELECT id, tenant_code, name, created_at, updated_at FROM public.tenant WHERE tenant_code = $1';
        const { rows } = await db.query(query, [tenant]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Finds a tenant by its internal ID (serial).
     * This might be useful for internal lookups.
     * @param {number} id - The internal ID of the tenant.
     * @returns {Promise<object | null>}
     */
    static async findById(id) {
        const query = 'SELECT id, tenant_code, name, created_at, updated_at FROM public.tenant WHERE id = $1';
        const { rows } = await db.query(query, [id]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Creates a new tenant record.
     * `id` is serial and will be auto-generated.
     * @param {object} tenantData - The tenant data.
     * @param {string} tenantData.tenant - The tenant's unique code.
     * @param {string} tenantData.name - The tenant's name.
     * @returns {Promise<object>} - A promise resolving to the newly created tenant record.
     */
    static async create(tenantData) {
        const now = new Date();
        const query = `
            INSERT INTO public.tenant
            (tenant_code, name, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, tenant_code, name, created_at, updated_at
        `;
        const values = [
            tenantData.tenant, // Expecting tenantData.tenant to be the tenant_code
            tenantData.name,
            now,
            now
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    }
}

module.exports = Tenant;