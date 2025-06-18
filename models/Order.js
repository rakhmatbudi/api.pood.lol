// models/Order.js
const db = require('../config/db');
const OrderItem = require('./OrderItem'); // Ensure OrderItem is imported here for calculations

class Order {
    // All methods now accept a 'tenant' argument as the first parameter
    // This 'tenant' value should be passed from your authentication/authorization middleware
    // in your controllers (e.g., req.user.tenant or req.headers['x-tenant-id'])

    static async findAll(tenant) {
        const query = `
            SELECT
                o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount + o.service_charge + o.tax_amount - o.discount_amount - o.promo_amount) as final_amount, -- Adjusted final_amount for consistency
                TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') update_at, o.customer_id,
                o.order_type_id, ot.name AS order_type_name,
                o.order_status as order_status_id, os.name AS order_status_name,
                CASE
                    WHEN c.name IS NOT NULL THEN c.name
                    ELSE NULL
                END AS customer_name,
                o.promo_amount,
                o.tenant, -- Select the tenant field to ensure it's returned
                json_agg(
                    json_build_object(
                        'id', oi.id,
                        'order_id', oi.order_id,
                        'menu_item_id', oi.menu_item_id,
                        'menu_item_name', mi.name,
                        'variant_id', oi.variant_id,
                        'variant_name', miv.name,
                        'quantity', oi.quantity,
                        'unit_price', oi.unit_price,
                        'total_price', oi.total_price,
                        'notes', oi.notes,
                        'status', oi.status,
                        'kitchen_printed', oi.kitchen_printed,
                        'created_at', TO_CHAR(oi.created_at, 'HH24:MI'),
                        'updated_at', TO_CHAR(oi.updated_at, 'HH24:MI')
                    ) ORDER BY oi.created_at ASC -- Order items for consistent output
                ) AS order_items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.tenant = o.tenant -- CRITICAL: Join on tenant for order items
            LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id AND mi.tenant = o.tenant -- Assuming menu_items are tenant-specific
            LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND miv.tenant = o.tenant -- Assuming variants are tenant-specific
            LEFT JOIN customer c ON o.customer_id = c.id AND c.tenant = o.tenant -- Assuming customer is tenant-specific
            LEFT JOIN order_type ot ON o.order_type_id = ot.id AND ot.tenant = o.tenant -- Assuming order_type is tenant-specific
            LEFT JOIN order_status os ON o.order_status = os.id AND os.tenant = o.tenant -- Assuming order_status is tenant-specific
            WHERE o.tenant = $1 -- CRITICAL: Filter main query by tenant
            GROUP BY o.id, c.name, ot.name, os.name, o.promo_amount, o.tenant
            ORDER BY o.created_at DESC;
        `;
        const { rows } = await db.query(query, [tenant]);
        return rows;
    }

    static async findById(id, tenant) {
        const query = `
            SELECT
                o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount + o.service_charge + o.tax_amount - o.discount_amount - o.promo_amount) as final_amount, -- Adjusted final_amount
                o.created_at, o.updated_at, o.customer_id,
                o.order_type_id, ot.name AS order_type_name,
                o.order_status as order_status_id, os.name AS order_status_name,
                CASE
                    WHEN c.name IS NOT NULL THEN c.name
                    ELSE NULL
                END AS customer_name,
                o.promo_amount,
                o.tenant, -- Select the tenant field
                COALESCE(
                    (
                        SELECT JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'id', oi.id,
                                'order_id', oi.order_id,
                                'menu_item_id', oi.menu_item_id,
                                'menu_item_name', mi.name,
                                'variant_id', oi.variant_id,
                                'variant_name', miv.name,
                                'quantity', oi.quantity,
                                'unit_price', oi.unit_price,
                                'total_price', oi.total_price,
                                'notes', oi.notes,
                                'status', oi.status,
                                'kitchen_printed', oi.kitchen_printed,
                                'created_at', TO_CHAR(oi.created_at, 'HH24:MI'),
                                'updated_at', TO_CHAR(oi.updated_at, 'HH24:MI')
                            ) ORDER BY oi.created_at ASC -- Order items for consistent output
                        )
                        FROM order_items oi
                        LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id AND mi.tenant = oi.tenant
                        LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND miv.tenant = oi.tenant
                        WHERE oi.order_id = o.id AND oi.tenant = o.tenant
                    ),
                    '[]'::json -- Return an empty JSON array if no order items exist
                ) AS order_items
            FROM orders o
            LEFT JOIN customer c ON o.customer_id = c.id AND c.tenant = o.tenant
            LEFT JOIN order_type ot ON o.order_type_id = ot.id AND ot.tenant = o.tenant
            LEFT JOIN order_status os ON o.order_status = os.id AND os.tenant = o.tenant
            WHERE o.id = $1 AND o.tenant = $2 -- CRITICAL: Filter by tenant
            GROUP BY o.id, c.name, ot.name, os.name, o.promo_amount, o.tenant; -- Group by all non-aggregated columns
        `;
        const { rows } = await db.query(query, [id, tenant]);
        return rows[0];
    }

