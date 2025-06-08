// controllers/menuCategoryController.js
const MenuCategory = require('../models/MenuCategory');
const cloudinary = require('../config/cloudinary');
const fs = require('fs/promises');

exports.getAllMenuCategories = async (req, res) => {
  try {
    const categories = await MenuCategory.findAll();
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
    const category = await MenuCategory.findById(req.params.id);
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
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    const { name, description, type, is_displayed } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and type are required fields'
      });
    }

    // Handle image upload if file is provided
    if (localFilePath) {
      try {
        console.log('Uploading image to Cloudinary...');
        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
          folder: 'Pood/00000001/MenuCategory',
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

    // Prepare category data
    const categoryData = {
      name,
      description: description || null,
      type,
      is_displayed: is_displayed === 'true' || is_displayed === true, // Handle both string and boolean
      display_picture
    };

    console.log('Creating category with data:', categoryData);

    const newCategory = await MenuCategory.create(categoryData);
    
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
    console.log('Update request body:', req.body);
    console.log('Update request file:', req.file);
    
    const { name, description, type, is_displayed, removeImage } = req.body;

    // Find existing category
    const existingCategory = await MenuCategory.findById(id);
    if (!existingCategory) {
      return res.status(404).json({
        status: 'error',
        message: 'Menu category not found',
      });
    }

    // Start with existing image
    display_picture = existingCategory.display_picture;

    // Handle image removal request
    if (removeImage === 'true' || removeImage === true || req.body.display_picture === null) {
      if (existingCategory.display_picture) {
        try {
          const urlParts = existingCategory.display_picture.split('/');
          const publicIdWithExtension = urlParts.slice(-2).join('/');
          const publicId = publicIdWithExtension.split('.')[0];
          
          await cloudinary.uploader.destroy(publicId);
          console.log('Old image deleted from Cloudinary');
        } catch (err) {
          console.warn('Could not delete old image from Cloudinary:', err);
        }
      }
      display_picture = null;
    }
    // Handle new image upload
    else if (localFilePath) {
      try {
        // Delete old image if it exists
        if (existingCategory.display_picture) {
          try {
            const urlParts = existingCategory.display_picture.split('/');
            const publicIdWithExtension = urlParts.slice(-2).join('/');
            const publicId = publicIdWithExtension.split('.')[0];
            
            await cloudinary.uploader.destroy(publicId);
            console.log('Old image deleted from Cloudinary');
          } catch (err) {
            console.warn('Could not delete old image from Cloudinary:', err);
          }
        }

        // Upload new image
        console.log('Uploading new image to Cloudinary...');
        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
          folder: 'Pood/00000001/MenuCategory',
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
    }

    // Prepare updated data (only update provided fields)
    const categoryData = {};
    
    if (name !== undefined) categoryData.name = name;
    if (description !== undefined) categoryData.description = description || null;
    if (type !== undefined) categoryData.type = type;
    if (is_displayed !== undefined) {
      categoryData.is_displayed = is_displayed === 'true' || is_displayed === true; // Handle both string and boolean
    }
    categoryData.display_picture = display_picture;

    console.log('Updating category with data:', categoryData);

    const updatedCategory = await MenuCategory.update(id, categoryData);
    
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
    const category = await MenuCategory.findById(id);
    if (category && category.display_picture) {
      const urlParts = category.display_picture.split('/');
      const publicIdWithExtension = urlParts.slice(-2).join('/');
      const publicId = publicIdWithExtension.split('.')[0];
      
      try {
        await cloudinary.uploader.destroy(publicId);
        console.log('Image deleted from Cloudinary during category deletion');
      } catch (cloudinaryDeleteError) {
        console.warn('Could not delete image from Cloudinary:', cloudinaryDeleteError);
      }
    }

    const deletedCategory = await MenuCategory.softDelete(id);
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