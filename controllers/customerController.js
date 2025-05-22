// controllers/customerController.js
const Customer = require('../models/Customer');
const Joi = require('joi'); // Import Joi

// Define Joi schema for customer creation
const customerSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(), // Name is optional based on your schema
  phone_number: Joi.string().pattern(/^\+?[0-9]{7,15}$/).optional().allow(''), // Basic phone number pattern, optional, allows empty string
  email: Joi.string().email().optional().allow(''), // Valid email format, optional, allows empty string
  last_visit: Joi.date().iso().optional().allow(null), // ISO 8601 date format (YYYY-MM-DD), optional, allows null
});

exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll();
    res.status(200).json({
      status: 'success',
      count: customers.length,
      data: customers,
    });
  } catch (err) {
    console.error('Error getting all customers:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve customers',
    });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: customer,
    });
  } catch (err) {
    console.error(`Error getting customer ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve customer',
    });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    // Validate request body against the schema
    const { error, value } = customerSchema.validate(req.body, { abortEarly: false }); // abortEarly: false collects all errors

    if (error) {
      // If validation fails, send a 400 Bad Request with validation details
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.details.map(detail => detail.message),
      });
    }

    // If validation passes, 'value' contains the validated data
    const newCustomer = await Customer.createCustomer(value);
    res.status(201).json({
      status: 'success',
      data: newCustomer,
    });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create customer',
    });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    // You might want to add validation here too,
    // possibly with .allow(null) for fields that can be unset
    const updatedCustomer = await Customer.updateCustomer(req.params.id, req.body);

    if (!updatedCustomer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found or no fields to update',
      });
    }

    res.status(200).json({
      status: 'success',
      data: updatedCustomer,
    });
  } catch (err) {
    console.error(`Error updating customer ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update customer',
    });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const isDeleted = await Customer.deleteCustomer(req.params.id);

    if (!isDeleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Customer deleted successfully',
    });
  } catch (err) {
    console.error(`Error deleting customer ${req.params.id}:`, err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete customer',
    });
  }
};