    static async findAllGroupedBySessionDescending(tenant) {
        const query = `
            SELECT
                cashier_session_id,
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id', id,
                        'table_number', table_number,
                        'server_id', server_id,
                        'is_open', is_open,
                        'total_amount', total_amount,
                        'discount_amount', discount_amount, -- Added for consistency
                        'service_charge', service_charge, -- Added for consistency
                        'tax_amount', tax_amount, -- Added for consistency
                        'final_amount', (total_amount + service_charge + tax_amount - discount_amount - promo_amount), -- Added final_amount
                        'created_at', TO_CHAR(created_at, 'HH24:MI'), -- Formatted
                        'updated_at', TO_CHAR(updated_at, 'HH24:MI'), -- Formatted
                        'customer_id', customer_id,
                        'order_type_id', order_type_id,
                        'order_status_id', order_status,
                        'promo_amount', promo_amount,
                        'tenant', tenant
                    )
                    ORDER BY created_at DESC
                ) AS orders
            FROM orders
            WHERE tenant = $1 -- CRITICAL: Filter by tenant
            GROUP BY cashier_session_id
            ORDER BY MAX(created_at) DESC; -- Order sessions by the latest order in that session
        `;
        const { rows } = await db.query(query, [tenant]);
        return rows;
    }

    static async getServiceChargeTaxRate(tenant) {
        const query = 'SELECT amount FROM tax WHERE tax_type = 1 AND tenant = $1 LIMIT 1';
        const { rows } = await db.query(query, [tenant]);
        return rows[0];
    }

    static async getSalesTaxRate(tenant) {
        const query = 'SELECT amount FROM tax WHERE tax_type = 2 AND tenant = $1 LIMIT 1';
        const { rows } = await db.query(query, [tenant]);
        return rows[0];
    }

    static async calculateServiceCharge(orderId, tenant) {
        try {
            const orderItems = await OrderItem.findAllByOrderId(orderId, tenant);
            if (!orderItems || orderItems.length === 0) {
                return 0;
            }
            const activeItems = orderItems.filter(item => item.status !== 'cancelled');
            const subtotal = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
            const serviceChargeTax = await this.getServiceChargeTaxRate(tenant);
            if (!serviceChargeTax) {
                return 0;
            }
            return subtotal * (parseFloat(serviceChargeTax.amount) / 100);
        } catch (error) {
            console.error('Error calculating service charge:', error);
            throw error;
        }
    }

    static async calculateTaxAmount(orderId, tenant) {
        try {
            const orderItems = await OrderItem.findAllByOrderId(orderId, tenant);
            if (!orderItems || orderItems.length === 0) {
                return 0;
            }
            const activeItems = orderItems.filter(item => item.status !== 'cancelled');
            const subtotal = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
            const serviceCharge = await this.calculateServiceCharge(orderId, tenant); // Use calculated service charge
            const salesTaxRate = await this.getSalesTaxRate(tenant);

            if (!salesTaxRate) {
                return 0;
            }

            const taxableAmount = subtotal + serviceCharge; // Tax is usually on (subtotal + service charge)
            return taxableAmount * (parseFloat(salesTaxRate.amount) / 100);
        } catch (error) {
            console.error('Error calculating tax:', error);
            throw error;
        }
    }

