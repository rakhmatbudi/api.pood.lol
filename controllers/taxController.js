// controllers/taxController.js

const Tax = require('../models/Tax'); // Import the Tax model

exports.getTaxRates = async (req, res) => {
  try {
    const taxes = await Tax.findAll();
    res.status(200).json({ status: 'success', data: taxes });
  } catch (error) {
    console.error('Error fetching taxes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch taxes',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

exports.calculateTax = async (req, res) => {
  try {
    const { amount, taxId } = req.body;

    if (amount === undefined || taxId === undefined) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide amount and taxId for calculation.'
      });
    }

    const tax = await Tax.findById(taxId);

    if (!tax) {
      return res.status(404).json({ status: 'fail', message: 'Tax not found.' });
    }

    const taxAmount = parseFloat((amount * (tax.amount || 0)).toFixed(2));

    res.status(200).json({
      status: 'success',
      data: {
        amount: parseFloat(amount),
        taxRate: tax.amount,
        tax: taxAmount,
        taxDetails: tax
      }
    });
  } catch (error) {
    console.error('Error calculating tax:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to calculate tax',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

exports.getTaxRules = async (req, res) => {
  try {
    const taxes = await Tax.findAll();
    res.status(200).json({ status: 'success', data: taxes });
  } catch (error) {
    console.error('Error fetching tax rules:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tax rules',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

exports.getTaxRuleById = async (req, res) => {
  try {
    const { id } = req.params;
    const taxRule = await Tax.findById(id);

    if (!taxRule) {
      return res.status(404).json({ status: 'fail', message: 'Tax rule not found' });
    }

    res.status(200).json({ status: 'success', data: taxRule });
  } catch (error) {
    console.error('Error fetching tax rule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tax rule',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

exports.createTaxRule = async (req, res) => {
  try {
    const newTaxRule = await Tax.create(req.body);
    res.status(201).json({ status: 'success', data: newTaxRule });
  } catch (error) {
    console.error('Error creating tax rule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create tax rule',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

exports.updateTaxRule = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTaxRule = await Tax.update(id, req.body);

    if (!updatedTaxRule) {
      return res.status(404).json({ status: 'fail', message: 'Tax rule not found' });
    }

    res.status(200).json({ status: 'success', data: updatedTaxRule });
  } catch (error) {
    console.error('Error updating tax rule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update tax rule',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

exports.deleteTaxRule = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTaxRule = await Tax.delete(id);

    if (!deletedTaxRule) {
      return res.status(404).json({ status: 'fail', message: 'Tax rule not found' });
    }

    res.status(204).json(); // 204 No Content for successful deletion
  } catch (error) {
    console.error('Error deleting tax rule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete tax rule',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};