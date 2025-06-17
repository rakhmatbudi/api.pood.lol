// models/Order.js
const db = require('../config/db');
const OrderItem = require('./OrderItem'); // Ensure OrderItem is imported here for calculations

class Order {
  // All methods now accept a 'tenant' argument as the first parameter
  // This 'tenant' value should be passed from your authentication/authorization middleware
  // in your controllers (e.g., req.user.tenantId or req.headers['x-tenant-id'])

  static async findAll(tenant) {
    // Add tenant to WHERE clause and to JOIN conditions if related tables are tenant-specific
    const query = `
      SELECT
        o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount+o.service_charge+o.tax_amount) as final_amount, TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') update_at, o.customer_id,
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
          )
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
        o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount+o.service_charge+o.tax_amount) as final_amount, o.created_at, o.updated_at, o.customer_id,
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
            'created_at', oi.created_at,
            'updated_at', oi.updated_at
          )
        ) AS order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.tenant = o.tenant
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id AND mi.tenant = o.tenant
      LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND miv.tenant = o.tenant
      LEFT JOIN customer c ON o.customer_id = c.id AND c.tenant = o.tenant
      LEFT JOIN order_type ot ON o.order_type_id = ot.id AND ot.tenant = o.tenant
      LEFT JOIN order_status os ON o.order_status = os.id AND os.tenant = o.tenant
      WHERE o.id = $1 AND o.tenant = $2 -- CRITICAL: Filter by tenant
      GROUP BY o.id, c.name, ot.name, os.name, o.promo_amount, o.tenant;
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
            'created_at', created_at,
            'updated_at', updated_at,
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
      ORDER BY cashier_session_id;
    `;
    const { rows } = await db.query(query, [tenant]);
    return rows;
  }

  static async getServiceChargeTaxRate(tenant) {
    // Assuming 'tax' table has a 'tenant' column
    const query = 'SELECT amount FROM tax WHERE tax_type = 1 AND tenant = $1 LIMIT 1';
    const { rows } = await db.query(query, [tenant]);
    return rows[0]; // Assuming only one service charge tax rate per tenant
  }

  static async getSalesTaxRate(tenant) {
    // Assuming 'tax' table has a 'tenant' column
    const query = 'SELECT amount FROM tax WHERE tax_type = 2 AND tenant = $1 LIMIT 1';
    const { rows } = await db.query(query, [tenant]);
    return rows[0]; // Assuming only one sales tax rate per tenant
  }

  static async calculateServiceCharge(orderId, tenant) {
    try {
      // Pass tenant to OrderItem method
      const orderItems = await OrderItem.findAllByOrderId(orderId, tenant);
      if (!orderItems || orderItems.length === 0) {
        return 0; // No items, no service charge
      }
      // Filter for active items only for calculation
      const activeItems = orderItems.filter(item => item.status !== 'cancelled');
      const subtotal = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
      // Pass tenant to tax rate method
      const serviceChargeTax = await this.getServiceChargeTaxRate(tenant);
      if (!serviceChargeTax) {
        return 0; // No service charge tax defined for this tenant
      }
      return subtotal * (parseFloat(serviceChargeTax.amount) / 100);
    } catch (error) {
      console.error('Error calculating service charge:', error);
      throw error;
    }
  }

  static async calculateTaxAmount(orderId, tenant) {
    try {
      // Pass tenant to OrderItem method
      const orderItems = await OrderItem.findAllByOrderId(orderId, tenant);
      if (!orderItems || orderItems.length === 0) {
        return 0; // No items, no tax
      }
      // Filter for active items only for calculation
      const activeItems = orderItems.filter(item => item.status !== 'cancelled');
      const subtotal = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
      // Pass tenant to tax rate methods
      const serviceChargeTax = await this.getServiceChargeTaxRate(tenant);
      const salesTaxRate = await this.getSalesTaxRate(tenant);

      if (!salesTaxRate) {
        return 0; // No sales tax defined for this tenant
      }

      const serviceChargeRate = serviceChargeTax ? (parseFloat(serviceChargeTax.amount) / 100) : 0;
      const taxableAmount = subtotal + (subtotal * serviceChargeRate);
      return taxableAmount * (parseFloat(salesTaxRate.amount) / 100);
    } catch (error) {
      console.error('Error calculating tax:', error);
      throw error;
    }
  }

