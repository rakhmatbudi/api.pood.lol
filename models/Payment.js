// models/Payment.js
const db = require('../config/db');

class Payment {
  /**
   * Creates a new payment record for a specific tenant.
   * @param {object} paymentData - The payment data.
   * @param {string} paymentData.order_id - The ID of the order.
   * @param {number} paymentData.amount - The payment amount.
   * @param {string} paymentData.payment_mode - The payment mode ID.
   * @param {string} paymentData.transaction_id - The transaction ID.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<object>} The created payment record.
   */
  static async create(paymentData, tenantId) {
    const { order_id, amount, payment_mode, transaction_id } = paymentData;
    const query = `
      INSERT INTO payment (order_id, amount, payment_mode, transaction_id, payment_date, tenant_id)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING *
    `;
    const values = [order_id, amount, payment_mode, transaction_id, tenantId];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  /**
   * Finds all payments for a given order ID and tenant.
   * @param {string} orderId - The ID of the order.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<Array<object>>} An array of payment records.
   */
  static async findAllByOrderId(orderId, tenantId) {
    const query = 'SELECT * FROM payment WHERE order_id = $1 AND tenant_id = $2';
    const { rows } = await db.query(query, [orderId, tenantId]);
    return rows;
  }

  /**
   * Finds all payments grouped by cashier session for a specific tenant,
   * including order and order item details.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<Array<object>>} An array of cashier sessions with grouped payment and order item details.
   */
  static async findAllWithOrderItemsGroupedBySession(tenantId) {
    const query = `
      SELECT
        o.cashier_session_id,
        cs.opened_at AS cashier_session_opened_at,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'payment_id', p.id,
            'order_id', o.id,
            'order_table_number', o.table_number,
            'customer_name', c.name,
            'payment_amount', p.amount,
            'payment_mode', pm.id,
            'payment_mode_name', pm.description,
            'payment_date', p.payment_date,
            'transaction_id', p.transaction_id,
            'order_items', (
              SELECT
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'item_id', oi.id,
                    'menu_item_id', mi.id,
                    'menu_item_name', mi.name,
                    'variant_id', oi.variant_id,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'total_price', oi.total_price,
                    'notes', oi.notes
                  )
                )
              FROM order_items oi
              JOIN menu_items mi ON oi.menu_item_id = mi.id
              WHERE oi.order_id = o.id AND oi.tenant_id = $1 -- Ensure order_items are tenant-specific
            )
          )
          ORDER BY p.payment_date DESC
        ) AS payments
      FROM payment p
      JOIN orders o ON p.order_id = o.id AND o.tenant_id = $1 -- Ensure orders are tenant-specific
      JOIN payment_modes pm ON p.payment_mode = pm.id
      JOIN cashier_sessions cs ON o.cashier_session_id = cs.id AND cs.tenant_id = $1 -- Ensure cashier_sessions are tenant-specific
      LEFT JOIN customer c ON o.customer_id = c.id AND c.tenant_id = $1 -- Ensure customers are tenant-specific
      WHERE p.tenant_id = $1 -- Crucial: Filter payments by tenant
      GROUP BY o.cashier_session_id, cs.opened_at
      ORDER BY o.cashier_session_id desc;
    `;
    const values = [tenantId];
    const { rows } = await db.query(query, values);
    return rows;
  }

  /**
   * Finds all payments for a given cashier session and payment mode for a specific tenant.
   * @param {string} cashierSessionId - The ID of the cashier session.
   * @param {string} paymentModeId - The ID of the payment mode.
   * @param {string} tenantId - The ID of the tenant.
   * @returns {Promise<Array<object>>} An array of payment records.
   */
  static async findAllBySessionAndPaymentMode(cashierSessionId, paymentModeId, tenantId) {
    const query = `
      SELECT
        p.*,
        o.table_number AS order_table_number
      FROM payment p
      JOIN orders o ON p.order_id = o.id
      WHERE o.cashier_session_id = $1
        AND p.payment_mode = $2
        AND p.tenant_id = $3 -- Crucial: Filter payments by tenant
        AND o.tenant_id = $3; -- Ensure orders are tenant-specific
    `;
    const values = [cashierSessionId, paymentModeId, tenantId];
    const { rows } = await db.query(query, values);
    return rows;
  }
}

module.exports = Payment;