    // This method can be removed if `updateOrderTotalServiceChargeAndTax` is the primary update.
    // Keeping it for now, but note its potential redundancy.
    static async updateOrderTotalAndServiceCharge(orderId, tenant) {
        try {
            const orderItems = await OrderItem.findAllByOrderId(orderId, tenant);
            if (!orderItems) {
                return null;
            }

            const activeItems = orderItems.filter(item => item.status !== 'cancelled');
            const subtotal = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
            const serviceCharge = await this.calculateServiceCharge(orderId, tenant);
            // totalAmount here implies total before sales tax and discounts, but after service charge.
            // Adjust based on your 'total_amount' column's exact meaning.
            const totalAmount = subtotal + serviceCharge;

            const query = `
                UPDATE orders
                SET total_amount = $1, service_charge = $2, updated_at = NOW()
                WHERE id = $3 AND tenant = $4
                RETURNING *
            `;
            const { rows } = await db.query(query, [totalAmount, serviceCharge, orderId, tenant]);
            return rows[0];
        } catch (error) {
            console.error('Error updating order total and service charge:', error);
            throw error;
        }
    }

    static async updateOrderTotalServiceChargeAndTax(orderId, tenant) {
        try {
            const orderItems = await OrderItem.findAllByOrderId(orderId, tenant);
            if (!orderItems) {
                return null;
            }

            const activeItems = orderItems.filter(item => item.status !== 'cancelled');
            const subtotal = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
            const serviceCharge = await this.calculateServiceCharge(orderId, tenant);
            const taxAmount = await this.calculateTaxAmount(orderId, tenant);

            // Retrieve existing order to keep discount_amount and promo_amount
            // Ensure these values are correctly handled in the `UPDATE` query
            const existingOrder = await this.findById(orderId, tenant);
            const discountAmount = parseFloat(existingOrder?.discount_amount || 0);
            const promoAmount = parseFloat(existingOrder?.promo_amount || 0);

            // The `total_amount` column in your `orders` table
            // This is commonly the sum of `order_items.total_price` for active items (subtotal).
            // Final display amount is typically derived (subtotal + service + tax - discounts).
            const totalAmountForDb = subtotal; // This will update the 'total_amount' column to just the subtotal

            const query = `
                UPDATE orders
                SET total_amount = $1, service_charge = $2, tax_amount = $3, updated_at = NOW()
                WHERE id = $4 AND tenant = $5
                RETURNING *
            `;

            const { rows } = await db.query(query, [totalAmountForDb, serviceCharge, taxAmount, orderId, tenant]);
            return rows[0];
        } catch (error) {
            console.error('Error updating order total, service charge, and tax:', error);
            throw error;
        }
    }

    static async calculateServiceChargeForSubtotal(subtotal, tenant) {
        const serviceChargeTax = await this.getServiceChargeTaxRate(tenant);
        if (!serviceChargeTax) {
            return 0;
        }
        return subtotal * (parseFloat(serviceChargeTax.amount) / 100);
    }

