// models/OrderItem.js
const db = require('../config/db');

class OrderItem {
  // All methods now accept a 'tenant' argument.
  // This 'tenant' value should be passed from your authentication/authorization middleware
  // in your controllers (e.g., req.user.tenantId or req.headers['x-tenant-id'])

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
      tenant, // CRITICAL: Expect tenant in orderItemData
    } = orderItemData;

    if (!tenant) {
      throw new Error('Tenant ID is required to create an order item.');
    }

    const query = `
      INSERT INTO order_items (order_id, menu_item_id, variant_id, quantity, unit_price, total_price, notes, status, kitchen_printed, tenant)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      tenant, // CRITICAL: Insert tenant value
    ];

    const { rows } = await db.query(query, values);
    const newOrderItem = rows[0];

    // After creating the order item, update the associated order's totals
    // Pass the tenant ID to updateOrderTotals
    if (newOrderItem) {
      await this.updateOrderTotals(order_id, tenant);
    }

    return newOrderItem;
  }

  // Handle order total calculations directly here (no circular dependency)
  // Now accepts 'tenant' as a parameter
  static async updateOrderTotals(orderId, tenant) {
    try {
      // Get all order items for this order AND tenant
      const allOrderItems = await this.findAllByOrderId(orderId, tenant);

      if (!allOrderItems || allOrderItems.length === 0) {
        // If no items, reset order totals for this tenant's order
        const updateQuery = `
          UPDATE orders
          SET total_amount = 0, service_charge = 0, tax_amount = 0, updated_at = NOW()
          WHERE id = $1 AND tenant = $2
          RETURNING *
        `;
        const { rows } = await db.query(updateQuery, [orderId, tenant]);
        console.log(`Order ${orderId} for tenant ${tenant} totals reset to 0 - no active items`);
        return rows[0];
      }

      // ✅ FIX: Only include active (non-cancelled) items in calculations
      const activeItems = allOrderItems.filter(item => item.status !== 'cancelled');

      console.log(`Order ${orderId} for tenant ${tenant}: Total items: ${allOrderItems.length}, Active items: ${activeItems.length}`);

      if (activeItems.length === 0) {
        // If no active items, set all totals to 0
        const updateQuery = `
          UPDATE orders
          SET total_amount = 0, service_charge = 0, tax_amount = 0, updated_at = NOW()
          WHERE id = $1 AND tenant = $2
          RETURNING *
        `;
        const { rows } = await db.query(updateQuery, [orderId, tenant]);
        console.log(`Order ${orderId} for tenant ${tenant} totals reset to 0 - no active items`);
        return rows[0];
      }

      // Calculate subtotal from ONLY active (non-cancelled) order items
      const subtotal = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

      // Get tax rates from database - pass tenant
      const serviceChargeTax = await this.getServiceChargeTaxRate(tenant);
      const salesTaxRate = await this.getSalesTaxRate(tenant);

      // Calculate service charge on subtotal (active items only)
      const serviceChargeRate = serviceChargeTax ? parseFloat(serviceChargeTax.amount) / 100 : 0.10; // Fallback to 10%
      const serviceCharge = subtotal * serviceChargeRate;

      // Calculate tax on (subtotal + service charge)
      const taxRate = salesTaxRate ? parseFloat(salesTaxRate.amount) / 100 : 0.08; // Fallback to 8%
      const taxableAmount = subtotal + serviceCharge;
      const taxAmount = taxableAmount * taxRate;

      // Total amount is just the subtotal (for consistency with payment logic)
      const totalAmount = subtotal;

      // Update the order with calculated totals
      const updateQuery = `
        UPDATE orders
        SET total_amount = $1, service_charge = $2, tax_amount = $3, updated_at = NOW()
        WHERE id = $4 AND tenant = $5 -- CRITICAL: Filter by tenant
        RETURNING *
      `;

      const { rows } = await db.query(updateQuery, [totalAmount, serviceCharge, taxAmount, orderId, tenant]);

      console.log(`Order ${orderId} for tenant ${tenant} totals updated:`);
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

  // Get service charge tax rate from database - now accepts 'tenant'
  static async getServiceChargeTaxRate(tenant) {
    try {
      // Assuming 'tax' table has a 'tenant' column
      const query = 'SELECT amount FROM tax WHERE tax_type = 1 AND tenant = $1 LIMIT 1';
      const { rows } = await db.query(query, [tenant]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting service charge tax rate:', error);
      return null; // Return null so we can use default rate
    }
  }

  // Get sales tax rate from database - now accepts 'tenant'
  static async getSalesTaxRate(tenant) {
    try {
      // Assuming 'tax' table has a 'tenant' column
      const query = 'SELECT amount FROM tax WHERE tax_type = 2 AND tenant = $1 LIMIT 1';
      const { rows } = await db.query(query, [tenant]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error getting sales tax rate:', error);
      return null; // Return null so we can use default rate
    }
  }

  // Now accepts 'tenant' as a parameter
  static async findAllByOrderId(orderId, tenant) {
    const query = 'SELECT * FROM order_items WHERE order_id = $1 AND tenant = $2';
    const { rows } = await db.query(query, [orderId, tenant]);
    return rows;
  }

  // NEW METHOD: Update an existing order item by its ID
  // Now accepts 'tenant' as part of updateFields and for filtering
  static async update(id, updateFields) {
    // Expect tenant to be part of updateFields or passed separately if not updating it
    const { tenant, ...fieldsToUpdate } = updateFields;

    if (!tenant) {
      throw new Error('Tenant ID is required to update an order item.');
    }

    // Dynamically build the SET clause for the SQL query
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const key in fieldsToUpdate) {
      if (Object.hasOwnProperty.call(fieldsToUpdate, key)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(fieldsToUpdate[key]);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return null; // No fields to update
    }

    // Add updated_at
    setClauses.push(`updated_at = NOW()`);

    const query = `
      UPDATE order_items
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex} AND tenant = $${paramIndex + 1} -- CRITICAL: Filter by ID and tenant
      RETURNING *;
    `;
    values.push(id); // Add the ID to the values array last
    values.push(tenant); // Add the tenant for the WHERE clause

    try {
      const { rows } = await db.query(query, values);
      const updatedOrderItem = rows[0] || null;

      // If the order item was updated, also update the order totals
      // Pass the tenant ID to updateOrderTotals
      if (updatedOrderItem) {
        await this.updateOrderTotals(updatedOrderItem.order_id, tenant);
      }

      return updatedOrderItem;
    } catch (error) {
      console.error('Error updating order item:', error);
      throw error; // Re-throw to be caught by the controller
    }
  }

  // You also need a findById method for checking if item exists before updating its status
  // Now accepts 'tenant' as a parameter
  static async findById(id, tenant) {
    const query = 'SELECT * FROM order_items WHERE id = $1 AND tenant = $2';
    const { rows } = await db.query(query, [id, tenant]);
    return rows[0] || null; // Return the first row or null if not found
  }

  // Add a delete method for completeness, ensuring tenant isolation
  static async delete(id, tenant) {
    const query = `
      DELETE FROM order_items
      WHERE id = $1 AND tenant = $2
      RETURNING *;
    `;
    const { rows } = await db.query(query, [id, tenant]);
    const deletedItem = rows[0];

    // If an item was deleted, re-calculate order totals
    if (deletedItem) {
      await this.updateOrderTotals(deletedItem.order_id, tenant);
    }
    return deletedItem;
  }
}

module.exports = OrderItem;