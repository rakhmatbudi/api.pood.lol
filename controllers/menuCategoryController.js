// controllers/menuCategoryController.js
const MenuCategory = require('../models/MenuCategory');
const cloudinary = require('../config/cloudinary');
const fs = require('fs/promises');

exports.getAllMenuCategories = async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

        const categories = await MenuCategory.findAll(tenant); // Pass tenant
        res.status(200).json({
            status: 'success',
            count: categories.length,
            data: categories,
        });
    } catch (err) {
        console.error('Error getting all menu categories:', err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve menu categories',
        });
    }
};

exports.getMenuCategoryById = async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

        const category = await MenuCategory.findById(req.params.id, tenant); // Pass tenant
        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: 'Menu category not found',
            });
        }
        res.status(200).json({
            status: 'success',
            data: category,
        });
    } catch (err) {
        console.error(`Error getting menu category ${req.params.id}:`, err);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve menu category',
        });
    }
};

exports.createMenuCategory = async (req, res) => {
    let display_picture = null;
    const localFilePath = req.file ? req.file.path : null;

    try {
        const tenant = req.tenant;
        if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

        console.log('Request body:', req.body);
        console.log('Request file:', req.file);

        const {
            name,
            description,
            is_displayed,
            menu_category_group,
            sku_id,
            is_highlight,
            is_display_for_self_order
        } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                status: 'error',
                message: 'Name is required'
            });
        }

        // Handle image upload if file is provided
        if (localFilePath) {
            try {
                console.log('Uploading image to Cloudinary...');
                const uploadResult = await cloudinary.uploader.upload(localFilePath, {
                    folder: `Pood/${tenant}/MenuCategory`, // Tenant-specific folder
                    public_id: `${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
                    resource_type: 'image'
                });
                display_picture = uploadResult.secure_url;
                console.log('Image uploaded successfully:', display_picture);
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to upload image to Cloudinary',
                    error: uploadError.message
                });
            } finally {
                // Clean up local file
                try {
                    await fs.unlink(localFilePath);
                    console.log('Local temp file deleted');
                } catch (unlinkError) {
                    console.error('Failed to delete local temp file:', unlinkError);
                }
            }
        }

        const categoryData = {
            name,
            description,
            is_displayed: is_displayed === 'true' || is_displayed === true,
            display_picture,
            menu_category_group,
            sku_id,
            is_highlight: is_highlight === 'true' || is_highlight === true,
            is_display_for_self_order: is_display_for_self_order === 'true' || is_display_for_self_order === true,
            tenant: tenant // Add tenant
        };

        console.log('Creating category with data:', categoryData);

        const newCategory = await MenuCategory.create(categoryData); // Pass categoryData with tenant

        res.status(201).json({
            status: 'success',
            data: newCategory,
        });
    } catch (error) {
        console.error('Error creating menu category:', error);

        // Clean up local file if there was an error
        if (localFilePath) {
            try {
                await fs.unlink(localFilePath);
            } catch (cleanupError) {
                console.error('Failed to cleanup file after error:', cleanupError);
            }
        }

        if (error.message.includes('Invalid file type') || error.message.includes('File too large')) {
            return res.status(400).json({ status: 'error', message: error.message });
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to create menu category',
            error: error.message
        });
    }
};

exports.updateMenuCategory = async (req, res) => {
    const { id } = req.params;
    let display_picture = null;
    const localFilePath = req.file ? req.file.path : null;

    try {
        const tenant = req.tenant;
        if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

        console.log('Update request body:', req.body);
        console.log('Update request file:', req.file);

        const {
            name,
            description,
            is_displayed,
            menu_category_group,
            sku_id,
            is_highlight,
            is_display_for_self_order
        } = req.body;

        // Find existing category for THIS TENANT
        const existingCategory = await MenuCategory.findById(id, tenant); // Pass tenant
        if (!existingCategory) {
            return res.status(404).json({
                status: 'error',
                message: 'Menu category not found',
            });
        }

        // Start with existing image
        display_picture = existingCategory.display_picture;

        // Handle new image upload
        if (localFilePath) {
            try {
                // Delete old image if it exists and belongs to the current tenant's folder
                if (existingCategory.display_picture) {
                    try {
                        // Extract public_id, considering the tenant-specific folder structure
                        const publicIdMatch = existingCategory.display_picture.match(/\/Pood\/(\d+)\/MenuCategory\/(.+)\./);
                        if (publicIdMatch && publicIdMatch[1] === String(tenant)) { // Ensure it's the correct tenant's image
                            const publicId = `Pood/${publicIdMatch[1]}/MenuCategory/${publicIdMatch[2]}`;
                            await cloudinary.uploader.destroy(publicId);
                            console.log('Old image deleted from Cloudinary');
                        } else {
                            console.warn('Old image not in expected tenant folder or publicId not found. Skipping deletion.');
                        }
                    } catch (err) {
                        console.warn('Could not delete old image from Cloudinary:', err);
                    }
                }

                // Upload new image
                console.log('Uploading new image to Cloudinary...');
                const uploadResult = await cloudinary.uploader.upload(localFilePath, {
                    folder: `Pood/${tenant}/MenuCategory`, // Tenant-specific folder
                    public_id: `${(name || existingCategory.name).replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
                    resource_type: 'image'
                });
                display_picture = uploadResult.secure_url;
                console.log('New image uploaded successfully:', display_picture);
            } catch (uploadError) {
                console.error('Cloudinary upload error during update:', uploadError);
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to upload new image',
                    error: uploadError.message
                });
            } finally {
                // Clean up local file
                try {
                    await fs.unlink(localFilePath);
                    console.log('Local temp file deleted');
                } catch (unlinkError) {
                    console.error('Failed to delete local temp file:', unlinkError);
                }
            }
        } else if (req.body.display_picture === null || req.body.display_picture === '' || req.body.removeImage === 'true') {
            // Handle image removal request - matches your menu item pattern
            if (existingCategory.display_picture) {
                try {
                    const publicIdMatch = existingCategory.display_picture.match(/\/Pood\/(\d+)\/MenuCategory\/(.+)\./);
                    if (publicIdMatch && publicIdMatch[1] === String(tenant)) { // Ensure it's the correct tenant's image
                        const publicId = `Pood/${publicIdMatch[1]}/MenuCategory/${publicIdMatch[2]}`;
                        await cloudinary.uploader.destroy(publicId);
                        console.log('Image removed from Cloudinary');
                    } else {
                        console.warn('Image not in expected tenant folder for removal or publicId not found. Skipping deletion.');
                    }
                } catch (err) {
                    console.warn('Could not delete old image from Cloudinary (removal request):', err);
                }
            }
            display_picture = null;
        }

        const categoryData = {
            name,
            description,
            is_displayed: is_displayed !== undefined ? (is_displayed === 'true' || is_displayed === true) : existingCategory.is_displayed,
            display_picture,
            menu_category_group,
            sku_id,
            is_highlight: is_highlight !== undefined ? (is_highlight === 'true' || is_highlight === true) : existingCategory.is_highlight,
            is_display_for_self_order: is_display_for_self_order !== undefined ? (is_display_for_self_order === 'true' || is_display_for_self_order === true) : existingCategory.is_display_for_self_order,
            tenant: tenant // Add tenant to update data
        };

        console.log('Updating category with data:', categoryData);

        const updatedCategory = await MenuCategory.update(id, categoryData); // Pass categoryData with tenant

        res.status(200).json({
            status: 'success',
            data: updatedCategory,
        });
    } catch (error) {
        console.error(`Error updating menu category ${id}:`, error);

        // Clean up local file if there was an error
        if (localFilePath) {
            try {
                await fs.unlink(localFilePath);
            } catch (cleanupError) {
                console.error('Failed to cleanup file after error:', cleanupError);
            }
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to update menu category',
            error: error.message
        });
    }
};

