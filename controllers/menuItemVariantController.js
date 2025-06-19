// controllers/menuItemVariantController.js
const MenuItemVariant = require('../models/MenuItemVariant');

/**
 * Fetches all menu item variants for a specific tenant.
 * GET /api/menu-item-variants
 */
exports.getAllMenuItemVariants = async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }
        const variants = await MenuItemVariant.findAll(tenant); // Pass tenant
        res.status(200).json({ status: 'success', data: variants });
    } catch (error) {
        console.error('Error fetching all menu item variants:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch menu item variants', error: error.message });
    }
};

/**
 * Fetches a single menu item variant by ID for a specific tenant.
 * GET /api/menu-item-variants/:id
 */
exports.getMenuItemVariantById = async (req, res) => {
    const { id } = req.params;
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }
        const variant = await MenuItemVariant.findById(id, tenant); // Pass tenant
        if (variant) {
            res.status(200).json({ status: 'success', data: variant });
        } else {
            res.status(404).json({ status: 'error', message: 'Menu item variant not found' });
        }
    } catch (error) {
        console.error(`Error fetching menu item variant with ID ${id}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch menu item variant', error: error.message });
    }
};

/**
 * Fetches all menu item variants for a specific menu item and tenant.
 * GET /api/menu-item-variants/menu-item/:menuItemId
 */
exports.getMenuItemVariantsByMenuItemId = async (req, res) => {
    const { menuItemId } = req.params;
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }
        const variants = await MenuItemVariant.findByMenuItemId(menuItemId, tenant); // Pass tenant
        res.status(200).json({ status: 'success', data: variants });
    } catch (error) {
        console.error(`Error fetching variants for menu item ID ${menuItemId}:`, error);
        res.status(500).json({ status: 'error', message: `Failed to fetch variants for menu item ${menuItemId}`, error: error.message });
    }
};

/**
 * Creates a new menu item variant for a specific tenant.
 * POST /api/menu-item-variants
 */
exports.createMenuItemVariant = async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }

        const { menu_item_id, name, price, is_active } = req.body;

        // Basic validation (you might want more comprehensive validation)
        if (!menu_item_id || !name || price === undefined) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields: menu_item_id, name, and price' });
        }

        // Ensure price is a number and is_active is a boolean
        const parsedPrice = parseFloat(price);
        const parsedIsActive = is_active !== undefined ? (is_active === true || is_active === 'true') : true; // Default to true if not provided

        if (isNaN(parsedPrice)) {
            return res.status(400).json({ status: 'error', message: 'Price must be a valid number' });
        }

        const newVariantData = {
            menu_item_id: parseInt(menu_item_id), // Ensure menu_item_id is an integer
            name,
            price: parsedPrice,
            is_active: parsedIsActive,
            tenant: tenant // Add tenant to the data for creation
        };

        const newVariant = await MenuItemVariant.create(newVariantData);
        res.status(201).json({ status: 'success', data: newVariant });
    } catch (error) {
        console.error('Error creating menu item variant:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create menu item variant', error: error.message });
    }
};

/**
 * Updates an existing menu item variant for a specific tenant.
 * PUT /api/menu-item-variants/:id
 */
exports.updateMenuItemVariant = async (req, res) => {
    const { id } = req.params;
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }

        const { name, price, is_active } = req.body;

        // Prepare update data, only include fields that are provided
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price); // Ensure price is a number
        if (is_active !== undefined) updateData.is_active = (is_active === true || is_active === 'true'); // Ensure boolean

        // If no fields to update, return 400
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ status: 'error', message: 'No fields provided for update' });
        }
        
        // Add tenant to updateData to ensure tenant-specific update
        updateData.tenant = tenant;

        const updatedVariant = await MenuItemVariant.update(id, updateData); // Pass updatedData with tenant
        if (updatedVariant) {
            res.status(200).json({ status: 'success', data: updatedVariant });
        } else {
            res.status(404).json({ status: 'error', message: 'Menu item variant not found' });
        }
    } catch (error) {
        console.error(`Error updating menu item variant with ID ${id}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to update menu item variant', error: error.message });
    }
};

/**
 * Deletes a menu item variant for a specific tenant.
 * DELETE /api/menu-item-variants/:id
 */
exports.deleteMenuItemVariant = async (req, res) => {
    const { id } = req.params;
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }
        const deletedVariant = await MenuItemVariant.delete(id, tenant); // Pass tenant
        if (deletedVariant) {
            res.status(200).json({ status: 'success', data: deletedVariant });
        } else {
            res.status(404).json({ status: 'error', message: 'Menu item variant not found' });
        }
    } catch (error) {
        console.error(`Error deleting menu item variant with ID ${id}:`, error);
        res.status(500).json({ status: 'error', message: 'Failed to delete menu item variant', error: error.message });
    }
};

module.exports = exports;