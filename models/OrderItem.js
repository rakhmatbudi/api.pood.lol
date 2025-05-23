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

  // NEW METHOD: Update an existing order item by its ID
  static async update(id, updateFields) {
    // Dynamically build the SET clause for the SQL query
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const key in updateFields) {
      if (Object.hasOwnProperty.call(updateFields, key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(updateFields[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return null; // No fields to update
    }

    const query = `
      UPDATE order_items
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;
    values.push(id); // Add the ID to the values array last

    try {
      const { rows } = await db.query(query, values);
      return rows[0] || null; // Return the updated row or null if not found
    } catch (error) {
      console.error('Error updating order item:', error);
      throw error; // Re-throw to be caught by the controller
    }
  }

  // You also need a findById method for checking if item exists before updating its status
  static async findById(id) {
    const query = 'SELECT * FROM order_items WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0] || null; // Return the first row or null if not found
  }
}

module.exports = OrderItem;