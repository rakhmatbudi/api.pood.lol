// controllers/roundingController.js
const RoundingType = require('../models/RoundingType');
const RoundingValue = require('../models/RoundingValue');

exports.applyRounding = async (req, res) => {
    const { amount, roundingTypeId, useDynamicRoundingValue = false } = req.body;
    // IMPORTANT: Get tenantId from the authenticated user.
    // This assumes you have middleware that attaches user information (including tenantId) to req.user.
    const tenantId = req.user.tenantId; // <--- ADDED: Retrieve tenantId

    if (typeof amount !== 'number' || amount < 0) {
        return res.status(400).json({ status: 'error', message: 'Invalid amount provided. Must be a non-negative number.' });
    }
    if (!roundingTypeId && !useDynamicRoundingValue) {
        return res.status(400).json({ status: 'error', message: 'Rounding type ID is required, or dynamic rounding must be enabled.' });
    }

    try {
        let effectiveRoundingDigitValue;
        let associatedRoundingNumber = null; // Initialize to null

        if (useDynamicRoundingValue) {
            // Pass tenantId to the model method
            const dynamicRule = await RoundingValue.getApplicableRoundingRule(amount, tenantId); // <--- MODIFIED
            if (!dynamicRule) {
                return res.status(404).json({ status: 'error', message: 'No dynamic rounding rule found for the given amount.' });
            }
            effectiveRoundingDigitValue = dynamicRule.rounding_digit_description;
            associatedRoundingNumber = dynamicRule.rounding_number;
        } else {
            // Pass tenantId to the model method
            const roundingType = await RoundingType.findById(roundingTypeId, tenantId); // <--- MODIFIED

            if (!roundingType) {
                return res.status(404).json({ status: 'error', message: 'Rounding type not found.' });
            }
            effectiveRoundingDigitValue = roundingType.rounding_digit;
            associatedRoundingNumber = roundingType.rounding_number;
        }

        let roundedAmount;
        const parseRoundingDigit = parseFloat(effectiveRoundingDigitValue);

        if (isNaN(parseRoundingDigit) || parseRoundingDigit <= 0) {
            console.warn(`Invalid rounding_digit configured: ${effectiveRoundingDigitValue}. Defaulting to standard rounding.`);
            roundedAmount = Math.round(amount);
        } else {
            roundedAmount = Math.round(amount / parseRoundingDigit) * parseRoundingDigit;
            roundedAmount = parseFloat(roundedAmount.toFixed(2));
        }

        res.status(200).json({
            status: 'success',
            data: {
                original_amount: amount,
                rounding_rule_applied: effectiveRoundingDigitValue,
                rounding_number: associatedRoundingNumber,
                rounded_amount: roundedAmount,
                method: useDynamicRoundingValue ? 'dynamic_value_based' : 'fixed_type_based'
            }
        });

    } catch (error) {
        console.error('Error applying rounding:', error);
        res.status(500).json({ status: 'error', message: 'Failed to apply rounding' });
    }
};

exports.getRoundingTypes = async (req, res) => {
    // IMPORTANT: Get tenantId from the authenticated user.
    const tenantId = req.user.tenantId; // <--- ADDED: Retrieve tenantId
    try {
        // Pass tenantId to the model method
        const roundingTypes = await RoundingType.findAll(tenantId); // <--- MODIFIED
        res.status(200).json({ status: 'success', data: roundingTypes });
    } catch (error) {
        console.error('Error fetching rounding types:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch rounding types' });
    }
};

exports.createRoundingType = async (req, res) => {
    const { rounding_digit, rounding_number } = req.body;
    // IMPORTANT: Get tenantId from the authenticated user.
    const tenantId = req.user.tenantId; // <--- ADDED: Retrieve tenantId

    if (!rounding_digit || typeof rounding_number !== 'number') {
        return res.status(400).json({ status: 'error', message: 'Rounding digit and a valid rounding number are required.' });
    }
    try {
        // Pass tenantId to the model method
        const newType = await RoundingType.create({ rounding_digit, rounding_number }, tenantId); // <--- MODIFIED
        res.status(201).json({ status: 'success', data: newType });
    } catch (error) {
        console.error('Error creating rounding type:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create rounding type.' });
    }
};

