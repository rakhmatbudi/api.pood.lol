const CashDenomination = require('../models/CashDenomination');

// Controller function to get all cash denominations
const getAllDenominations = async (req, res) => {
  try {
    const denominations = await CashDenomination.findAll();
    //res.status(200).json(denominations);
    res.status(200).json({
      status: 'success',
      count: denominations.length,
      data: {
        denominations,
      },
    });
  } catch (error) {
    console.error('Error fetching cash denominations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch cash denominations',
      error: process.env.NODE_ENV === 'development' ? error.message : {},
    });
  }
};

module.exports = {
  getAllDenominations,
};