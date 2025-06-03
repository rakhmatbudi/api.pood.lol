// models/OrderItem.js
const db = require('../config/db');
// NO Order import at all - we'll handle totals directly here to avoid circular dependency

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
    
    // After creating the order item, update the associated order's totals
    if (newOrderItem) {
      await this.updateOrderTotals(order_id);
    }
    
    return newOrderItem;
  }
  
  // Handle order total calculations directly here (no circular dependency)
  static async updateOrderTotals(orderId) {
      try {
        // Get all order items for this order
        const allOrderItems = await this.findAllByOrderId(orderId);
        
        if (!allOrderItems || allOrderItems.length === 0) {
          return null;
        }
    
        // ✅ FIX: Only include active (non-cancelled) items in calculations
        const activeItems = allOrderItems.filter(item => item.status !== 'cancelled');
        
        console.log(`Order ${orderId}: Total items: ${allOrderItems.length}, Active items: ${activeItems.length}`);
        
        if (activeItems.length === 0) {
          // If no active items, set all totals to 0
          const updateQuery = `
            UPDATE orders
            SET total_amount = 0, service_charge = 0, tax_amount = 0, updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `;
          const { rows } = await db.query(updateQuery, [orderId]);
          console.log(`Order ${orderId} totals reset to 0 - no active items`);
          return rows[0];
        }
    
        // Calculate subtotal from ONLY active (non-cancelled) order items
        const subtotal = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
        
        // Get tax rates from database
        const serviceChargeTax = await this.getServiceChargeTaxRate();
        const salesTaxRate = await this.getSalesTaxRate();
        
        // Calculate service charge on subtotal (active items only)
        const serviceChargeRate = serviceChargeTax ? parseFloat(serviceChargeTax.amount) / 100 : 0.10;
        const serviceCharge = subtotal * serviceChargeRate;
        
        // Calculate tax on (subtotal + service charge)
        const taxRate = salesTaxRate ? parseFloat(salesTaxRate.amount) / 100 : 0.08;
        const taxableAmount = subtotal + serviceCharge;
        const taxAmount = taxableAmount * taxRate;
        
        // Total amount is just the subtotal (for consistency with payment logic)
        const totalAmount = subtotal;
    
        // Update the order with calculated totals
        const updateQuery = `
          UPDATE orders
          SET total_amount = $1, service_charge = $2, tax_amount = $3, updated_at = NOW()
          WHERE id = $4
          RETURNING *
        `;
        
        const { rows } = await db.query(updateQuery, [totalAmount, serviceCharge, taxAmount, orderId]);
        
        console.log(`Order ${orderId} totals updated:`);
        console.log(`  - Active items subtotal: ${subtotal.toFixed(2)}`);
        console.log(`  - Service charge: ${serviceCharge.toFixed(2)}`);
        console.log(`  - Tax amount: ${taxAmount.toFixed(2)}`);
        console.log(`  - Total amount (items only): ${totalAmount.toFixed(2)}`);
        
        // Log cancelled items for debugging
        const cancelledItems = allOrderItems.filter(item => item.status === 'cancelled');
        if (cancelledItems.length > 0) {
          const cancelledValue = cancelledItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
          console.log(`  - Cancelled items value (excluded): ${cancelledValue.toFixed(2)}`);
        }
        
        return rows[0];
        
      } catch (error) {
        console.error('Error updating order totals:', error);
        throw error;
      }
    }
  
  // Get service charge tax rate from database
  static async getServiceChargeTaxRate() {
    try {
      const query = 'SELECT amount FROM tax WHERE tax_type = 1 LIMIT 1';
      const { rows } = await db.query(query);
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting service charge tax rate:', error);
      return null; // Return null so we can use default rate
    }
  }

  // Get sales tax rate from database
  static async getSalesTaxRate() {
    try {
      const query = 'SELECT amount FROM tax WHERE tax_type = 2 LIMIT 1';
      const { rows } = await db.query(query);
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting sales tax rate:', error);
      return null; // Return null so we can use default rate
    }
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
      const updatedOrderItem = rows[0] || null;
      
      // If the order item was updated, also update the order totals
      if (updatedOrderItem) {
        await this.updateOrderTotals(updatedOrderItem.order_id);
      }
      
      return updatedOrderItem;
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