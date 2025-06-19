const OrderType = require('../models/OrderType');

/**
 * Helper to ensure tenant is present
 */
const gettenant = (req, res) => {
    const tenant = req.tenant; // Assuming tenant is attached by middleware
    if (!tenant) {
        res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        return null;
    }
    return tenant;
};

exports.createOrderType = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ status: 'error', message: 'Order type name is required' });
        }
        // Pass tenant to the create method
        const newOrderType = await OrderType.create(name, tenant);
        res.status(201).json({ status: 'success', data: newOrderType });
    } catch (error) {
        console.error('Error creating order type:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create order type' });
    }
};

exports.getAllOrderTypes = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        // Pass tenant to retrieve order types specific to this tenant
        const orderTypes = await OrderType.findAll(tenant);
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
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        const { id } = req.params;
        // Pass tenant to find the order type belonging to this tenant
        const orderType = await OrderType.findById(id, tenant);
        if (!orderType) {
            // Be specific: not found OR does not belong to this tenant
            return res.status(404).json({ status: 'error', message: 'Order type not found or does not belong to this tenant' });
        }
        res.status(200).json({ status: 'success', data: orderType });
    } catch (error) {
        console.error(`Error getting order type ${id}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to retrieve order type' });
    }
};

exports.updateOrderType = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ status: 'error', message: 'Order type name is required for update' });
        }
        // Pass tenant to update the order type belonging to this tenant
        const updatedOrderType = await OrderType.update(id, name, tenant);
        if (!updatedOrderType) {
            // Be specific: not found OR does not belong to this tenant
            return res.status(404).json({ status: 'error', message: 'Order type not found or does not belong to this tenant' });
        }
        res.status(200).json({ status: 'success', data: updatedOrderType });
    } catch (error) {
        console.error(`Error updating order type ${id}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to update order type' });
    }
};

exports.deleteOrderType = async (req, res) => {
    const tenant = gettenant(req, res);
    if (!tenant) return; // Stop if tenant is missing

    try {
        const { id } = req.params;
        // Pass tenant to delete the order type belonging to this tenant
        const deletedOrderType = await OrderType.delete(id, tenant);
        if (!deletedOrderType) {
            // Be specific: not found OR does not belong to this tenant
            return res.status(404).json({ status: 'error', message: 'Order type not found or does not belong to this tenant' });
        }
        res.status(200).json({ status: 'success', message: 'Order type deleted successfully' });
    } catch (error) {
        console.error(`Error deleting order type ${id}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to delete order type' });
    }
};