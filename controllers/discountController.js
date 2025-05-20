// controllers/discountController.js
const Discount = require('../models/Discount');

exports.getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.findAll();
    res.status(200).json({
      status: 'success',
      count: discounts.length,
      data: discounts,
    });
  } catch (err) {
    console.error('Error getting all discounts:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve discounts',
    });
  }
};

exports.getDiscountById = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) {
      return res.status(404).json({
        status: 'error',
        message: 'Discount not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: discount,
    });
  } catch (err) {
    console.error(`Error getting discount ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve discount',
    });
  }
};

exports.createDiscount = async (req, res) => {
  try {
    const newDiscount = await Discount.create(req.body);
    res.status(201).json({
      status: 'success',
      data: newDiscount,
    });
  } catch (err) {
    console.error('Error creating discount:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create discount',
    });
  }
};

exports.updateDiscount = async (req, res) => {
  try {
    const updatedDiscount = await Discount.update(req.params.id, req.body);
    if (!updatedDiscount) {
      return res.status(404).json({
        status: 'error',
        message: 'Discount not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: updatedDiscount,
    });
  } catch (err) {
    console.error(`Error updating discount ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update discount',
    });
  }
};

exports.deleteDiscount = async (req, res) => {
  try {
    const deletedDiscount = await Discount.delete(req.params.id);
    if (!deletedDiscount) {
      return res.status(404).json({
        status: 'error',
        message: 'Discount not found',
      });
    }
    res.status(200).json({
      status: 'success',
      message: 'Discount deleted successfully',
    });
  } catch (err) {
    console.error(`Error deleting discount ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete discount',
    });
  }
};