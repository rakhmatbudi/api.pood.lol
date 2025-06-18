// routes/cashierSession.js

const express = require('express');
const router = express.Router();
const cashierSessionController = require('../controllers/cashierSessionController');
const { getTempTenantId } = require('../middleware/tempTenantMiddleware'); // <--- IMPORT the tenant middleware

// Get all cashier sessions with pagination
router.get('/', getTempTenantId, cashierSessionController.getAllSessions);

// Get current open session (session can be opened and closed by different user. At any one time, there is only one session allowed)
router.get('/current', getTempTenantId, cashierSessionController.getCurrentSession);

// Open a new cashier session
router.post('/open', getTempTenantId, cashierSessionController.openSession);

// Get a specific cashier session by ID
router.get('/:id', getTempTenantId, cashierSessionController.getSessionById);

// Close an existing cashier session
router.put('/:id/close', getTempTenantId, cashierSessionController.closeSession);
//{
//  "closing_amount": 300000, // The total closing amount (can be optional or derived)
//  "expected_amount": 300000, // The expected total amount (can be optional or derived)
//  "notes": "End of day closing.",
//  "payment_mode_amounts": {
//    "Cash Sales": 100000,
//    "EDC BRI": 200000,
//    "EDC Mandiri": 200000,
//    "EDC CIMB Niaga": 100000,
//    "Transfer BCA": 0,
//    "Transfer Mandiri": 0,
//    "Transfer BRI": 0,
//    "Gopay": 0,
//    "OVO": 0
//
//  }
//}

// Get current open session for a user
router.get('/user/:userId/current', getTempTenantId, cashierSessionController.getCurrentUserSession);

// Get payments for a specific cashier session grouped by payment mode
router.get('/:sessionId/payments/grouped-by-mode', getTempTenantId, cashierSessionController.getPaymentsGroupedByMode);

// Consolidated Transaction Routes:
// Handle deposit or withdrawal for a cashier session (POST)
router.post('/:sessionId/transaction', getTempTenantId, cashierSessionController.handleCashTransaction);

// Get all transactions for a specific cashier session (GET)
router.get('/:sessionId/transaction', getTempTenantId, cashierSessionController.getSessionTransactions);


module.exports = router;