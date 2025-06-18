// models/MenuItem.js
const db = require('../config/db');
const MenuItemVariant = require('./MenuItemVariant'); // Assuming this also becomes multi-tenant aware

class MenuItem {
    // Multi-tenant Ready: findAll
    static async findAll(tenant, includeInactive = false) {
        if (!tenant) {
            throw new Error('Tenant ID is required to find all menu items.');
        }

        let whereClauses = ['mi.tenant = $1']; // Start with tenant filter
        const values = [tenant];
        let paramIndex = 2; // Next parameter index for other conditions

        if (!includeInactive) {
            whereClauses.push(`mi.is_active = $${paramIndex++}`);
            values.push(true);
        }

        const whereCondition = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const query = `
            SELECT
                mi.id AS menu_item_id,
                mi.name AS menu_item_name,
                mi.description AS menu_item_description,
                mi.price AS menu_item_price,
                mi.is_active AS menu_item_is_active,
                mi.image_path AS menu_item_image_path,
                mi.created_at AS menu_item_created_at,
                mi.updated_at AS menu_item_updated_at,
                mi.tenant AS menu_item_tenant, -- Include tenant in select
                mc.id AS category_id,
                mc.name AS category_name,
                mc.description AS category_description,
                mc.tenant AS category_tenant, -- Include tenant in select
                CASE
                    WHEN COUNT(miv.id) = 0 THEN '[]'::json
                    ELSE json_agg(
                        json_build_object(
                            'id', miv.id,
                            'name', miv.name,
                            'price', miv.price,
                            'is_active', miv.is_active,
                            'created_at', miv.created_at,
                            'updated_at', miv.updated_at,
                            'tenant', miv.tenant -- Include tenant for variants
                        ) ORDER BY miv.name
                    )
                END AS variants
            FROM
                menu_items mi
            JOIN
                menu_categories mc ON mi.category_id = mc.id AND mi.tenant = mc.tenant -- Join on tenant too!
            LEFT JOIN
                menu_item_variants miv ON mi.id = miv.menu_item_id AND mi.tenant = miv.tenant -- Join on tenant too!
            ${whereCondition}
            GROUP BY
                mi.id, mi.name, mi.description, mi.price, mi.is_active, mi.image_path, mi.created_at, mi.updated_at, mi.tenant,
                mc.id, mc.name, mc.description, mc.tenant
            ORDER BY
                mi.name ASC;
        `;
        const { rows } = await db.query(query, values);

        return rows.map(row => ({
            id: row.menu_item_id,
            name: row.menu_item_name,
            description: row.menu_item_description,
            price: row.menu_item_price,
            is_active: row.menu_item_is_active,
            image_path: row.menu_item_image_path,
            created_at: row.menu_item_created_at,
            updated_at: row.menu_item_updated_at,
            tenant: row.menu_item_tenant, // Expose tenant
            category: {
                id: row.category_id,
                name: row.category_name,
                description: row.category_description,
                tenant: row.category_tenant // Expose tenant
            },
            variants: row.variants
        }));
    }

    // Multi-tenant Ready: findById
    static async findById(id, tenant) {
        if (!tenant) {
            throw new Error('Tenant is required to find a menu item by ID.');
        }

        const query = `
            SELECT
                mi.id,
                mi.name,
                mi.description,
                mi.price,
                mi.is_active,
                mi.image_path,
                mi.created_at,
                mi.updated_at,
                mi.tenant, -- Select tenant
                mc.id AS category_id,
                mc.name AS category_name,
                mc.description AS category_description,
                mc.tenant AS category_tenant -- Select tenant
            FROM menu_items mi
            JOIN menu_categories mc ON mi.category_id = mc.id AND mi.tenant = mc.tenant -- Join on tenant
            WHERE mi.id = $1 AND mi.tenant = $2; -- Filter by tenant
        `;
        const { rows: menuItemRows } = await db.query(query, [id, tenant]);
        const menuItem = menuItemRows[0];

        if (menuItem) {
            // Pass tenant to MenuItemVariant method
            const variants = await MenuItemVariant.findByMenuItemId(menuItem.id, tenant);
            return { ...menuItem, variants };
        }
        return undefined;
    }

