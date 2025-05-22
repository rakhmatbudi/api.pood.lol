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
      order_type_id: req.body.order_type_id, // <--- ADDED THIS LINE
    };
    const newOrder = await Order.create(newOrderData);
    res.status(201).json({ status: 'success', data: newOrder });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create order' });
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
    const orderItems = await OrderItem.findAllByOrderId(orderId); // You'll need to create this model method
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