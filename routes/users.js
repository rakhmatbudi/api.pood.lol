const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /users - Get a list of users, optionally filtered by role
router.get('/', userController.getUserList);

// POST /users/login - User login
router.post('/login', userController.login);

// POST /users - Create a new user
router.post('/', userController.createUser);

module.exports = router;