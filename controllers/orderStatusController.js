// controllers/orderStatusController.js
const OrderStatus = require('../models/OrderStatus');

exports.getAllOrderStatuses = async (req, res) => {
  try {
    const orderStatuses = await OrderStatus.findAll();
    res.status(200).json(orderStatuses);
    console.log("getting order status");
  } catch (error) {
    console.error('Error fetching order statuses:', error);
    res.status(500).json({ message: 'Error fetching order statuses', error: error.message });
  }
};

exports.getOrderStatusById = async (req, res) => {
  try {
    const { id } = req.params;
    const orderStatus = await OrderStatus.findById(id);
    if (!orderStatus) {
      return res.status(404).json({ message: 'Order status not found' });
    }
    res.status(200).json(orderStatus);
  } catch (error) {
    console.error('Error fetching order status by ID:', error);
    res.status(500).json({ message: 'Error fetching order status by ID', error: error.message });
  }
};

exports.createOrderStatus = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Order status name is required' });
    }
    const newOrderStatus = await OrderStatus.create({ name, description });
    res.status(201).json(newOrderStatus);
  } catch (error) {
    console.error('Error creating order status:', error);
    res.status(500).json({ message: 'Error creating order status', error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const updatedOrderStatus = await OrderStatus.update(id, { name, description });
    if (!updatedOrderStatus) {
      return res.status(404).json({ message: 'Order status not found or no fields to update' });
    }
    res.status(200).json(updatedOrderStatus);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

exports.deleteOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrderStatus = await OrderStatus.delete(id);
    if (!deletedOrderStatus) {
      return res.status(404).json({ message: 'Order status not found' });
    }
    res.status(200).json({ message: 'Order status deleted successfully', deletedOrderStatus });
  } catch (error) {
    console.error('Error deleting order status:', error);
    res.status(500).json({ message: 'Error deleting order status', error: error.message });
  }
};