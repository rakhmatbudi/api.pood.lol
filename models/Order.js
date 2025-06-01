// models/Order.js
const db = require('../config/db');
const OrderItem = require('./OrderItem'); // Ensure OrderItem is imported here for calculations

class Order {
  static async findAll() {
    const query = `
      SELECT
        o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount+o.service_charge+o.tax_amount) as final_amount, TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') update_at, o.customer_id,
        o.order_type_id, ot.name AS order_type_name,
        o.order_status as order_status_id, os.name AS order_status_name,
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
            'status', oi.status, -- Note: OrderItem still has a 'status' column
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
      LEFT JOIN order_status os ON o.order_status = os.id
      GROUP BY o.id, c.name, ot.name, os.name
      ORDER BY o.created_at DESC;
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async findById(id) {
    const query = `
      SELECT
        o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount+o.service_charge+o.tax_amount) as final_amount, o.created_at, o.updated_at, o.customer_id,
        o.order_type_id, ot.name AS order_type_name,
        o.order_status as order_status_id, os.name AS order_status_name,
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
            'status', oi.status, -- Note: OrderItem still has a 'status' column
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
      LEFT JOIN order_status os ON o.order_status = os.id
      WHERE o.id = $1
      GROUP BY o.id, c.name, ot.name, os.name;
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
            -- 'status', status, -- REMOVED
            'is_open', is_open,
            'total_amount', total_amount,
            'created_at', created_at,
            'updated_at', updated_at,
            'customer_id', customer_id,
            'order_type_id', order_type_id,
            'order_status_id', order_status
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
        return 0; // No sales tax defined
      }
      return (subtotal + subtotal * (parseFloat(serviceChargeTax.amount) / 100)) * (parseFloat(salesTaxRate.amount) / 100);
    } catch (error) {
      console.error('Error calculating tax:', error);
      throw error;
    }
  }

  // This method is now redundant if serviceCharge is part of updateOrderTotalServiceChargeAndTax
  // You might consider removing this if it's not used elsewhere.
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
      // Removed discount_amount from calculation here, as it's not present in params.
      // If discount is to be factored in, it should be retrieved or passed.
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
    let { order_status } = orderData;

    // If order_status is null or undefined, default it to 1 (e.g., 'pending' or 'open')
    if (order_status === null || order_status === undefined) {
      order_status = 1;
    }

    const initialSubtotal = 0;
    const serviceCharge = await this.calculateServiceChargeForSubtotal(initialSubtotal);
    // Note: total_amount is calculated as initialSubtotal + serviceCharge for a new order.
    // tax_amount and discount_amount start at 0.
    const query = `
      INSERT INTO orders (table_number, server_id, customer_id, cashier_session_id, order_type_id, is_open, total_amount, service_charge, tax_amount, discount_amount, created_at, updated_at, order_status)
      VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, 0, 0, DEFAULT, DEFAULT, $8)
      RETURNING *
    `;
    const values = [table_number, server_id, customer_id, cashier_session_id, order_type_id, initialSubtotal + serviceCharge, serviceCharge, order_status];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async updateOrderStatus(orderId, statusName) { // Renamed 'status' to 'statusName' for clarity
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Find the ID of the new status from the order_status table
      const getStatusIdQuery = 'SELECT id FROM order_status WHERE name = $1';
      const { rows: statusRows } = await client.query(getStatusIdQuery, [statusName]);
      if (statusRows.length === 0) {
        throw new Error(`Invalid status name: ${statusName}`);
      }
      const newStatusId = statusRows[0].id;

      // Determine new is_open status based on statusName
      const newIsOpen = !(['closed', 'cancelled'].includes(statusName.toLowerCase()));

      const query = `
        UPDATE orders
        SET order_status = $1, is_open = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      const { rows } = await client.query(query, [newStatusId, newIsOpen, orderId]);
      const updatedOrder = rows[0];

      // THIS IS THE CRITICAL PART: Cascading update to order items
      if (updatedOrder && (statusName.toLowerCase() === 'cancelled' || statusName.toLowerCase() === 'closed')) {
        const updateItemsQuery = `
          UPDATE order_items
          SET status = $1, updated_at = NOW() -- Assuming order_items still has a 'status' varchar column
          WHERE order_id = $2
          RETURNING *
        `;
        // Pass the name of the status to order_items status column
        await client.query(updateItemsQuery, [statusName.toLowerCase(), orderId]);
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
    const {
      table_number,
      server_id,
      cashier_session_id,
      // status, // REMOVED: No longer updating varchar status
      is_open,
      total_amount,
      customer_id,
      discount_amount,
      service_charge,
      tax_amount,
      order_type_id,
      order_status // The integer foreign key for order_status
    } = orderData;

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

    // if (status !== undefined) { // REMOVED
    //   updates.push(`status = $${paramIndex}`);
    //   values.push(status);
    //   paramIndex++;
    // }

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

    if (order_status !== undefined) {
      updates.push(`order_status = $${paramIndex}`);
      values.push(order_status);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 1 && updates[0].includes('updated_at')) {
      return null; // No fields to update other than timestamp
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

  static async findByStatus(statusName) { // Changed 'status' to 'statusName' for clarity
    // This method now queries the integer 'order_status' column by joining with order_status table
    const getStatusIdQuery = 'SELECT id FROM order_status WHERE name = $1';
    const { rows: statusRows } = await db.query(getStatusIdQuery, [statusName]);
    if (statusRows.length === 0) {
      return []; // No matching status name
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
      JOIN order_status os ON o.order_status = os.id -- Use JOIN since we filter by it
      WHERE o.order_status = $1
      GROUP BY o.id, c.name, ot.name, os.name
      ORDER BY o.created_at DESC;
    `;
    const { rows } = await db.query(query, [statusId]);
    return rows;
  }

  static async findOpenOrders() {
    const query = `
      SELECT
        o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount+o.service_charge+o.tax_amount) as final_amount, TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') update_at, o.customer_id,
        o.order_type_id, ot.name AS order_type_name,
        o.order_status as order_status_id, os.name AS order_status_name,
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
      LEFT JOIN order_status os ON o.order_status = os.id
      WHERE o.is_open = true
      GROUP BY o.id, c.name, ot.name, os.name
      ORDER BY o.created_at DESC;
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async findOpenOrdersBySession(session_id) {
    const query = `
      SELECT
        o.id, o.table_number, o.server_id, o.cashier_session_id, o.is_open, o.total_amount, o.discount_amount, o.service_charge, o.tax_amount, (o.total_amount+o.service_charge+o.tax_amount) as final_amount, TO_CHAR(o.created_at, 'HH24:MI') created_at, TO_CHAR(o.updated_at, 'HH24:MI') updated_at, o.customer_id,
        o.order_type_id, ot.name AS order_type_name,
        o.order_status as order_status_id, os.name AS order_status_name,
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
      LEFT JOIN order_status os ON o.order_status = os.id
      WHERE o.is_open = true AND o.cashier_session_id = $1
      GROUP BY o.id, c.name, ot.name, os.name
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
            -- o.status, -- REMOVED
            o.is_open,
            o.total_amount,
            o.discount_amount,
            o.service_charge,
            o.tax_amount,
            (o.total_amount + o.service_charge + o.tax_amount - o.discount_amount) AS final_amount,
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
                    LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
                    LEFT JOIN menu_item_variants miv ON oi.variant_id = miv.id
                    WHERE oi.order_id = o.id
                ),
                '[]'::json
            ) AS order_items
        FROM
            orders o
        JOIN
            order_type ot ON o.order_type_id = ot.id
        JOIN
            order_status os ON o.order_status = os.id
        LEFT JOIN
            customer c ON o.customer_id = c.id
        WHERE
            o.cashier_session_id = $1
        ORDER BY
            o.created_at DESC;
      `;
      const { rows } = await db.query(query, [sessionId]);
      return rows;
    } catch (error) {
      console.error('Error fetching orders by session ID:', error);
      throw error;
    }
  }
}

module.exports = Order;