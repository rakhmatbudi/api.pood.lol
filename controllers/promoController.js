// controllers/promoController.js
const Promo = require('../models/Promo');

// Get all promos
exports.getAllPromos = async (req, res) => {
  try {
    const promos = await Promo.findAll();
    res.status(200).json({
      status: 'success',
      data: promos
    });
  } catch (error) {
    console.error('Error fetching all promos:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve promos',
      details: error.message
    });
  }
};

// Get promo by ID
exports.getPromoById = async (req, res) => {
  try {
    const { id } = req.params;
    const promo = await Promo.findById(id);
    if (!promo) {
      return res.status(404).json({
        status: 'error',
        message: 'Promo not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: promo
    });
  } catch (error) {
    console.error(`Error fetching promo ${req.params.id}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve promo',
      details: error.message
    });
  }
};

// Create a new promo
exports.createPromo = async (req, res) => {
  try {
    const newPromo = await Promo.create(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Promo created successfully',
      data: newPromo
    });
  } catch (error) {
    console.error('Error creating promo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create promo',
      details: error.message
    });
  }
};

// Update an existing promo
exports.updatePromo = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedPromo = await Promo.update(id, req.body);
    if (!updatedPromo) {
      return res.status(404).json({
        status: 'error',
        message: 'Promo not found'
      });
    }
    res.status(200).json({
      status: 'success',
      message: 'Promo updated successfully',
      data: updatedPromo
    });
  } catch (error) {
    console.error(`Error updating promo ${req.params.id}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update promo',
      details: error.message
    });
  }
};

// Delete a promo
exports.deletePromo = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPromo = await Promo.delete(id);
    if (!deletedPromo) {
      return res.status(404).json({
        status: 'error',
        message: 'Promo not found'
      });
    }
    res.status(200).json({
      status: 'success',
      message: 'Promo deleted successfully',
      data: deletedPromo
    });
  } catch (error) {
    console.error(`Error deleting promo ${req.params.id}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete promo',
      details: error.message
    });
  }
};