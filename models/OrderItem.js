// models/OrderItem.js
const db = require('../config/db');
const Order = require('./Order'); // Import the Order model

class OrderItem {
  static async create(orderItemData) {
    const {
      order_id,
      menu_item_id,
      variant_id,
      quantity,
      unit_price,
      total_price,
      notes,
      status = 'new', // Default value
      kitchen_printed = false, // Default value
    } = orderItemData;

    const query = `
      INSERT INTO order_items (order_id, menu_item_id, variant_id, quantity, unit_price, total_price, notes, status, kitchen_printed)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      order_id,
      menu_item_id,
      variant_id,
      quantity,
      unit_price,
      total_price,
      notes,
      status,
      kitchen_printed,
    ];
    const { rows } = await db.query(query, values);
    const newOrderItem = rows[0];

    // After creating the order item, update the associated order's total_amount and service_charge
    if (newOrderItem) {
      await Order.updateOrderTotalServiceChargeAndTax(order_id);
    }

    return newOrderItem;
  }

  static async findAllByOrderId(orderId) {
    const query = 'SELECT * FROM order_items WHERE order_id = $1';
    const { rows } = await db.query(query, [orderId]);
    return rows;
  }
}

module.exports = OrderItem;