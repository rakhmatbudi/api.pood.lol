// controllers/orderStatusController.js
const OrderStatus = require('../models/OrderStatus');

exports.getAllOrderStatuses = async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

        const orderStatuses = await OrderStatus.findAll(tenant);
        res.status(200).json({ status: 'success', data: orderStatuses });
        console.log("getting order status");
    } catch (error) {
        console.error('Error fetching order statuses:', error);
        res.status(500).json({ status: 'error', message: 'Error fetching order statuses', error: error.message });
    }
};

exports.getOrderStatusById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = req.tenant;
        if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

        const orderStatus = await OrderStatus.findById(id, tenant);
        if (!orderStatus) {
            return res.status(404).json({ status: 'error', message: 'Order status not found' });
        }
        res.status(200).json({ status: 'success', data: orderStatus });
    } catch (error) {
        console.error('Error fetching order status by ID:', error);
        res.status(500).json({ status: 'error', message: 'Error fetching order status by ID', error: error.message });
    }
};

exports.createOrderStatus = async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ status: 'error', message: 'Order status name is required' });
        }

        const newOrderStatus = await OrderStatus.create({ name, description, tenant: tenant }); // Add tenant
        res.status(201).json({ status: 'success', data: newOrderStatus });
    } catch (error) {
        console.error('Error creating order status:', error);
        res.status(500).json({ status: 'error', message: 'Error creating order status', error: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = req.tenant;
        if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

        const { name, description } = req.body;
        // Construct update data including tenant to ensure tenant-specific update
        const updateData = { name, description, tenant: tenant };
        const updatedOrderStatus = await OrderStatus.update(id, updateData);
        if (!updatedOrderStatus) {
            return res.status(404).json({ status: 'error', message: 'Order status not found or no fields to update' });
        }
        res.status(200).json({ status: 'success', data: updatedOrderStatus });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ status: 'error', message: 'Error updating order status', error: error.message });
    }
};

exports.deleteOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = req.tenant;
        if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

        const deletedOrderStatus = await OrderStatus.delete(id, tenant); // Pass tenant
        if (!deletedOrderStatus) {
            return res.status(404).json({ status: 'error', message: 'Order status not found' });
        }
        res.status(200).json({ status: 'success', message: 'Order status deleted successfully', data: deletedOrderStatus });
    } catch (error) {
        console.error('Error deleting order status:', error);
        res.status(500).json({ status: 'error', message: 'Error deleting order status', error: error.message });
    }
};