  // This method is now redundant if serviceCharge is part of updateOrderTotalServiceChargeAndTax
  // You might consider removing this if it's not used elsewhere.
  // I will keep it for completeness but mark it as needing tenant.
  static async updateOrderTotalAndServiceCharge(orderId, tenant) {
    try {
      const orderItems = await OrderItem.findAllByOrderId(orderId, tenant); // Pass tenant
      if (!orderItems) {
        return null;
      }

      const activeItems = orderItems.filter(item => item.status !== 'cancelled');
      const subtotal = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
      const serviceCharge = await this.calculateServiceCharge(orderId, tenant); // Pass tenant
      const totalAmount = subtotal + serviceCharge; // This calculation might need review based on your final_amount logic

      const query = `
        UPDATE orders
        SET total_amount = $1, service_charge = $2, updated_at = NOW()
        WHERE id = $3 AND tenant = $4 -- CRITICAL: Filter by tenant
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
      const orderItems = await OrderItem.findAllByOrderId(orderId, tenant); // Pass tenant
      if (!orderItems) {
        return null;
      }

      const activeItems = orderItems.filter(item => item.status !== 'cancelled');
      const subtotal = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
      const serviceCharge = await this.calculateServiceCharge(orderId, tenant); // Pass tenant
      const taxAmount = await this.calculateTaxAmount(orderId, tenant); // Pass tenant

      // Retrieve existing order to get discount_amount and promo_amount
      const existingOrder = await this.findById(orderId, tenant);
      const discountAmount = parseFloat(existingOrder?.discount_amount || 0);
      const promoAmount = parseFloat(existingOrder?.promo_amount || 0);

      // The final amount is subtotal + service_charge + tax_amount - discount_amount - promo_amount
      // However, total_amount in DB is often just the item subtotal or subtotal + service_charge
      // Re-evaluate how 'total_amount' is stored vs. 'final_amount' (display).
      // For consistency with `OrderItem.updateOrderTotals`, I'll set total_amount to subtotal.
      // If `total_amount` in `orders` means `subtotal + service_charge + tax_amount`, adjust here.
      const totalAmountForDb = subtotal; // Aligns with OrderItem.updateOrderTotals which sets total_amount to subtotal

      const query = `
        UPDATE orders
        SET total_amount = $1, service_charge = $2, tax_amount = $3, updated_at = NOW()
        WHERE id = $4 AND tenant = $5 -- CRITICAL: Filter by tenant
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
    const serviceChargeTax = await this.getServiceChargeTaxRate(tenant); // Pass tenant
    if (!serviceChargeTax) {
      return 0; // No service charge tax defined for this tenant
    }
    return subtotal * (parseFloat(serviceChargeTax.amount) / 100);
  }

  static async create(orderData) {
    // Expect 'tenant' to be part of orderData
    const { table_number, server_id, customer_id, cashier_session_id, order_type_id, promo_amount = 0, tenant } = orderData;
    let { order_status } = orderData;

    if (!tenant) {
      throw new Error('Tenant ID is required to create an order.');
    }

    // If order_status is null or undefined, default it to 1 (e.g., 'pending' or 'open')
    if (order_status === null || order_status === undefined) {
      order_status = 1;
    }

    const initialSubtotal = 0;
    const serviceCharge = await this.calculateServiceChargeForSubtotal(initialSubtotal, tenant); // Pass tenant

    // total_amount for a brand new order with no items is usually 0, or just based on initial service charge/promo.
    // Ensure this calculation makes sense for your business logic.
    // If order items update order totals, initial total_amount can be 0.
    const initialTotalAmount = initialSubtotal; // Start with 0, OrderItem.create will update it

    const query = `
      INSERT INTO orders (table_number, server_id, customer_id, cashier_session_id, order_type_id, is_open, total_amount, service_charge, tax_amount, discount_amount, promo_amount, tenant, created_at, updated_at, order_status)
      VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, 0, 0, $8, $9, DEFAULT, DEFAULT, $10)
      RETURNING *
    `;
    const values = [table_number, server_id, customer_id, cashier_session_id, order_type_id, initialTotalAmount, serviceCharge, promo_amount, tenant, order_status];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async updateOrderStatus(orderId, statusName, tenant) { // Add tenant parameter
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Find the ID of the new status from the order_status table (assuming tenant-specific status names)
      const getStatusIdQuery = 'SELECT id FROM order_status WHERE name = $1 AND tenant = $2';
      const { rows: statusRows } = await client.query(getStatusIdQuery, [statusName, tenant]); // Filter by tenant
      if (statusRows.length === 0) {
        throw new Error(`Invalid status name: ${statusName} for tenant ${tenant}`);
      }
      const newStatusId = statusRows[0].id;

      // Determine new is_open status based on statusName
      const newIsOpen = !(['closed', 'cancelled'].includes(statusName.toLowerCase()));

      const query = `
        UPDATE orders
        SET order_status = $1, is_open = $2, updated_at = NOW()
        WHERE id = $3 AND tenant = $4 -- CRITICAL: Filter by tenant
        RETURNING *
      `;
      const { rows } = await client.query(query, [newStatusId, newIsOpen, orderId, tenant]);
      const updatedOrder = rows[0];

      // THIS IS THE CRITICAL PART: Cascading update to order items
      if (updatedOrder && (statusName.toLowerCase() === 'cancelled' || statusName.toLowerCase() === 'closed')) {
        const updateItemsQuery = `
          UPDATE order_items
          SET status = $1, updated_at = NOW()
          WHERE order_id = $2 AND tenant = $3 -- CRITICAL: Filter order_items by tenant
          RETURNING *
        `;
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
    // Expect 'tenant' to be part of orderData for filtering
    const {
      table_number,
      server_id,
      cashier_session_id,
      is_open,
      total_amount,
      customer_id,
      discount_amount,
      service_charge,
      tax_amount,
      charged_amount,
      order_type_id,
      order_status,
      promo_amount,
      tenant // The tenant for the update operation
    } = orderData;

    if (!tenant) {
      throw new Error('Tenant ID is required for updating an order.');
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    const addField = (fieldName, value) => {
      if (value !== undefined) {
        updates.push(`${fieldName} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    };

    addField('table_number', table_number);
    addField('server_id', server_id);
    addField('cashier_session_id', cashier_session_id);
    addField('is_open', is_open);
    addField('total_amount', total_amount);
    addField('customer_id', customer_id);
    addField('discount_amount', discount_amount);
    addField('service_charge', service_charge);
    addField('tax_amount', tax_amount);
    addField('charged_amount', charged_amount);
    addField('order_type_id', order_type_id);
    addField('order_status', order_status);
    addField('promo_amount', promo_amount);

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 1 && updates[0].includes('updated_at')) {
      return null; // No fields to update other than timestamp
    }

    const query = `
      UPDATE orders
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND tenant = $${paramIndex + 1} -- CRITICAL: Filter by tenant
      RETURNING *
    `;

    values.push(id);
    values.push(tenant); // Add tenant for the WHERE clause
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async findByStatus(statusName, tenant) { // Add tenant parameter
    // This method now queries the integer 'order_status' column by joining with order_status table
    const getStatusIdQuery = 'SELECT id FROM order_status WHERE name = $1 AND tenant = $2'; // Filter by tenant
    const { rows: statusRows } = await db.query(getStatusIdQuery, [statusName, tenant]);
    if (statusRows.length === 0) {
      return []; // No matching status name for this tenant
    }
    const statusId = statusRows[0].id;
    const query = `
      SELECT o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount+o.service_charge+o.tax_amount) as final_amount, TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') update_at, o.customer_id,
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
          )
        ) AS order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.tenant = o.tenant
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id AND mi.tenant = o.tenant
      LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND miv.tenant = o.tenant
      LEFT JOIN customer c ON o.customer_id = c.id AND c.tenant = o.tenant
      LEFT JOIN order_type ot ON o.order_type_id = ot.id AND ot.tenant = o.tenant
      JOIN order_status os ON o.order_status = os.id AND os.tenant = o.tenant
      WHERE o.order_status = $1 AND o.tenant = $2 -- CRITICAL: Filter by tenant
      GROUP BY o.id, c.name, ot.name, os.name, o.promo_amount, o.tenant
      ORDER BY o.created_at DESC;
    `;
    const { rows } = await db.query(query, [statusId, tenant]);
    return rows;
  }

  static async findOpenOrders(tenant) { // Add tenant parameter
    const query = `
      SELECT
        o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount+o.service_charge+o.tax_amount) as final_amount, TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') update_at, o.customer_id,
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
          )
        ) AS order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.tenant = o.tenant
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id AND mi.tenant = o.tenant
      LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND miv.tenant = o.tenant
      LEFT JOIN customer c ON o.customer_id = c.id AND c.tenant = o.tenant
      LEFT JOIN order_type ot ON o.order_type_id = ot.id AND ot.tenant = o.tenant
      LEFT JOIN order_status os ON o.order_status = os.id AND os.tenant = o.tenant
      WHERE o.is_open = true AND o.tenant = $1 -- CRITICAL: Filter by tenant
      GROUP BY o.id, c.name, ot.name, os.name, o.promo_amount, o.tenant
      ORDER BY o.created_at DESC;
    `;
    const { rows } = await db.query(query, [tenant]);
    return rows;
  }

  static async findOpenOrdersBySession(session_id, tenant) { // Add tenant parameter
    const query = `
      SELECT
        o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount+o.service_charge+o.tax_amount) as final_amount, TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') updated_at, o.customer_id,
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
          )
        ) AS order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.tenant = o.tenant
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id AND mi.tenant = o.tenant
      LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND miv.tenant = o.tenant
      LEFT JOIN customer c ON o.customer_id = c.id AND c.tenant = o.tenant
      LEFT JOIN order_type ot ON o.order_type_id = ot.id AND ot.tenant = o.tenant
      LEFT JOIN order_status os ON o.order_status = os.id AND os.tenant = o.tenant
      WHERE o.is_open = true AND o.cashier_session_id = $1 AND o.tenant = $2 -- CRITICAL: Filter by tenant
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
  static async getOrdersBySessionId(sessionId, tenant) { // Add tenant parameter
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
            o.tenant, -- Select the tenant field
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
                        )
                    )
                    FROM order_items oi
                    LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id AND mi.tenant = oi.tenant
                    LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id AND miv.tenant = oi.tenant
                    WHERE oi.order_id = o.id AND oi.tenant = o.tenant -- CRITICAL: Filter order items by tenant
                ),
                '[]'::json
            ) AS order_items
        FROM
            orders o
        JOIN
            order_type ot ON o.order_type_id = ot.id AND ot.tenant = o.tenant -- Assuming order_type is tenant-specific
        JOIN
            order_status os ON o.order_status = os.id AND os.tenant = o.tenant -- Assuming order_status is tenant-specific
        LEFT JOIN
            customer c ON o.customer_id = c.id AND c.tenant = o.tenant -- Assuming customer is tenant-specific
        WHERE
            o.cashier_session_id = $1 AND o.tenant = $2 -- CRITICAL: Filter by tenant
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

  // --- Add a delete method, ensuring tenant isolation ---
  static async delete(id, tenant) {
    const query = `
      DELETE FROM orders
      WHERE id = $1 AND tenant = $2
      RETURNING *;
    `;
    const { rows } = await db.query(query, [id, tenant]);
    return rows[0];
  }
}

module.exports = Order;