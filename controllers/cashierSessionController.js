// controller/cashierSessionController.js

const db = require('../config/db'); // Import your PostgreSQL connection pool
const CashierSession = require('../models/CashierSession');
const CashierSessionPayment = require('../models/CashierSessionPayment');
const CashierSessionTransaction = require('../models/CashierSessionTransaction');
const PaymentMode = require('../models/PaymentMode');

/**
 * Helper to ensure tenantId is present
 */
const getTenantId = (req, res) => {
    const tenantId = req.tenantId; // Assuming tenantId is attached by middleware
    if (!tenantId) {
        res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        return null;
    }
    return tenantId;
};

/**
 * Get all cashier sessions with pagination
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getAllSessions = async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        console.log("Getting Session information for tenant:", tenantId);

        // Pass tenantId to the model method
        const { rows, pagination } = await CashierSession.getAll(tenantId, page, limit);

        res.json({
            status: 'success',
            data: rows,
            pagination
        });
    } catch (error) {
        console.error('Error fetching cashier sessions:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve cashier sessions',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

/**
 * Get a specific cashier session by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getSessionById = async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    try {
        // Pass tenantId to the model method to scope the lookup
        const session = await CashierSession.getById(req.params.id, tenantId);

        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'Cashier session not found or does not belong to this tenant'
            });
        }

        res.json({
            status: 'success',
            data: session
        });
    } catch (error) {
        console.error('Error fetching cashier session:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve cashier session',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

/**
 * Open a new cashier session
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const openSession = async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    try {
        const { user_id, opening_amount, notes } = req.body;

        console.log(req.body);

        // Validate required fields
        if (!user_id || opening_amount === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID and opening amount are required'
            });
        }

        // Check if user already has an open session for THIS TENANT
        const hasOpenSession = await CashierSession.hasOpenSession(user_id, tenantId);
        if (hasOpenSession) {
            return res.status(400).json({
                status: 'error',
                message: 'User already has an open cashier session for this tenant'
            });
        }

        // Create new session, including tenantId
        const session = await CashierSession.open({
            user_id,
            opening_amount,
            notes,
            tenant_id: tenantId // Include tenant_id here
        });

        res.status(201).json({
            status: 'success',
            data: session,
            message: 'Cashier session opened successfully'
        });
    } catch (error) {
        console.error('Error opening cashier session:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to open cashier session',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

/**
 * Get all transactions for a specific cashier session
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getSessionTransactions = async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    try {
        const { sessionId } = req.params;

        // First, verify if the cashier session exists and belongs to the tenant
        const session = await CashierSession.getById(sessionId, tenantId);
        if (!session) {
            return res.status(404).json({ status: 'error', message: 'Cashier session not found or does not belong to this tenant.' });
        }

        // Get transactions scoped by session ID and tenant ID
        const transactions = await CashierSessionTransaction.getBySessionId(sessionId, tenantId);

        res.json({
            status: 'success',
            sessionId: sessionId,
            data: transactions,
            message: 'Cashier session transactions retrieved successfully'
        });

    } catch (error) {
        console.error('Error fetching cashier session transactions:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve cashier session transactions',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

/**
 * Handle deposit or withdrawal for a cashier session
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const handleCashTransaction = async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    try {
        const { sessionId } = req.params;
        const { type, amount, description } = req.body; // type: 'deposit' or 'withdrawal'

        // Validate required fields
        if (!type || !amount || !['deposit', 'withdrawal'].includes(type)) {
            return res.status(400).json({
                status: 'error',
                message: 'Transaction type (deposit/withdrawal) and amount are required'
            });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Amount must be a positive number'
            });
        }

        // Check if session exists and is open for this tenant
        const existingSession = await CashierSession.getById(sessionId, tenantId);
        if (!existingSession) {
            return res.status(404).json({ status: 'error', message: 'Cashier session not found or does not belong to this tenant' });
        }
        if (existingSession.closed_at) {
            return res.status(400).json({ status: 'error', message: 'Cashier session is already closed' });
        }

        // Create the transaction record, including tenantId
        const transaction = await CashierSessionTransaction.create({
            cashier_session_id: sessionId,
            type,
            amount: parsedAmount,
            description,
            tenant_id: tenantId // Include tenant_id
        });

        res.status(201).json({
            status: 'success',
            message: `Cashier session ${type} recorded successfully`,
            data: transaction
        });

    } catch (error) {
        console.error(`Error handling cash transaction:`, error);
        res.status(500).json({
            status: 'error',
            message: `Failed to record cash transaction`,
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

/**
 * Close an existing cashier session
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const closeSession = async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    try {
        const {
            closing_amount,
            expected_amount,
            notes,
            payment_mode_amounts,
            expected_payment_mode_amounts
        } = req.body;

        const sessionId = req.params.id;

        console.log('req.body:', req.body);

        // Validate if payment_mode_amounts is provided and is an object
        if (!payment_mode_amounts || typeof payment_mode_amounts !== 'object') {
            return res.status(400).json({
                status: 'error',
                message: 'Payment mode amounts are required and must be an object',
            });
        }

        // Initialize expected_payment_mode_amounts if not provided
        const expected = expected_payment_mode_amounts || {};

        // Check if session exists and is open for this tenant
        const existingSession = await CashierSession.getById(sessionId, tenantId);
        if (!existingSession) {
            return res.status(404).json({ status: 'error', message: 'Cashier session not found or does not belong to this tenant' });
        }
        if (existingSession.closed_at) {
            return res.status(400).json({ status: 'error', message: 'Cashier session is already closed' });
        }

        // Begin transaction
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            const createdPayments = [];

            // Get all predefined payment modes for this tenant from the database
            const paymentModes = await PaymentMode.findAll(tenantId);

            // Create payments for each payment mode that has a non-zero actual amount
            for (const modeDescription in payment_mode_amounts) {
                if (payment_mode_amounts.hasOwnProperty(modeDescription)) {
                    const actualAmount = parseFloat(payment_mode_amounts[modeDescription] || 0);

                    // Get the expected amount for this payment mode, defaulting to the actual amount if not provided
                    const expectedAmountForMode = parseFloat(expected[modeDescription] || actualAmount);

                    // Only create a payment record if there's an actual or expected amount
                    if (actualAmount !== 0 || expectedAmountForMode !== 0) {
                        const paymentMode = paymentModes.find(pm => pm.description === modeDescription);

                        if (paymentMode) {
                            const newPayment = await CashierSessionPayment.create({
                                cashier_session_id: sessionId,
                                payment_mode_id: paymentMode.id,
                                expected_amount: expectedAmountForMode,
                                actual_amount: actualAmount,
                                notes: `Closing amount for ${modeDescription}`,
                                tenant_id: tenantId // Include tenant_id
                            }, client); // Pass client for transaction control

                            createdPayments.push(newPayment);
                        } else {
                            console.warn(`Payment mode "${modeDescription}" not found for tenant ${tenantId} in the database.`);
                        }
                    }
                }
            }

            // Check if there are expected amounts for payment modes not in payment_mode_amounts
            for (const modeDescription in expected) {
                if (expected.hasOwnProperty(modeDescription) &&
                    !payment_mode_amounts.hasOwnProperty(modeDescription)) {

                    const expectedAmountForMode = parseFloat(expected[modeDescription] || 0);

                    if (expectedAmountForMode !== 0) {
                        const paymentMode = paymentModes.find(pm => pm.description === modeDescription);

                        if (paymentMode) {
                            const newPayment = await CashierSessionPayment.create({
                                cashier_session_id: sessionId,
                                payment_mode_id: paymentMode.id,
                                expected_amount: expectedAmountForMode,
                                actual_amount: 0, // No actual amount provided
                                notes: `Expected amount for ${modeDescription}`,
                                tenant_id: tenantId // Include tenant_id
                            }, client); // Pass client for transaction control

                            createdPayments.push(newPayment);
                        } else {
                            console.warn(`Payment mode "${modeDescription}" not found for tenant ${tenantId} in the database.`);
                        }
                    }
                }
            }

            // Update session with closing details, scoped by tenantId
            const updatedSession = await CashierSession.close(sessionId, {
                closing_amount,
                expected_amount,
                notes,
            }, tenantId, client); // Pass tenantId and client

            await client.query('COMMIT');

            res.json({
                status: 'success',
                data: { updatedSession, createdPayments },
                message: 'Cashier session closed successfully with payment mode details recorded',
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error closing cashier session:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to close cashier session and record payment details',
            error: process.env.NODE_ENV === 'development' ? error.message : {},
        });
    }
};

/**
 * Get current open session for a user (if any)
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getCurrentUserSession = async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    try {
        const userId = req.params.userId;

        // Get session scoped by user ID and tenant ID
        const session = await CashierSession.getCurrentByUserId(userId, tenantId);

        if (!session) {
            return res.json({
                status: 'success',
                data: null,
                message: 'No open cashier session found for this user and tenant'
            });
        }

        res.json({
            status: 'success',
            data: session
        });
    } catch (error) {
        console.error('Error fetching current cashier session:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve current cashier session',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

/**
 * Get current open session (globally for the tenant, or for the current user if intended this way)
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getCurrentSession = async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    try {
        // This function's intent is a bit ambiguous for multi-tenancy.
        // If it's meant to get *any* open session for the tenant,
        // it should pass tenantId. If it's meant for the *current user's* session,
        // getCurrentUserSession is more appropriate.
        // Assuming it's meant to get the current user's session from the logged-in user (req.user.id),
        // or a global current session for the tenant if that's the design.
        // For now, let's assume it should get a session for the tenant,
        // potentially requiring an additional user ID if not implicitly handled by the model.
        // For strong multi-tenancy, often `getCurrentUserSession` is preferred.
        // If `CashierSession.getCurrentSession()` in the model implies finding
        // *the* active session for the current `user_id` (which needs to be passed),
        // or if it finds *any* open session for the tenant, the model method needs clarification.
        // I'll pass the tenantId.
        const session = await CashierSession.getCurrentSession(tenantId);

        if (!session) {
            return res.json({
                status: 'success',
                data: null,
                message: 'No open cashier session found for this tenant'
            });
        }

        res.json({
            status: 'success',
            data: session
        });
    } catch (error) {
        console.error('Error fetching current cashier session:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve current cashier session',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
}

/**
 * Get payments for a specific cashier session grouped by payment mode
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getPaymentsGroupedByMode = async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    const { sessionId } = req.params;
    try {
        // First, verify if the cashier session exists and belongs to the tenant
        const session = await CashierSession.getById(sessionId, tenantId);
        if (!session) {
            return res.status(404).json({ status: 'error', message: 'Cashier session not found or does not belong to this tenant.' });
        }

        // Fetch all payments for the given session ID and tenant ID
        const paymentsData = await CashierSessionPayment.getBySessionId(sessionId, tenantId);
        if (!paymentsData || paymentsData.length === 0) {
            return res.status(200).json({
                status: 'success',
                sessionId: sessionId,
                data: { payments: [] },
                totalGroupedAmount: { total: 0 }
            });
        }

        // Calculate the total amounts from expected_amount instead of actual_amount
        const totalGroupedAmount = {};
        for (const payment of paymentsData) {
            const mode = payment.payment_mode; // Assuming payment_mode is joined or present
            if (!totalGroupedAmount[mode]) {
                totalGroupedAmount[mode] = 0;
            }
            totalGroupedAmount[mode] += parseFloat(payment.expected_amount);
        }

        // Calculate the total sum
        totalGroupedAmount.total = Object.values(totalGroupedAmount)
            .filter(value => typeof value === 'number')
            .reduce((sum, amount) => sum + amount, 0);

        // Return the data in the requested format
        return res.status(200).json({
            status: 'success',
            sessionId: sessionId,
            data: {
                payments: paymentsData
            },
            totalGroupedAmount: totalGroupedAmount,
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve payments.',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

/**
 * Create a new payment for a cashier session
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const createPayment = async (req, res) => {
    const tenantId = getTenantId(req, res);
    if (!tenantId) return;

    try {
        const { cashier_session_id, payment_mode_id, expected_amount, actual_amount, notes } = req.body;

        // Validate required fields
        if (!cashier_session_id || !payment_mode_id || expected_amount === undefined || actual_amount === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'Cashier session ID, payment mode ID, expected amount, and actual amount are required'
            });
        }

        // Optional but recommended: Verify if the cashier_session_id belongs to the tenant
        const session = await CashierSession.getById(cashier_session_id, tenantId);
        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'Cashier session not found or does not belong to this tenant for payment creation.'
            });
        }

        const newPayment = await CashierSessionPayment.create({
            cashier_session_id,
            payment_mode_id,
            expected_amount,
            actual_amount,
            notes,
            tenant_id: tenantId // Include tenant_id
        });

        res.status(201).json({
            status: 'success',
            message: 'Payment created successfully',
            data: newPayment
        });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create payment',
            error: process.env.NODE_ENV === 'development' ? error.message : {}
        });
    }
};

module.exports = {
    getAllSessions,
    getSessionById,
    openSession,
    closeSession,
    getCurrentUserSession,
    getCurrentSession,
    getPaymentsGroupedByMode,
    handleCashTransaction,
    createPayment,
    getSessionTransactions
};