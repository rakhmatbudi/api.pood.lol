const express = require('express');
const roundingController = require('../controllers/roundingController');
const authMiddleware = require('../middleware/authMiddleware'); // Essential for authentication
const tenantResolverMiddleware = require('../middleware/tenantResolverMiddleware');

const router = express.Router();

// Apply authentication and tenant resolution middleware to ALL subsequent routes in this router.
router.use(authMiddleware, tenantResolverMiddleware);

// All routes below this point will automatically have authMiddleware and tenantResolverMiddleware applied.

// --- Routes for applying rounding ---
router.post('/apply', roundingController.applyRounding);
/*
Example Request Body for POST /roundings/apply:
Option 1: Fixed Rounding Type
{
    "amount": 123.47,
    "roundingTypeId": 1 // Assuming ID 1 corresponds to a rounding_digit like "0.05"
}

Option 2: Dynamic Rounding based on RoundingValue table
{
    "amount": 123.47,
    "useDynamicRoundingValue": true // Triggers lookup in rounding_value table
}
*/

// --- Routes for managing rounding types (from rounding_type table) ---
router.get('/types', roundingController.getRoundingTypes);
router.post('/types', roundingController.createRoundingType);
/*
Example Request Body for POST /roundings/types:
{
    "rounding_digit": "0.05" // Or "0.10", "1", "0.01"
}
*/

// --- NEW: Routes for managing rounding values (from rounding_value table) ---
router.post('/values', roundingController.createRoundingValue);
/*
Example Request Body for POST /roundings/values:
{
    "rounding_below": 1000,
    "rounding_digit": 10
}
*/
router.get('/values', roundingController.getRoundingValues);
router.get('/values/:roundingBelow', roundingController.getRoundingValueByBelow);
router.put('/values/:roundingBelow', roundingController.updateRoundingValue);
router.delete('/values/:roundingBelow', roundingController.deleteRoundingValue);

module.exports = router;