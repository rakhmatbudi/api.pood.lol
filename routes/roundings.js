const express = require('express');
const roundingController = require('../controllers/roundingController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- ADDED: Import the tenant middleware

const router = express.Router();

// --- Routes for applying rounding ---
router.post('/apply', getTempTenantId, roundingController.applyRounding); // <--- ADDED getTempTenantId
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
router.get('/types', getTempTenantId, roundingController.getRoundingTypes); // <--- ADDED getTempTenantId
router.post('/types', getTempTenantId, roundingController.createRoundingType); // <--- ADDED getTempTenantId
/*
Example Request Body for POST /roundings/types:
{
    "rounding_digit": "0.05" // Or "0.10", "1", "0.01"
}
*/

// --- NEW: Routes for managing rounding values (from rounding_value table) ---
router.post('/values', getTempTenantId, roundingController.createRoundingValue); // <--- ADDED getTempTenantId
/*
Example Request Body for POST /roundings/values:
{
    "rounding_below": 1000,
    "rounding_digit": 10
}
*/
router.get('/values', getTempTenantId, roundingController.getRoundingValues); // <--- ADDED getTempTenantId
router.get('/values/:roundingBelow', getTempTenantId, roundingController.getRoundingValueByBelow); // <--- ADDED getTempTenantId
router.put('/values/:roundingBelow', getTempTenantId, roundingController.updateRoundingValue); // <--- ADDED getTempTenantId
router.delete('/values/:roundingBelow', getTempTenantId, roundingController.deleteRoundingValue); // <--- ADDED getTempTenantId

module.exports = router;