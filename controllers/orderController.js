// controllers/orderController.js
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll();
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
    const order = await Order.findById(req.params.id);

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
    const groupedOrders = await Order.findAllGroupedBySessionDescending();
    res.status(200).json({ status: 'success', data: groupedOrders });
  } catch (error) {
    console.error('Error fetching orders grouped by session:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch orders grouped by session' });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const newOrderData = {
      table_number: req.body.table_number,
      server_id: req.body.server_id,
      customer_id: req.body.customer_id,
      cashier_session_id: req.body.cashier_session_id,
      order_type_id: req.body.order_type_id,
      // order_status will be defaulted in the model if not provided
      order_status: req.body.order_status // Include order_status from request body
    };
    const newOrder = await Order.create(newOrderData);
    res.status(201).json({ status: 'success', data: newOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create order' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expect status in the request body

    // Basic validation for status (you can enhance this)
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const updatedOrder = await Order.updateOrderStatus(id, status);

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
    const updatedOrder = await Order.update(req.params.id, req.body);

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
    const deletedOrder = await Order.delete(req.params.id);

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

    // Validate status parameter
    if (!['open', 'closed', 'voided'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status parameter. Must be one of: open, closed, voided'
      });
    }

    const orders = await Order.findByStatus(status);

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
    const orders = await Order.findOpenOrders();

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
    const orders = await Order.findOpenOrdersBySession(cashier_session_id);

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
  const orderItemData = { ...req.body, order_id: orderId };

  try {
    // Check if the order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    // Create the new order item
    const newOrderItem = await OrderItem.create(orderItemData);

    // Recalculate the total amount for the order
    const orderItems = await OrderItem.findAllByOrderId(orderId);
    let newTotalAmount = 0;
    if (orderItems && orderItems.length > 0) {
      newTotalAmount = orderItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    }

    // Update the order's total_amount
    const updatedOrder = await Order.update(orderId, { total_amount: newTotalAmount });

    res.status(201).json({ status: 'success', data: { order: updatedOrder, orderItem: newOrderItem } });
  } catch (error) {
    console.error('Error adding order item and updating total:', error);
    res.status(500).json({ status: 'error', message: 'Failed to add order item and update total' });
  }
};

exports.updateOrderItemStatus = async (req, res) => {
  console.log("updating order item");
  const { orderId, itemId } = req.params;
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

    // 2. Verify the order exists (optional but good practice to ensure integrity)
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    // 3. Update only the status of the order item
    // The OrderItem.update method should be capable of partial updates
    const updatedOrderItem = await OrderItem.update(itemId, { status });

    if (!updatedOrderItem) {
      return res.status(404).json({ status: 'error', message: 'Order item not found or status is the same' });
    }

    // 4. Optionally, recalculate total amount if status changes affect pricing (e.g., 'cancelled' items don't count)
    // For a status-only update, typically total_amount wouldn't change unless your business logic dictates
    // that certain statuses (like 'cancelled') remove the item's cost from the order total.
    // If that's the case, uncomment and adjust the following block:
    /*
    const orderItems = await OrderItem.findAllByOrderId(orderId);
    let newTotalAmount = 0;
    if (orderItems && orderItems.length > 0) {
      newTotalAmount = orderItems.reduce((sum, item) => {
        // Only sum if item status is NOT 'cancelled' or similar
        return item.status !== 'cancelled' ? sum + parseFloat(item.total_price || 0) : sum;
      }, 0);
    }
    await Order.update(orderId, { total_amount: newTotalAmount });
    */

    res.status(200).json({
      status: 'success',
      data: updatedOrderItem,
      message: `Order item ${itemId} status updated to '${status}' successfully.`
    });
  } catch (error) {
    console.error(`Error updating status for order item ${itemId} in order ${orderId}:`, error);
    res.status(500).json({ status: 'error', message: 'Failed to update order item status' });
  }
};

// --- New Controller Method for /orders/sessions/:sessionId ---
exports.getOrdersBySessionId = async (req, res) => {
  const { sessionId } = req.params;

  // Basic validation for sessionId
  if (isNaN(sessionId) || parseInt(sessionId) <= 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid session ID provided. Session ID must be a positive integer.'
    });
  }

  try {
    // Call the static method from the Order model to fetch data
    const orders = await Order.getOrdersBySessionId(parseInt(sessionId));

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
