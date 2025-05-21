// controllers/roundingController.js
const RoundingType = require('../models/RoundingType');
const RoundingValue = require('../models/RoundingValue');

exports.applyRounding = async (req, res) => {
    const { amount, roundingTypeId, useDynamicRoundingValue = false } = req.body;

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
            const dynamicRule = await RoundingValue.getApplicableRoundingRule(amount); // Modified to fetch the full rule
            if (!dynamicRule) {
                return res.status(404).json({ status: 'error', message: 'No dynamic rounding rule found for the given amount.' });
            }
            effectiveRoundingDigitValue = dynamicRule.rounding_digit_description;
            associatedRoundingNumber = dynamicRule.rounding_number; // Get rounding_number from the dynamic rule
        } else {
            const roundingType = await RoundingType.findById(roundingTypeId);

            if (!roundingType) {
                return res.status(404).json({ status: 'error', message: 'Rounding type not found.' });
            }
            effectiveRoundingDigitValue = roundingType.rounding_digit;
            associatedRoundingNumber = roundingType.rounding_number; // Get rounding_number from the static type
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
                rounding_number: associatedRoundingNumber, // Include in response
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
    try {
        const roundingTypes = await RoundingType.findAll();
        res.status(200).json({ status: 'success', data: roundingTypes });
    } catch (error) {
        console.error('Error fetching rounding types:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch rounding types' });
    }
};

exports.createRoundingType = async (req, res) => {
    const { rounding_digit, rounding_number } = req.body; // Added rounding_number
    if (!rounding_digit || typeof rounding_number !== 'number') { // Basic validation
        return res.status(400).json({ status: 'error', message: 'Rounding digit and a valid rounding number are required.' });
    }
    try {
        const newType = await RoundingType.create({ rounding_digit, rounding_number }); // Pass rounding_number
        res.status(201).json({ status: 'success', data: newType });
    } catch (error) {
        console.error('Error creating rounding type:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create rounding type.' });
    }
};

// Existing methods for RoundingValue (no changes needed here unless you want rounding_number in their return)
exports.createRoundingValue = async (req, res) => {
    const { rounding_below, rounding_digit } = req.body;
    if (typeof rounding_below !== 'number' || typeof rounding_digit !== 'number') {
        return res.status(400).json({ status: 'error', message: 'Both rounding_below and rounding_digit must be numbers.' });
    }
    try {
        const newValue = await RoundingValue.create({ rounding_below, rounding_digit });
        res.status(201).json({ status: 'success', data: newValue });
    } catch (error) {
        console.error('Error creating rounding value:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create rounding value.' });
    }
};

exports.getRoundingValues = async (req, res) => {
    try {
        const roundingValues = await RoundingValue.findAll();
        res.status(200).json({ status: 'success', data: roundingValues });
    } catch (error) {
        console.error('Error fetching rounding values:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch rounding values.' });
    }
};

exports.getRoundingValueByBelow = async (req, res) => {
    const { roundingBelow } = req.params;
    if (isNaN(parseInt(roundingBelow))) {
        return res.status(400).json({ status: 'error', message: 'Invalid rounding_below value provided.' });
    }
    try {
        const value = await RoundingValue.findByRoundingBelow(parseInt(roundingBelow));
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
    if (isNaN(parseInt(roundingBelow)) || typeof rounding_digit !== 'number') {
        return res.status(400).json({ status: 'error', message: 'Invalid input for update.' });
    }
    try {
        const updatedValue = await RoundingValue.update(parseInt(roundingBelow), { rounding_digit });
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
    if (isNaN(parseInt(roundingBelow))) {
        return res.status(400).json({ status: 'error', message: 'Invalid rounding_below value provided.' });
    }
    try {
        const deletedValue = await RoundingValue.delete(parseInt(roundingBelow));
        if (!deletedValue) {
            return res.status(404).json({ status: 'error', message: 'Rounding value not found for deletion.' });
        }
        res.status(200).json({ status: 'success', message: 'Rounding value deleted successfully.', data: deletedValue });
    } catch (error) {
        console.error('Error deleting rounding value:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete rounding value.' });
    }
};