    // Multi-tenant Ready: findByCategoryId
    static async findByCategoryId(categoryId, tenant, includeInactive = false) {
        if (!tenant) {
            throw new Error('Tenant ID is required to find menu items by category ID.');
        }

        let whereClauses = [`mi.category_id = $1`, `mi.tenant = $2`];
        const values = [categoryId, tenant];
        let paramIndex = 3;

        if (!includeInactive) {
            whereClauses.push(`mi.is_active = $${paramIndex++}`);
            values.push(true);
        }

        const whereCondition = `WHERE ${whereClauses.join(' AND ')}`;

        const query = `
            SELECT
                mi.id AS menu_item_id,
                mi.name AS menu_item_name,
                mi.description AS menu_item_description,
                mi.price AS menu_item_price,
                mi.is_active AS menu_item_is_active,
                mi.image_path AS menu_item_image_path,
                mi.created_at AS menu_item_created_at,
                mi.updated_at AS menu_item_updated_at,
                mi.tenant AS menu_item_tenant,
                mc.id AS category_id,
                mc.name AS category_name,
                mc.description AS category_description,
                mc.tenant AS category_tenant,
                CASE
                    WHEN COUNT(miv.id) = 0 THEN '[]'::json
                    ELSE json_agg(
                        json_build_object(
                            'id', miv.id,
                            'name', miv.name,
                            'price', miv.price,
                            'is_active', miv.is_active,
                            'created_at', miv.created_at,
                            'updated_at', miv.updated_at,
                            'tenant', miv.tenant
                        ) ORDER BY miv.name
                    )
                END AS variants
            FROM
                menu_items mi
            JOIN
                menu_categories mc ON mi.category_id = mc.id AND mi.tenant = mc.tenant
            LEFT JOIN
                menu_item_variants miv ON mi.id = miv.menu_item_id AND mi.tenant = miv.tenant
            ${whereCondition}
            GROUP BY
                mi.id, mi.name, mi.description, mi.price, mi.is_active, mi.image_path, mi.created_at, mi.updated_at, mi.tenant,
                mc.id, mc.name, mc.description, mc.tenant
            ORDER BY
                mi.name ASC;
        `;
        const { rows } = await db.query(query, values);

        return rows.map(row => ({
            id: row.menu_item_id,
            name: row.menu_item_name,
            description: row.menu_item_description,
            price: row.menu_item_price,
            is_active: row.menu_item_is_active,
            image_path: row.menu_item_image_path,
            created_at: row.menu_item_created_at,
            updated_at: row.menu_item_updated_at,
            tenant: row.menu_item_tenant,
            category: {
                id: row.category_id,
                name: row.category_name,
                description: row.category_description,
                tenant: row.category_tenant
            },
            variants: row.variants
        }));
    }

    // Multi-tenant Ready: create
    static async create(menuItemData) {
        const { name, description, price, category_id, is_active, image_path, tenant } = menuItemData;
        
        if (!tenant) {
            throw new Error('Tenant ID is required to create a menu item.');
        }

        const query = `
            INSERT INTO menu_items (name, description, price, category_id, is_active, image_path, tenant)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [name, description, price, category_id, is_active, image_path, tenant];
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    // Multi-tenant Ready: update
    static async update(id, menuItemData, tenant) {
        if (!tenant) {
            throw new Error('Tenant ID is required to update a menu item.');
        }

        const { name, description, price, category_id, is_active, image_path } = menuItemData;
        const query = `
            UPDATE menu_items
            SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                price = COALESCE($3, price),
                category_id = COALESCE($4, category_id),
                is_active = COALESCE($5, is_active),
                image_path = COALESCE($6, image_path),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7 AND tenant = $8 -- Filter by tenant
            RETURNING *;
        `;
        const values = [name, description, price, category_id, is_active, image_path, id, tenant];
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    // Multi-tenant Ready: delete
    static async delete(id, tenan) {
        if (!tenant) {
            throw new Error('Tenant ID is required to delete a menu item.');
        }
        const query = 'DELETE FROM menu_items WHERE id = $1 AND tenant = $2 RETURNING *'; // Filter by tenant
        const { rows } = await db.query(query, [id, tenant]);
        return rows[0];
    }
}

module.exports = MenuItem;