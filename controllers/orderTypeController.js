const OrderType = require('../models/OrderType');

exports.createOrderType = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Order type name is required' });
    }
    const newOrderType = await OrderType.create(name);
    res.status(201).json({ status: 'success', data: newOrderType });
  } catch (error) {
    console.error('Error creating order type:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create order type' });
  }
};

exports.getAllOrderTypes = async (req, res) => {
  try {
    const orderTypes = await OrderType.findAll();
    res.status(200).json({
      status: 'success',
      count: orderTypes.length,
      data: orderTypes,
    });
  } catch (error) {
    console.error('Error getting all order types:', error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve order types' });
  }
};

exports.getOrderTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const orderType = await OrderType.findById(id);
    if (!orderType) {
      return res.status(404).json({ status: 'error', message: 'Order type not found' });
    }
    res.status(200).json({ status: 'success', data: orderType });
  } catch (error) {
    console.error(`Error getting order type ${id}:`, error);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve order type' });
  }
};

exports.updateOrderType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Order type name is required for update' });
    }
    const updatedOrderType = await OrderType.update(id, name);
    if (!updatedOrderType) {
      return res.status(404).json({ status: 'error', message: 'Order type not found' });
    }
    res.status(200).json({ status: 'success', data: updatedOrderType });
  } catch (error) {
    console.error(`Error updating order type ${id}:`, error);
    res.status(500).json({ status: 'error', message: 'Failed to update order type' });
  }
};

exports.deleteOrderType = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrderType = await OrderType.delete(id);
    if (!deletedOrderType) {
      return res.status(404).json({ status: 'error', message: 'Order type not found' });
    }
    res.status(200).json({ status: 'success', message: 'Order type deleted successfully' });
  } catch (error) {
    console.error(`Error deleting order type ${id}:`, error);
    res.status(500).json({ status: 'error', message: 'Failed to delete order type' });
  }
};