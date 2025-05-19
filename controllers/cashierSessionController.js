const db = require('../config/db'); // Import your PostgreSQL connection pool
const CashierSession = require('../models/CashierSession');
const CashierSessionPayment = require('../models/CashierSessionPayment'); // Ensure this is properly imported
const PaymentMode = require('../models/PaymentMode');

/**
 * Get all cashier sessions with pagination
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getAllSessions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    console.log("Getting Session information");
    
    const { rows, pagination } = await CashierSession.getAll(page, limit);

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
  try {
    const session = await CashierSession.getById(req.params.id);

    if (!session) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Cashier session not found' 
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

    // Check if user already has an open session
    const hasOpenSession = await CashierSession.hasOpenSession(user_id);
    if (hasOpenSession) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'User already has an open cashier session' 
      });
    }

    // Create new session
    const session = await CashierSession.open({
      user_id,
      opening_amount,
      notes
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
 * Close an existing cashier session
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const closeSession = async (req, res) => {
  try {
    const { 
      closing_amount, 
      expected_amount, 
      notes, 
      payment_mode_amounts, 
      expected_payment_mode_amounts // New parameter
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

    // Check if session exists and is open
    const existingSession = await CashierSession.getById(sessionId);
    if (!existingSession) {
      return res.status(404).json({ status: 'error', message: 'Cashier session not found' });
    }
    if (existingSession.closed_at) {
      return res.status(400).json({ status: 'error', message: 'Cashier session is already closed' });
    }

    // Begin transaction
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      const createdPayments = [];

      // Get all predefined payment modes from the database
      const paymentModes = await PaymentMode.findAll();

      // Create payments for each payment mode that has a non-zero actual amount
      for (const modeDescription in payment_mode_amounts) {
        if (payment_mode_amounts.hasOwnProperty(modeDescription)) {
          const actualAmount = parseFloat(payment_mode_amounts[modeDescription] || 0);
          
          // Get the expected amount for this payment mode, defaulting to the actual amount if not provided
          const expectedAmount = parseFloat(expected[modeDescription] || actualAmount);
          
          // Only create a payment record if there's an actual or expected amount
          if (actualAmount !== 0 || expectedAmount !== 0) {
            const paymentMode = paymentModes.find(pm => pm.description === modeDescription);
            
            if (paymentMode) {
              const newPayment = await CashierSessionPayment.create({
                cashier_session_id: sessionId,
                payment_mode_id: paymentMode.id,
                expected_amount: expectedAmount,
                actual_amount: actualAmount,
                notes: `Closing amount for ${modeDescription}`,
              });
              
              createdPayments.push(newPayment);
            } else {
              console.warn(`Payment mode "${modeDescription}" not found in the database.`);
            }
          }
        }
      }

      // Check if there are expected amounts for payment modes not in payment_mode_amounts
      for (const modeDescription in expected) {
        if (expected.hasOwnProperty(modeDescription) && 
            !payment_mode_amounts.hasOwnProperty(modeDescription)) {
          
          const expectedAmount = parseFloat(expected[modeDescription] || 0);
          
          if (expectedAmount !== 0) {
            const paymentMode = paymentModes.find(pm => pm.description === modeDescription);
            
            if (paymentMode) {
              const newPayment = await CashierSessionPayment.create({
                cashier_session_id: sessionId,
                payment_mode_id: paymentMode.id,
                expected_amount: expectedAmount,
                actual_amount: 0, // No actual amount provided
                notes: `Expected amount for ${modeDescription}`,
              });
              
              createdPayments.push(newPayment);
            } else {
              console.warn(`Payment mode "${modeDescription}" not found in the database.`);
            }
          }
        }
      }

      // Update session with closing details
      const updatedSession = await CashierSession.close(sessionId, {
        closing_amount,
        expected_amount,
        notes,
      });

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
  try {
    const userId = req.params.userId;
    
    const session = await CashierSession.getCurrentByUserId(userId);

    if (!session) {
      return res.json({ 
        status: 'success', 
        data: null,
        message: 'No open cashier session found for this user' 
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
 * Get current open session
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const getCurrentSession = async (req, res) => {
  try {
    const session = await CashierSession.getCurrentSession();

    if (!session) {
      return res.json({ 
        status: 'success', 
        data: null,
        message: 'No open cashier session found' 
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
  const { sessionId } = req.params;
  try {
    // First, verify if the cashier session exists
    const session = await CashierSession.getById(sessionId);
    if (!session) {
      return res.status(404).json({ status: 'error', message: 'Cashier session not found.' });
    }
    
    // Fetch all payments for the given session ID
    const paymentsData = await CashierSessionPayment.getBySessionId(sessionId);
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
      const mode = payment.payment_mode;
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
  try {
    const { cashier_session_id, payment_mode_id, expected_amount, actual_amount, notes } = req.body;

    // Validate required fields
    if (!cashier_session_id || !payment_mode_id || expected_amount === undefined || actual_amount === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Cashier session ID, payment mode ID, expected amount, and actual amount are required'
      });
    }

    const newPayment = await CashierSessionPayment.create({
      cashier_session_id,
      payment_mode_id,
      expected_amount,
      actual_amount,
      notes
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
  getPaymentsGroupedByMode, // Export the new controller function
  createPayment
};