exports.createRoundingValue = async (req, res) => {
    const { rounding_below, rounding_digit } = req.body;
    // IMPORTANT: Get tenantId from the authenticated user.
    const tenantId = req.user.tenantId; // <--- ADDED: Retrieve tenantId

    if (typeof rounding_below !== 'number' || typeof rounding_digit !== 'number') {
        return res.status(400).json({ status: 'error', message: 'Both rounding_below and rounding_digit must be numbers.' });
    }
    try {
        // Pass tenantId to the model method
        const newValue = await RoundingValue.create({ rounding_below, rounding_digit }, tenantId); // <--- MODIFIED
        res.status(201).json({ status: 'success', data: newValue });
    } catch (error) {
        console.error('Error creating rounding value:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create rounding value.' });
    }
};

exports.getRoundingValues = async (req, res) => {
    // IMPORTANT: Get tenantId from the authenticated user.
    const tenantId = req.user.tenantId; // <--- ADDED: Retrieve tenantId
    try {
        // Pass tenantId to the model method
        const roundingValues = await RoundingValue.findAll(tenantId); // <--- MODIFIED
        res.status(200).json({ status: 'success', data: roundingValues });
    } catch (error) {
        console.error('Error fetching rounding values:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch rounding values.' });
    }
};

exports.getRoundingValueByBelow = async (req, res) => {
    const { roundingBelow } = req.params;
    // IMPORTANT: Get tenantId from the authenticated user.
    const tenantId = req.user.tenantId; // <--- ADDED: Retrieve tenantId

    if (isNaN(parseInt(roundingBelow))) {
        return res.status(400).json({ status: 'error', message: 'Invalid rounding_below value provided.' });
    }
    try {
        // Pass tenantId to the model method
        const value = await RoundingValue.findByRoundingBelow(parseInt(roundingBelow), tenantId); // <--- MODIFIED
        if (!value) {
            return res.status(404).json({ status: 'error', message: 'Rounding value not found.' });
        }
        res.status(200).json({ status: 'success', data: value });
    } catch (error) {
        console.error('Error fetching rounding value by below:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch rounding value.' });
    }
};

exports.updateRoundingValue = async (req, res) => {
    const { roundingBelow } = req.params;
    const { rounding_digit } = req.body;
    // IMPORTANT: Get tenantId from the authenticated user.
    const tenantId = req.user.tenantId; // <--- ADDED: Retrieve tenantId

    if (isNaN(parseInt(roundingBelow)) || typeof rounding_digit !== 'number') {
        return res.status(400).json({ status: 'error', message: 'Invalid input for update.' });
    }
    try {
        // Pass tenantId to the model method
        const updatedValue = await RoundingValue.update(parseInt(roundingBelow), { rounding_digit }, tenantId); // <--- MODIFIED
        if (!updatedValue) {
            return res.status(404).json({ status: 'error', message: 'Rounding value not found for update.' });
        }
        res.status(200).json({ status: 'success', data: updatedValue });
    } catch (error) {
        console.error('Error updating rounding value:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update rounding value.' });
    }
};

exports.deleteRoundingValue = async (req, res) => {
    const { roundingBelow } = req.params;
    // IMPORTANT: Get tenantId from the authenticated user.
    const tenantId = req.user.tenantId; // <--- ADDED: Retrieve tenantId

    if (isNaN(parseInt(roundingBelow))) {
        return res.status(400).json({ status: 'error', message: 'Invalid rounding_below value provided.' });
    }
    try {
        // Pass tenantId to the model method
        const deletedValue = await RoundingValue.delete(parseInt(roundingBelow), tenantId); // <--- MODIFIED
        if (!deletedValue) {
            return res.status(404).json({ status: 'error', message: 'Rounding value not found for deletion.' });
        }
        res.status(200).json({ status: 'success', message: 'Rounding value deleted successfully.', data: deletedValue });
    } catch (error) {
        console.error('Error deleting rounding value:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete rounding value.' });
    }
};