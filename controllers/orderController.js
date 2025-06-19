// controllers/orderController.js

const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');

exports.getAllOrders = async (req, res) => {
  try {
    const tenant = req.tenant;
    if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }
    const orders = await Order.findAll(tenant);
    res.status(200).json({
      status: 'success',
      count: orders.length,
      data: orders
    });
  } catch (err) {
    console.error('Error getting all orders:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve orders'
    });
  }
};



exports.getOrderById = async (req, res) => {
  try {
    const tenant = req.tenant; // Get tenant ID
    if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }
    const order = await Order.findById(req.params.id, tenant);

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: order
    });
  } catch (err) {
    console.error(`Error getting order ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve order'
    });
  }
};

exports.getAllOrdersGroupedBySessionDescending = async (req, res) => {
  try {
    const tenant = req.tenant; // Get tenant ID
    if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }
    const groupedOrders = await Order.findAllGroupedBySessionDescending(tenant);
    
    res.status(200).json({ status: 'success', data: groupedOrders });
  } catch (error) {
    console.error('Error fetching orders grouped by session:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch orders grouped by session' });
  }
};

exports.createOrder = async (req, res) => {
    try {
        const tenant = req.tenant; // <--- GET TENANT ID FROM req.tenant

        if (!tenant) { // Safety check (though middleware should handle this)
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required for this operation.' });
        }

        const newOrderData = {
            table_number: req.body.table_number,
            server_id: req.body.server_id,
            customer_id: req.body.customer_id,
            cashier_session_id: req.body.cashier_session_id,
            order_type_id: req.body.order_type_id,
            order_status: req.body.order_status,
            tenant: tenant // <--- CRITICAL: ADD THE TENANT ID HERE!
        };
        // Or, more succinctly: const newOrderData = { ...req.body, tenant: tenant };

        const newOrder = await Order.create(newOrderData);
        res.status(201).json({ status: 'success', data: newOrder });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create order' });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = req.tenant; // Or req.body.tenant, depending on how tempTenantMiddleware sets it

        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }

        // Call the model method, passing the tenant
        const updatedOrder = await Order.updateOrderStatus(id, 'cancelled', tenant);

        if (!updatedOrder) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found or could not be cancelled for this tenant.'
            });
        }

        res.status(200).json({
            status: 'success',
            message: `Order ${id} has been cancelled for tenant ${tenant}.`,
            data: updatedOrder
        });
    } catch (error) {
        console.error(`Error cancelling order ${req.params.id} for tenant ${req.tenant}:`, error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to cancel order',
            details: error.message
        });
    }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
        const { status } = req.body;
        const tenant = req.tenant; // Get tenant ID
        if (!tenant) { return res.status(400).json({ message: 'Tenant ID is required' }); }

        if (!status) { return res.status(400).json({ message: 'Status is required' }); }

        const updatedOrder = await Order.updateOrderStatus(id, status, tenant);

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const tenant = req.tenant; // Get tenant ID
    if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

    // Combine req.body with tenant for the update
    const updateData = { ...req.body, tenant: tenant };
    const updatedOrder = await Order.update(req.params.id, updateData);

    if (!updatedOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found or no fields to update'
      });
    }

    res.status(200).json({
      status: 'success',
      data: updatedOrder
    });
  } catch (err) {
    console.error(`Error updating order ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update order'
    });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const tenant = req.tenant; // Get tenant ID
    if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }
    const deletedOrder = await Order.delete(req.params.id, tenant);

    if (!deletedOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Order deleted successfully'
    });
  } catch (err) {
    console.error(`Error deleting order ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete order'
    });
  }
};

exports.getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const tenant = req.tenant; // Get tenant ID
    if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

    // Validate status parameter
    if (!['open', 'closed', 'voided'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status parameter. Must be one of: open, closed, voided'
      });
    }

    const orders = await Order.findByStatus(status, tenant);

    res.status(200).json({
      status: 'success',
      count: orders.length,
      data: orders
    });
  } catch (err) {
    console.error(`Error getting orders with status ${req.params.status}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve orders'
    });
  }
};

