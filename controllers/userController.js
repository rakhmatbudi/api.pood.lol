const User = require('../models/User');
const jwt = require('jsonwebtoken'); // Add this import at the top
const Joi = require('joi'); // Add this import for Joi validation

exports.getUserList = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};

    if (role) {
      filter.role = role;
    }

    const users = await User.findAll(filter);

    res.status(200).json({
      status: 'success',
      count: users.length,
      data: {
        users,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : {},
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password',
      });
    }

    // Use the model to find the user
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
    }
    
    // Use the model to verify the password
    const isPasswordValid = await User.verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials',
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    // Remove sensitive data
    delete user.password;
    
    res.status(200).json({
      status: 'success',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : {},
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    // Validate input using Joi
    const schema = Joi.object({
      name: Joi.string().required().min(2).max(100),
      email: Joi.string().email().required(),
      password: Joi.string().required().min(8),
      role_id: Joi.number().integer().min(1)
    });
    
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input data',
        error: error.details[0].message
      });
    }
    
    // Check if email is already in use
    const emailExists = await User.emailExists(value.email);
    if (emailExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is already in use'
      });
    }
    
    // Create the new user
    const newUser = await User.create(value);
    
    // Generate a token for the new user
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role_id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.status(201).json({
      status: 'success',
      data: {
        user: newUser,
        token
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};