    static async create(orderData) {
        const { table_number, server_id, customer_id, cashier_session_id, order_type_id, promo_amount = 0, tenant } = orderData;
        let { order_status } = orderData;

        if (!tenant) {
            throw new Error('Tenant ID is required to create an order.');
        }

        if (order_status === null || order_status === undefined) {
            order_status = 1; // Default to 1 (e.g., 'pending' or 'open')
        }

        const initialSubtotal = 0;
        const serviceCharge = await this.calculateServiceChargeForSubtotal(initialSubtotal, tenant);
        const taxAmount = 0; // Initial tax is 0 as there are no items yet
        const discountAmount = 0; // Initial discount is 0

        // total_amount in DB is often just the sum of item prices (subtotal)
        // Calculations for service_charge, tax_amount, discount_amount are stored in separate columns.
        // The 'final_amount' is a derived value for display.
        const initialTotalAmount = initialSubtotal;

        const query = `
            INSERT INTO orders (table_number, server_id, customer_id, cashier_session_id, order_type_id, is_open, total_amount, service_charge, tax_amount, discount_amount, promo_amount, tenant, created_at, updated_at, order_status)
            VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8, $9, $10, $11, DEFAULT, DEFAULT, $12)
            RETURNING *
        `;
        const values = [
            table_number,
            server_id,
            customer_id,
            cashier_session_id,
            order_type_id,
            initialTotalAmount,
            serviceCharge, // This will be 0 initially for a new order with 0 subtotal
            taxAmount,     // This will be 0 initially
            discountAmount, // This will be 0 initially
            promo_amount,
            tenant,
            order_status
        ];
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    static async updateOrderStatus(orderId, statusName, tenant) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const getStatusIdQuery = 'SELECT id FROM order_status WHERE name = $1 AND tenant = $2';
            const { rows: statusRows } = await client.query(getStatusIdQuery, [statusName, tenant]);
            if (statusRows.length === 0) {
                throw new Error(`Invalid status name: ${statusName} for tenant ${tenant}`);
            }
            const newStatusId = statusRows[0].id;

            const newIsOpen = !(['closed', 'cancelled'].includes(statusName.toLowerCase()));

            const query = `
                UPDATE orders
                SET order_status = $1, is_open = $2, updated_at = NOW()
                WHERE id = $3 AND tenant = $4
                RETURNING *
            `;
            const { rows } = await client.query(query, [newStatusId, newIsOpen, orderId, tenant]);
            const updatedOrder = rows[0];

            if (updatedOrder && (statusName.toLowerCase() === 'cancelled' || statusName.toLowerCase() === 'closed')) {
                const updateItemsQuery = `
                    UPDATE order_items
                    SET status = $1, updated_at = NOW()
                    WHERE order_id = $2 AND tenant = $3
                    RETURNING *
                `;
                // Use the lowercase statusName for order_items status
                await client.query(updateItemsQuery, [statusName.toLowerCase(), orderId, tenant]);
            }

            await client.query('COMMIT');
            return updatedOrder;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error updating order status and cascading:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    static async update(id, orderData) {
        const { tenant, ...fieldsToUpdate } = orderData; // Destructure tenant separately

        if (!tenant) {
            throw new Error('Tenant ID is required for updating an order.');
        }

        const updates = [];
        const values = [];
        let paramIndex = 1;

        // Iterate over fieldsToUpdate to dynamically build the query
        for (const key in fieldsToUpdate) {
            // Ensure only valid and updatable columns are considered
            // You might want a more explicit whitelist here
            if (Object.prototype.hasOwnProperty.call(fieldsToUpdate, key) && fieldsToUpdate[key] !== undefined) {
                // For date fields, ensure proper handling if they come as strings
                if (key === 'created_at' || key === 'updated_at') {
                    // Skip these as they are handled by DB defaults or NOW()
                    continue;
                }
                updates.push(`${key} = $${paramIndex}`);
                values.push(fieldsToUpdate[key]);
                paramIndex++;
            }
        }

        // Always update the `updated_at` timestamp if other fields are being updated
        if (updates.length > 0) {
            updates.push(`updated_at = CURRENT_TIMESTAMP`);
        } else {
             // If no other fields were updated, just return null (or update only timestamp if desired)
             return null;
        }


        // Add WHERE clause parameters (id and tenant) at the end of the values array
        values.push(id);
        values.push(tenant);

        // Construct the query using the final parameter indices
        const query = `
            UPDATE orders
            SET ${updates.join(', ')}
            WHERE id = $${values.length - 1} AND tenant = $${values.length}
            RETURNING *
        `;

        // console.log('Update Query:', query);
        // console.log('Update Values:', values);

        const { rows } = await db.query(query, values);
        return rows[0];
    }

    static async findByStatus(statusName, tenant) {
        const getStatusIdQuery = 'SELECT id FROM order_status WHERE name = $1 AND tenant = $2';
        const { rows: statusRows } = await db.query(getStatusIdQuery, [statusName, tenant]);
        if (statusRows.length === 0) {
            return [];
        }
        const statusId = statusRows[0].id;
        const query = `
            SELECT o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount + o.service_charge + o.tax_amount - o.discount_amount - o.promo_amount) as final_amount, -- Adjusted final_amount
                TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') update_at, o.customer_id,
                o.order_type_id, ot.name AS order_type_name,
                o.order_status as order_status_id, os.name AS order_status_name,
                CASE
                    WHEN c.name IS NOT NULL THEN c.name
                    ELSE NULL
                END AS customer_name,
                o.promo_amount,
                o.tenant, -- Select the tenant field
                json_agg(
                    json_build_object(
                        'id', oi.id,
                        'order_id', oi.order_id,
                        'menu_item_id', oi.menu_item_id,
                        'menu_item_name', mi.name,
                        'variant_id', oi.variant_id,
                        'variant_name', miv.name,
                        'quantity', oi.quantity,
                        'unit_price', oi.unit_price,
                        'total_price', oi.total_price,
                        'notes', oi.notes,
                        'status', oi.status,
                        'kitchen_printed', oi.kitchen_printed,
                        'created_at', TO_CHAR(oi.created_at, 'HH24:MI'),
                        'updated_at', TO_CHAR(oi.updated_at, 'HH24:MI')
                    ) ORDER BY oi.created_at ASC
                ) AS order_items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.tenant = o.tenant
            LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id AND mi.tenant = o.tenant
            LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND miv.tenant = o.tenant
            LEFT JOIN customer c ON o.customer_id = c.id AND c.tenant = o.tenant
            LEFT JOIN order_type ot ON o.order_type_id = ot.id AND ot.tenant = o.tenant
            JOIN order_status os ON o.order_status = os.id AND os.tenant = o.tenant
            WHERE o.order_status = $1 AND o.tenant = $2
            GROUP BY o.id, c.name, ot.name, os.name, o.promo_amount, o.tenant
            ORDER BY o.created_at DESC;
        `;
        const { rows } = await db.query(query, [statusId, tenant]);
        return rows;
    }

    static async findOpenOrders(tenant) {
        const query = `
            SELECT
                o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount + o.service_charge + o.tax_amount - o.discount_amount - o.promo_amount) as final_amount, -- Adjusted final_amount
                TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') update_at, o.customer_id,
                o.order_type_id, ot.name AS order_type_name,
                o.order_status as order_status_id, os.name AS order_status_name,
                CASE
                    WHEN c.name IS NOT NULL THEN c.name
                    ELSE NULL
                END AS customer_name,
                o.promo_amount,
                o.tenant, -- Select the tenant field
                json_agg(
                    json_build_object(
                        'id', oi.id,
                        'order_id', oi.order_id,
                        'menu_item_id', oi.menu_item_id,
                        'menu_item_name', mi.name,
                        'variant_id', oi.variant_id,
                        'variant_name', miv.name,
                        'quantity', oi.quantity,
                        'unit_price', oi.unit_price,
                        'total_price', oi.total_price,
                        'notes', oi.notes,
                        'status', oi.status,
                        'kitchen_printed', oi.kitchen_printed,
                        'created_at', TO_CHAR(oi.created_at, 'HH24:MI'),
                        'updated_at', TO_CHAR(oi.updated_at, 'HH24:MI')
                    ) ORDER BY oi.created_at ASC
                ) AS order_items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.tenant = o.tenant
            LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id AND mi.tenant = o.tenant
            LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND miv.tenant = o.tenant
            LEFT JOIN customer c ON o.customer_id = c.id AND c.tenant = o.tenant
            LEFT JOIN order_type ot ON o.order_type_id = ot.id AND ot.tenant = o.tenant
            LEFT JOIN order_status os ON o.order_status = os.id AND os.tenant = o.tenant
            WHERE o.is_open = true AND o.tenant = $1
            GROUP BY o.id, c.name, ot.name, os.name, o.promo_amount, o.tenant
            ORDER BY o.created_at DESC;
        `;
        const { rows } = await db.query(query, [tenant]);
        return rows;
    }

    static async findOpenOrdersBySession(session_id, tenant) {
        const query = `
            SELECT
                o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount + o.service_charge + o.tax_amount - o.discount_amount - o.promo_amount) as final_amount, -- Adjusted final_amount
                TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') updated_at, o.customer_id,
                o.order_type_id, ot.name AS order_type_name,
                o.order_status as order_status_id, os.name AS order_status_name,
                CASE
                    WHEN c.name IS NOT NULL THEN c.name
                    ELSE NULL
                END AS customer_name,
                o.promo_amount,
                o.tenant, -- Select the tenant field
                json_agg(
                    json_build_object(
                        'id', oi.id,
                        'order_id', oi.order_id,
                        'menu_item_id', oi.menu_item_id,
                        'menu_item_name', mi.name,
                        'variant_id', oi.variant_id,
                        'variant_name', miv.name,
                        'quantity', oi.quantity,
                        'unit_price', oi.unit_price,
                        'total_price', oi.total_price,
                        'notes', oi.notes,
                        'status', oi.status,
                        'kitchen_printed', oi.kitchen_printed,
                        'created_at', TO_CHAR(oi.created_at, 'HH24:MI'),
                        'updated_at', TO_CHAR(oi.updated_at, 'HH24:MI')
                    ) ORDER BY oi.created_at ASC
                ) AS order_items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.tenant = o.tenant
            LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id AND mi.tenant = o.tenant
            LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND miv.tenant = o.tenant
            LEFT JOIN customer c ON o.customer_id = c.id AND c.tenant = o.tenant
            LEFT JOIN order_type ot ON o.order_type_id = ot.id AND ot.tenant = o.tenant
            LEFT JOIN order_status os ON o.order_status = os.id AND os.tenant = o.tenant
            WHERE o.is_open = true AND o.cashier_session_id = $1 AND o.tenant = $2
            GROUP BY o.id, c.name, ot.name, os.name, o.promo_amount, o.tenant
            ORDER BY o.created_at DESC;
        `;
        const { rows } = await db.query(query, [session_id, tenant]);
        return rows;
    }

    /**
     * Retrieves all orders for a given cashier session ID AND tenant,
     * including associated order items, order type, order status,
     * and customer name.
     *
     * @param {number} sessionId - The ID of the cashier session.
     * @param {string} tenant - The tenant ID.
     * @returns {Promise<Array>} A promise that resolves to an array of order objects.
     */
    static async getOrdersBySessionId(sessionId, tenant) {
        try {
            const query = `
                SELECT
                    o.id,
                    o.table_number,
                    o.server_id,
                    o.cashier_session_id,
                    o.is_open,
                    o.total_amount,
                    o.discount_amount,
                    o.service_charge,
                    o.tax_amount,
                    o.promo_amount,
                    o.tenant,
                    (o.total_amount + o.service_charge + o.tax_amount - o.discount_amount - o.promo_amount) AS final_amount,
                    TO_CHAR(o.created_at, 'HH24:MI') AS created_at,
                    TO_CHAR(o.updated_at, 'HH24:MI') AS update_at,
                    o.customer_id,
                    ot.id AS order_type_id,
                    ot.name AS order_type_name,
                    os.id AS order_status_id,
                    os.name AS order_status_name,
                    c.name AS customer_name,
                    COALESCE(
                        (
                            SELECT JSON_AGG(
                                JSON_BUILD_OBJECT(
                                    'id', oi.id,
                                    'order_id', oi.order_id,
                                    'menu_item_id', oi.menu_item_id,
                                    'menu_item_name', mi.name,
                                    'variant_id', oi.variant_id,
                                    'variant_name', miv.name,
                                    'quantity', oi.quantity,
                                    'unit_price', oi.unit_price,
                                    'total_price', oi.total_price,
                                    'notes', oi.notes,
                                    'status', oi.status,
                                    'kitchen_printed', oi.kitchen_printed,
                                    'created_at', TO_CHAR(oi.created_at, 'HH24:MI'),
                                    'updated_at', TO_CHAR(oi.updated_at, 'HH24:MI')
                                ) ORDER BY oi.created_at ASC
                            )
                            FROM order_items oi
                            LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id AND mi.tenant = oi.tenant
                            LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND miv.tenant = oi.tenant
                            WHERE oi.order_id = o.id AND oi.tenant = o.tenant
                        ),
                        '[]'::json
                    ) AS order_items
                FROM
                    orders o
                JOIN
                    order_type ot ON o.order_type_id = ot.id AND ot.tenant = o.tenant
                JOIN
                    order_status os ON o.order_status = os.id AND os.tenant = o.tenant
                LEFT JOIN
                    customer c ON o.customer_id = c.id AND c.tenant = o.tenant
                WHERE
                    o.cashier_session_id = $1 AND o.tenant = $2
                ORDER BY
                    o.created_at DESC;
            `;
            const { rows } = await db.query(query, [sessionId, tenant]);
            return rows;
        } catch (error) {
            console.error('Error fetching orders by session ID:', error);
            throw error;
        }
    }

    /**
     * Deletes a user record for a specific tenant.
     * @param {string} id - The ID of the order to delete.
     * @param {string} tenant - The ID of the tenant.
     * @returns {Promise<object | null>} - The deleted order record, or null if not found.
     */
    static async delete(id, tenant) {
        const query = `
            DELETE FROM orders
            WHERE id = $1 AND tenant = $2
            RETURNING *;
        `;
        const { rows } = await db.query(query, [id, tenant]);
        return rows[0]; // Returns the deleted row, or undefined if not found
    }
}

module.exports = Order;