exports.deleteMenuCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const tenant = req.tenant;
        if (!tenant) { return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' }); }

        // Find category to get its display_picture for deletion, scoped by tenant
        const category = await MenuCategory.findById(id, tenant); // Pass tenant
        if (category && category.display_picture) {
            const publicIdMatch = category.display_picture.match(/\/Pood\/(\d+)\/MenuCategory\/(.+)\./);
            if (publicIdMatch && publicIdMatch[1] === String(tenant)) { // Ensure it's the correct tenant's image
                const publicId = `Pood/${publicIdMatch[1]}/MenuCategory/${publicIdMatch[2]}`;
                try {
                    await cloudinary.uploader.destroy(publicId);
                    console.log('Image deleted from Cloudinary during category deletion');
                } catch (cloudinaryDeleteError) {
                    console.warn('Could not delete image from Cloudinary:', cloudinaryDeleteError);
                }
            } else {
                console.warn('Image not in expected tenant folder for deletion or publicId not found. Skipping deletion.');
            }
        }

        const deletedCategory = await MenuCategory.softDelete(id, tenant); // Pass tenant
        if (!deletedCategory) {
            return res.status(404).json({
                status: 'error',
                message: 'Menu category not found',
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Menu category deleted successfully (or set to not displayed)',
        });
    } catch (error) {
        console.error(`Error deleting menu category ${id}:`, error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete menu category',
            error: error.message
        });
    }
};

module.exports = exports;