exports.getOpenOrders = async (req, res) => {
  try {
    const tenant = req.tenant; // Get tenant ID
        if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }
        const orders = await Order.findOpenOrders(tenant);

    res.status(200).json({
      status: 'success',
      count: orders.length,
      data: orders
    });
  } catch (err) {
    console.error('Error getting open orders:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve open orders'
    });
  }
};

exports.getOpenOrdersBySession = async (req, res) => {
  const { cashier_session_id } = req.params;
  try {
    const tenant = req.tenant; // Get tenant ID
    if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }
    const orders = await Order.findOpenOrdersBySession(cashier_session_id, tenant);

    res.status(200).json({
      status: 'success',
      count: orders.length,
      data: orders
    });
  } catch (err) {
    console.error(`Error getting open orders for session ${cashier_session_id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve open orders for this session'
    });
  }
};

exports.addOrderItem = async (req, res) => {
    const { orderId } = req.params;
    const tenant = req.tenant;
    if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }
    const orderItemData = { ...req.body, order_id: orderId, tenant: tenant };

    try {
        // Check if the order exists for THIS TENANT
        const order = await Order.findById(orderId, tenant);
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        // Create the new order item
        const newOrderItem = await OrderItem.create(orderItemData);

        // --- Refinement #2: Recalculate and update the order's totals using the model's dedicated method ---
        // This assumes your Order model has a method like `updateOrderTotalServiceChargeAndTax`
        // that handles summing up order items, applying service charges, and taxes.
        const updatedOrder = await Order.updateOrderTotalServiceChargeAndTax(orderId, tenant);

        res.status(201).json({ status: 'success', data: { order: updatedOrder, orderItem: newOrderItem } });
    } catch (error) {
        console.error('Error adding order item and updating total:', error);
        res.status(500).json({ status: 'error', message: 'Failed to add order item and update total' });
    }
};

exports.updateOrderItemStatus = async (req, res) => {
    // console.log("updating order item"); // This log can be removed in production
    const { orderId, itemId } = req.params;
    const tenant = req.tenant; // Get tenant ID
    if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }
    const { status } = req.body; // Expecting only 'status' in the request body

    try {
        // 1. Validate the new status
        // Define your allowed statuses for an order item here
        const allowedStatuses = ['new', 'preparing', 'ready', 'served', 'cancelled', 'returned'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid status provided. Status must be one of: ${allowedStatuses.join(', ')}`
            });
        }

        // 2. Verify the order exists (optional but good practice to ensure integrity) for THIS TENANT
        const order = await Order.findById(orderId, tenant);
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        // 3. Update only the status of the order item
        const updatedOrderItem = await OrderItem.update(itemId, { status, tenant: tenant });

        if (!updatedOrderItem) {
            return res.status(404).json({ status: 'error', message: 'Order item not found or status is the same' });
        }

        // --- Refinement #3: Recalculate total amount if status changes affect pricing ---
        // If your business logic dictates that certain statuses (like 'cancelled' or 'returned')
        // should remove the item's cost from the order total, then this recalculation is necessary.
        const updatedOrder = await Order.updateOrderTotalServiceChargeAndTax(orderId, tenant);


        res.status(200).json({
            status: 'success',
            // You might choose to return both the updated order item and the recalculated order here
            data: { orderItem: updatedOrderItem, order: updatedOrder },
            message: `Order item ${itemId} status updated to '${status}' successfully, and order total recalculated.`
        });
    } catch (error) {
        console.error(`Error updating status for order item ${itemId} in order ${orderId}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to update order item status' });
    }
};

// --- New Controller Method for /orders/sessions/:sessionId ---
exports.getOrdersBySessionId = async (req, res) => {
  const { sessionId } = req.params;
  const tenant = req.tenant; // Get tenant ID
  if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

  // Basic validation for sessionId
  if (isNaN(sessionId) || parseInt(sessionId) <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid session ID provided. Session ID must be a positive integer.'
    });
  }

  try {
    // Call the static method from the Order model to fetch data
    const orders = await Order.getOrdersBySessionId(parseInt(sessionId), tenant);

    res.status(200).json({
      status: 'success',
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error in getOrdersBySessionId controller:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching orders for the session.',
      details: error.message // Provide error message for debugging
    });
  }
};
