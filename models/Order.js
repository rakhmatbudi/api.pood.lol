// models/Order.js
const db = require('../config/db');
const OrderItem = require('./OrderItem'); // Ensure OrderItem is imported here for calculations

class Order {
  static async findAll() {
    const query = `
      SELECT
        o.id, o.table_number, o.server_id, o.cashier_session_id, o.status, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount+o.service_charge+o.tax_amount) as final_amount, TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') update_at, o.customer_id,
        o.order_type_id, ot.name AS order_type_name,
        o.order_status as order_status_id, os.name AS order_status_name, -- ADDED order_status_id and order_status_name
        CASE
          WHEN c.name IS NOT NULL THEN c.name
          ELSE NULL
        END AS customer_name,
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
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id
      LEFT JOIN customer c ON o.customer_id = c.id
      LEFT JOIN order_type ot ON o.order_type_id = ot.id
      LEFT JOIN order_status os ON o.order_status = os.id -- ADDED JOIN for order_status
      GROUP BY o.id, c.name, ot.name, os.name -- ADDED os.name to GROUP BY
      ORDER BY o.created_at DESC;
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async findById(id) {
    const query = `
      SELECT
        o.id, o.table_number, o.server_id, o.cashier_session_id, o.status, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount+o.service_charge+o.tax_amount) as final_amount, o.created_at, o.updated_at, o.customer_id,
        o.order_type_id, ot.name AS order_type_name,
        o.order_status as order_status_id, os.name AS order_status_name, -- ADDED order_status_id and order_status_name
        CASE
          WHEN c.name IS NOT NULL THEN c.name
          ELSE NULL
        END AS customer_name,
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
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id
      LEFT JOIN customer c ON o.customer_id = c.id
      LEFT JOIN order_type ot ON o.order_type_id = ot.id
      LEFT JOIN order_status os ON o.order_status = os.id -- ADDED JOIN for order_status
      WHERE o.id = $1
      GROUP BY o.id, c.name, ot.name, os.name; -- ADDED os.name to GROUP BY
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async findAllGroupedBySessionDescending() {
    const query = `
      SELECT
        cashier_session_id,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', id,
            'table_number', table_number,
            'server_id', server_id,
            'status', status,
            'is_open', is_open,
            'total_amount', total_amount,
            'created_at', created_at,
            'updated_at', updated_at,
            'customer_id', customer_id,
            'order_type_id', order_type_id,
            'order_status_id', order_status -- ADDED order_status_id
          )
          ORDER BY created_at DESC
        ) AS orders
      FROM orders
      GROUP BY cashier_session_id
      ORDER BY cashier_session_id;
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async getServiceChargeTaxRate() {
    const query = 'SELECT amount FROM tax WHERE tax_type = 1 LIMIT 1';
    const { rows } = await db.query(query);
    return rows[0]; // Assuming only one service charge tax rate
  }

  static async getSalesTaxRate() {
    const query = 'SELECT amount FROM tax WHERE tax_type = 2 LIMIT 1';
    const { rows } = await db.query(query);
    return rows[0]; // Assuming only one sales tax rate
  }

  static async calculateServiceCharge(orderId) {
    try {
      const orderItems = await OrderItem.findAllByOrderId(orderId);
      if (!orderItems || orderItems.length === 0) {
        return 0; // No items, no service charge
      }
      const subtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
      const serviceChargeTax = await this.getServiceChargeTaxRate();
      if (!serviceChargeTax) {
        return 0; // No service charge tax defined
      }
      return subtotal * (parseFloat(serviceChargeTax.amount) / 100);
    } catch (error) {
      console.error('Error calculating service charge:', error);
      throw error;
    }
  }

  static async calculateTaxAmount(orderId) {
    try {
      const orderItems = await OrderItem.findAllByOrderId(orderId);
      if (!orderItems || orderItems.length === 0) {
        return 0; // No items, no service charge
      }
      const subtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
      const serviceChargeTax = await this.getServiceChargeTaxRate();
      const salesTaxRate = await this.getSalesTaxRate();
      if (!salesTaxRate) {
        return 0; // No service charge tax defined
      }
      return (subtotal + subtotal * (parseFloat(serviceChargeTax.amount) / 100)) * (parseFloat(salesTaxRate.amount) / 100);
    } catch (error) {
      console.error('Error calculating tax:', error);
      throw error;
    }
  }

  static async updateOrderTotalAndServiceCharge(orderId) {
    try {
      const orderItems = await OrderItem.findAllByOrderId(orderId);
      if (!orderItems) {
        return null;
      }

      const subtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
      const serviceCharge = await this.calculateServiceCharge(orderId);
      const totalAmount = subtotal + serviceCharge;

      const query = `
        UPDATE orders
        SET total_amount = $1, service_charge = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      const { rows } = await db.query(query, [totalAmount, serviceCharge, orderId]);
      return rows[0];
    } catch (error) {
      console.error('Error updating order total and service charge:', error);
      throw error;
    }
  }

  static async updateOrderTotalServiceChargeAndTax(orderId) {
    try {
      const orderItems = await OrderItem.findAllByOrderId(orderId);
      if (!orderItems) {
        return null;
      }

      const subtotal = orderItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
      const serviceCharge = await this.calculateServiceCharge(orderId);
      const taxAmount = await this.calculateTaxAmount(orderId);
      const totalAmount = subtotal + serviceCharge + taxAmount;

      const query = `
        UPDATE orders
        SET total_amount = $1, service_charge = $2, tax_amount = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      const { rows } = await db.query(query, [totalAmount, serviceCharge, taxAmount, orderId]);
      return rows[0];
    } catch (error) {
      console.error('Error updating order total, service charge, and tax:', error);
      throw error;
    }
  }

  static async calculateServiceChargeForSubtotal(subtotal) {
    const serviceChargeTax = await this.getServiceChargeTaxRate();
    if (!serviceChargeTax) {
      return 0; // No service charge tax defined
    }
    return subtotal * (parseFloat(serviceChargeTax.amount) / 100);
  }

  static async create(orderData) {
      const { table_number, server_id, customer_id, cashier_session_id, order_type_id } = orderData;
      let { order_status } = orderData; // Use 'let' so it can be reassigned
      
      // If order_status is null or undefined, default it to 1
      if (order_status === null || order_status === undefined) {
        order_status = 1;
      }
      
      // Initially, the subtotal is 0 as no items are added yet.
      const initialSubtotal = 0;
      const serviceCharge = await this.calculateServiceChargeForSubtotal(initialSubtotal);
      
      const query = `
        INSERT INTO orders (table_number, server_id, customer_id, cashier_session_id, order_type_id, status, is_open, total_amount, created_at, updated_at, service_charge, order_status)
        VALUES ($1, $2, $3, $4, $5, DEFAULT, DEFAULT, $6, DEFAULT, DEFAULT, $7, $8)
        RETURNING *
      `;
      const values = [table_number, server_id, customer_id, cashier_session_id, order_type_id, initialSubtotal + serviceCharge, serviceCharge, order_status];
      const { rows } = await db.query(query, values);
      return rows[0];
  }

  static async updateOrderStatus(orderId, status) {
    const client = await db.connect(); // Use a client for transactions
    try {
      await client.query('BEGIN'); // Start transaction

      // Find the ID of the new status from the order_status table
      const getStatusIdQuery = 'SELECT id FROM order_status WHERE name = $1';
      const { rows: statusRows } = await client.query(getStatusIdQuery, [status]);
      if (statusRows.length === 0) {
        throw new Error(`Invalid status name: ${status}`);
      }
      const newStatusId = statusRows[0].id;

      const query = `
        UPDATE orders
        SET status = $1, order_status = $2, updated_at = NOW() -- UPDATED: set both varchar status and int foreign key
        WHERE id = $3
        RETURNING *
      `;
      const { rows } = await client.query(query, [status, newStatusId, orderId]);
      const updatedOrder = rows[0];

      if (updatedOrder && status === 'cancelled') {
        // Cascade update to order items if order is cancelled
        const updateItemsQuery = `
          UPDATE order_items
          SET status = 'cancelled', updated_at = NOW()
          WHERE order_id = $1
          RETURNING *
        `;
        await client.query(updateItemsQuery, [orderId]);
      }

      await client.query('COMMIT'); // Commit transaction
      return updatedOrder;
    } catch (error) {
      await client.query('ROLLBACK'); // Rollback on error
      console.error('Error updating order status and cascading:', error);
      throw error;
    } finally {
      client.release(); // Release client back to the pool
    }
  }

  static async update(id, orderData) {
    const {
      table_number,
      server_id,
      cashier_session_id,
      status, // The varchar status
      is_open,
      total_amount,
      customer_id,
      discount_amount,
      service_charge,
      tax_amount,
      order_type_id,
      order_status // The integer foreign key for order_status
    } = orderData;

    // Generate SET clause dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (table_number !== undefined) {
      updates.push(`table_number = $${paramIndex}`);
      values.push(table_number);
      paramIndex++;
    }

    if (server_id !== undefined) {
      updates.push(`server_id = $${paramIndex}`);
      values.push(server_id);
      paramIndex++;
    }

    if (cashier_session_id !== undefined) {
      updates.push(`cashier_session_id = $${paramIndex}`);
      values.push(cashier_session_id);
      paramIndex++;
    }

    // Handle both 'status' (varchar) and 'order_status' (int FK) separately
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (is_open !== undefined) {
      updates.push(`is_open = $${paramIndex}`);
      values.push(is_open);
      paramIndex++;
    }

    if (total_amount !== undefined) {
      updates.push(`total_amount = $${paramIndex}`);
      values.push(total_amount);
      paramIndex++;
    }

    if (customer_id !== undefined) {
      updates.push(`customer_id = $${paramIndex}`);
      values.push(customer_id);
      paramIndex++;
    }

    if (discount_amount !== undefined) {
      updates.push(`discount_amount = $${paramIndex}`);
      values.push(discount_amount);
      paramIndex++;
    }

    if (service_charge !== undefined) {
      updates.push(`service_charge = $${paramIndex}`);
      values.push(service_charge);
      paramIndex++;
    }

    if (tax_amount !== undefined) {
      updates.push(`tax_amount = $${paramIndex}`);
      values.push(tax_amount);
      paramIndex++;
    }

    if (order_type_id !== undefined) {
      updates.push(`order_type_id = $${paramIndex}`);
      values.push(order_type_id);
      paramIndex++;
    }

    if (order_status !== undefined) { // NEW: update for order_status (integer FK)
      updates.push(`order_status = $${paramIndex}`);
      values.push(order_status);
      paramIndex++;
    }

    // Always update the updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // If no fields to update (only updated_at would be updated)
    if (updates.length === 1 && updates[0].includes('updated_at')) {
      return null;
    }

    const query = `
      UPDATE orders
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM orders WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }

  static async findByStatus(status) {
    // This method currently queries the varchar 'status' column.
    // If you want to use the new 'order_status' (integer FK) for querying,
    // you'll need to join with order_status table to find the ID by name.
    // Example:
    /*
    const getStatusIdQuery = 'SELECT id FROM order_status WHERE name = $1';
    const { rows: statusRows } = await db.query(getStatusIdQuery, [status]);
    if (statusRows.length === 0) {
      return []; // No matching status name
    }
    const statusId = statusRows[0].id;
    const query = `
        SELECT o.*, os.name AS order_status_name
        FROM orders o
        JOIN order_status os ON o.order_status = os.id
        WHERE o.order_status = $1
        ORDER BY o.created_at DESC`;
    const { rows } = await db.query(query, [statusId]);
    */
    // For now, keeping original logic for the 'status' varchar column:
    const query = 'SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC';
    const { rows } = await db.query(query, [status]);
    return rows;
  }

  static async findOpenOrders() {
    const query = 'SELECT * FROM orders WHERE is_open = true ORDER BY created_at DESC';
    const { rows } = await db.query(query);
    return rows;
  }

  static async findOpenOrdersBySession(session_id) {
    const query = `
      SELECT
        o.id, o.table_number, o.server_id, o.cashier_session_id, o.status, o.is_open, o.total_amount, TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') updated_at, o.customer_id,
        o.order_type_id, ot.name AS order_type_name,
        o.order_status as order_status_id, os.name AS order_status_name, -- ADDED order_status_id and order_status_name
        CASE
          WHEN c.name IS NOT NULL THEN c.name
          ELSE NULL
        END AS customer_name,
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
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id
      LEFT JOIN customer c ON o.customer_id = c.id
      LEFT JOIN order_type ot ON o.order_type_id = ot.id
      LEFT JOIN order_status os ON o.order_status = os.id -- ADDED JOIN for order_status
      WHERE o.is_open = true AND o.cashier_session_id = $1
      GROUP BY o.id, c.name, ot.name, os.name -- ADDED os.name to GROUP BY
      ORDER BY o.created_at DESC;
    `;
    const { rows } = await db.query(query, [session_id]);
    return rows;
  }

  /**
   * Retrieves all orders for a given cashier session ID,
   * including associated order items, order type, order status,
   * and customer name.
   *
   * @param {number} sessionId - The ID of the cashier session.
   * @returns {Promise<Array>} A promise that resolves to an array of order objects.
   */
  static async getOrdersBySessionId(sessionId) {
    try {
      const query = `
        SELECT
            o.id,
            o.table_number,
            o.server_id,
            o.cashier_session_id,
            o.status,
            o.is_open,
            o.total_amount,
            o.discount_amount,
            o.service_charge,
            o.tax_amount,
            (o.total_amount + o.service_charge + o.tax_amount - o.discount_amount) AS final_amount,
            TO_CHAR(o.created_at, 'HH24:MI') AS created_at,
            TO_CHAR(o.updated_at, 'HH24:MI') AS update_at, -- Note: response uses 'update_at'
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
                            'variant_name', miv.name, -- Changed from v.name to miv.name based on other queries
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
                    LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
                    LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id -- Changed from variants v to menu_item_variants miv
                    WHERE oi.order_id = o.id
                ),
                '[]'::json -- Return an empty array if no order items
            ) AS order_items
        FROM
            orders o
        JOIN
            order_type ot ON o.order_type_id = ot.id -- Changed from order_types to order_type
        JOIN
            order_status os ON o.order_status = os.id -- Assuming order_status column in orders table stores the ID
        LEFT JOIN
            customer c ON o.customer_id = c.id -- Changed from customers to customer
        WHERE
            o.cashier_session_id = $1
        ORDER BY
            o.created_at DESC; -- Order by creation date, newest first
      `;
      const { rows } = await db.query(query, [sessionId]);
      return rows;
    } catch (error) {
      console.error('Error fetching orders by session ID:', error);
      throw error; // Re-throw the error for the route handler to catch
    }
  }
}

module.exports = Order;
