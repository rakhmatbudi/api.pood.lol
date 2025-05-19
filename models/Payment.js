// models/Payment.js
const db = require('../config/db');

class Payment {
  static async create(paymentData) {
    const { order_id, amount, payment_mode, transaction_id } = paymentData;
    const query = `
      INSERT INTO payment (order_id, amount, payment_mode, transaction_id, payment_date)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const values = [order_id, amount, payment_mode, transaction_id];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  static async findAllByOrderId(orderId) {
    const query = 'SELECT * FROM payment WHERE order_id = $1';
    const { rows } = await db.query(query, [orderId]);
    return rows;
  }

  static async findAllWithOrderItemsGroupedBySession() {
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
              WHERE oi.order_id = o.id
            )
          )
          ORDER BY p.payment_date DESC
        ) AS payments
      FROM payment p
      JOIN orders o ON p.order_id = o.id
      JOIN payment_modes pm ON p.payment_mode = pm.id -- Join with payment_modes table
      JOIN cashier_sessions cs ON o.cashier_session_id = cs.id -- Join with cashier_session table
      LEFT JOIN customer c ON o.customer_id = c.id -- Join with the customer table
      GROUP BY o.cashier_session_id, cs.opened_at
      ORDER BY o.cashier_session_id desc;
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  static async findAllBySessionAndPaymentMode(cashierSessionId, paymentModeId) {
    const query = `
      SELECT
        p.*,
        o.table_number AS order_table_number
      FROM payment p
      JOIN orders o ON p.order_id = o.id
      WHERE o.cashier_session_id = $1 AND p.payment_mode = $2
      ORDER BY p.payment_date DESC;
    `;
    const values = [cashierSessionId, paymentModeId];
    const { rows } = await db.query(query, values);
    return rows;
  }
}

module.exports = Payment;