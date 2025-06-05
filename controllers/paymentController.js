// controllers/paymentController.js
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const PromoItem = require('../models/PromoItem'); // Ensure this is imported

// Helper function to get discount details (changed table name from 'discounts' to 'discount')
async function getDiscountById(discountId) {
    try {
        const db = require('../config/db');
        // Corrected table name from 'discounts' to 'discount'
        const query = 'SELECT * FROM discount WHERE id = $1';
        const { rows } = await db.query(query, [discountId]);
        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching discount:', error);
        return null;
    }
}

// Helper function to get promo details by ID (does not check activity/dates)
async function getPromoById(promoId) {
    try {
        const db = require('../config/db');
        const query = 'SELECT * FROM promo WHERE promo_id = $1';
        const { rows } = await db.query(query, [promoId]);
        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching promo:', error);
        return null;
    }
}

// UPDATED: Helper function to get the current date in YYYY-MM-DD format using local server time
function getCurrentDateSimple() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to find the first active, date-valid promo
async function getAutomaticPromo() {
    try {
        const db = require('../config/db');
        // Using the simplified date function
        const currentDate = getCurrentDateSimple(); 

        // Query for active promos where today's date falls within the range
        // Ordered by promo_id (or created_at) to ensure "first found" is consistent
        const query = `
            SELECT *
            FROM promo
            WHERE is_active = TRUE
              AND start_date <= $1::date
              AND end_date >= $1::date
            ORDER BY promo_id ASC
            LIMIT 1;
        `;
        const { rows } = await db.query(query, [currentDate]);
        return rows[0] || null; // Return the first active promo found, or null
    } catch (error) {
        console.error('Error fetching automatic promo:', error);
        return null;
    }
}

// Helper to validate a specific promo by ID, including activity and date
async function validateSpecificPromo(promoId) {
    try {
        const promo = await getPromoById(promoId); // getPromoById does not check active/dates
        if (!promo) return null; // Promo not found

        // Using the simplified date function
        const currentDate = getCurrentDateSimple();
        // Convert promo dates to YYYY-MM-DD string for comparison if they are stored as timestamps
        const promoStartDate = new Date(promo.start_date).toISOString().split('T')[0];
        const promoEndDate = new Date(promo.end_date).toISOString().split('T')[0];

        if (promo.is_active === true &&
            promoStartDate <= currentDate &&
            promoEndDate >= currentDate) {
            return promo; // Promo is valid
        }
        return null; // Not active or out of date range
    } catch (error) {
        console.error('Error validating specific promo:', error);
        return null;
    }
}

exports.processPayment = async (req, res) => {
    const { order_id, amount, payment_mode, transaction_id, discount_id, promo_id: requested_promo_id } = req.body;

    let promo_id_to_use = null; // This will hold the promo_id that is actually applied
    let promoInfo = null;       // This will hold the details of the applied promo

    try {
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        const allOrderItems = await OrderItem.findAllByOrderId(order_id);
        const activeItems = allOrderItems.filter(item => item.status !== 'cancelled');

        if (activeItems.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No active items in order to process payment'
            });
        }

        // Step 1: Calculate total_amount (sum of active order items' total_price)
        const totalAmount = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

        // Step 2: Calculate Discount Amount
        let discountAmount = 0;
        let discountInfo = null;

        if (discount_id) {
            discountInfo = await getDiscountById(discount_id);
            if (discountInfo) {
                discountAmount = totalAmount * (parseFloat(discountInfo.amount) / 100);
                discountAmount = Math.min(discountAmount, totalAmount); // Cap discount
            }
        }

        // Determine which promo to apply (explicitly requested or automatic)
        if (requested_promo_id) {
            // First, try to validate the explicitly requested promo
            const validatedPromo = await validateSpecificPromo(requested_promo_id);
            if (validatedPromo) {
                promoInfo = validatedPromo;
                promo_id_to_use = promoInfo.promo_id;
                // console.log(`Using explicitly requested and validated promo_id: ${promo_id_to_use}`); // Removed debug log
            } else {
                // console.log(`Explicitly requested promo_id ${requested_promo_id} is invalid, inactive, or out of date range. Attempting automatic promo.`); // Removed debug log
                // If requested promo is invalid, fall back to automatic check
                promoInfo = await getAutomaticPromo();
                if (promoInfo) {
                    promo_id_to_use = promoInfo.promo_id;
                    // console.log(`Automatically applied promo ${promo_id_to_use}.`); // Removed debug log
                } else {
                    // console.log('No automatic promo found.'); // Removed debug log
                }
            }
        } else {
            // No promo_id provided in request, try to find an automatic one
            promoInfo = await getAutomaticPromo();
            if (promoInfo) {
                promo_id_to_use = promoInfo.promo_id;
                // console.log(`Automatically applied promo ${promo_id_to_use}.`); // Removed debug log
            } else {
                // console.log('No automatic promo found.'); // Removed debug log
            }
        }

        // Step 3: Calculate Promo Amount (now using promo_id_to_use and promoInfo)
        let promoAmount = 0;
        let promoEligibleBaseAmount = 0;

        if (promo_id_to_use && promoInfo) { // Only proceed if a promo is determined to be used
            const eligiblePromoItemIds = await PromoItem.findByPromoId(promo_id_to_use);

            if (eligiblePromoItemIds.length === 0) {
                // Scenario 1: promo_item table for this promo_id is empty -> applies to ALL
                promoEligibleBaseAmount = totalAmount;
                // console.log(`Promo ${promo_id_to_use} applies to all items. Base for promo calculation: $${promoEligibleBaseAmount.toFixed(2)}`); // Removed debug log
            } else {
                // Scenario 2: promo_item table contains specific item_ids -> applies to specific
                promoEligibleBaseAmount = activeItems.reduce((sum, item) => {
                    // Check if the menu_item_id of the order item is in the list of eligible promo item IDs
                    if (eligiblePromoItemIds.includes(item.menu_item_id)) {
                        return sum + parseFloat(item.total_price);
                    }
                    return sum;
                }, 0);
                // console.log(`Promo ${promo_id_to_use} applies to specific items. Eligible Base for promo calculation: $${promoEligibleBaseAmount.toFixed(2)}`); // Removed debug log

                if (promoEligibleBaseAmount === 0) {
                    // console.log(`No active order items found that are eligible for item-specific promo ${promo_id_to_use}. Promo amount will be 0.`); // Removed debug log
                }
            }

            if (promoEligibleBaseAmount > 0) {
                if (promoInfo.discount_type === 'percentage') {
                    promoAmount = promoEligibleBaseAmount * (parseFloat(promoInfo.discount_amount) / 100);
                } else if (promoInfo.discount_type === 'fixed_amount') {
                    promoAmount = parseFloat(promoInfo.discount_amount);
                }
                promoAmount = Math.min(promoAmount, promoEligibleBaseAmount); // Cap promo by its eligible base
            } else {
                promoAmount = 0;
            }

            // Cap promoAmount by the remaining amount after discount, to ensure total reduction isn't illogical
            promoAmount = Math.min(promoAmount, totalAmount - discountAmount);
        }

        // Total reduction from order (sum of discount and promo)
        const totalReduction = discountAmount + promoAmount;
        const amountAfterDiscountAndPromo = totalAmount - totalReduction;

        // Step 4: Calculate tax on adjusted amount
        const salesTaxRate = await OrderItem.getSalesTaxRate();
        const taxRate = salesTaxRate ? parseFloat(salesTaxRate.amount) / 100 : 0.08;
        const taxAmount = amountAfterDiscountAndPromo * taxRate;

        // Step 5: Calculate service charge on (adjusted_amount + tax_amount)
        const serviceChargeTax = await OrderItem.getServiceChargeTaxRate();
        const serviceChargeRate = serviceChargeTax ? parseFloat(serviceChargeTax.amount) / 100 : 0.10;
        const serviceChargeBase = amountAfterDiscountAndPromo + taxAmount;
        const serviceCharge = serviceChargeBase * serviceChargeRate;

        // Step 6: Calculate final charged amount
        const expectedPaymentAmount = amountAfterDiscountAndPromo + taxAmount + serviceCharge;

        // console.log(`Order ${order_id} - Calculation Breakdown:`); // Removed debug log
        // console.log(`1. Total Amount (order items): $${totalAmount.toFixed(2)}`); // Removed debug log
        // console.log(`2. Discount Amount: $${discountAmount.toFixed(2)} (${discountInfo ? discountInfo.amount + '%' : '0%'} of total)`); // Removed debug log
        // console.log(`3. Promo Eligible Base Amount: $${promoEligibleBaseAmount.toFixed(2)}`); // Removed debug log
        // console.log(`4. Promo Amount: $${promoAmount.toFixed(2)} (${promoInfo ? promoInfo.discount_amount + (promoInfo.discount_type === 'percentage' ? '%' : ' (fixed)') : '0%'} applied)`); // Removed debug log
        // console.log(`5. Total Reduction (Discount + Promo): $${totalReduction.toFixed(2)}`); // Removed debug log
        // console.log(`6. Amount After Discount & Promo: $${amountAfterDiscountAndPromo.toFixed(2)}`); // Removed debug log
        // console.log(`7. Tax Amount: $${taxAmount.toFixed(2)} (${(taxRate * 100).toFixed(1)}% of adjusted amount)`); // Removed debug log
        // console.log(`8. Service Charge Base: $${serviceChargeBase.toFixed(2)} (adjusted amount + tax)`); // Removed debug log
        // console.log(`9. Service Charge: $${serviceCharge.toFixed(2)} (${(serviceChargeRate * 100).toFixed(1)}% of base)`); // Removed debug log
        // console.log(`10. Final Charged Amount: $${expectedPaymentAmount.toFixed(2)}`); // Removed debug log

        // Basic validation
        if (!amount || amount <= 0) {
            return res.status(400).json({ status: 'error', message: 'Payment amount is invalid' });
        } // Removed the misplaced lines here
        if (!payment_mode) {
            return res.status(400).json({ status: 'error', message: 'Payment mode is required' });
        }

        // Validate payment amount matches expected amount
        const tolerance = 0.01; // Precise tolerance for currency
        if (Math.abs(parseFloat(amount) - expectedPaymentAmount) > tolerance) {
            // console.log(`❌ Payment amount mismatch:`); // Removed debug log
            // console.log(`   Expected: $${expectedPaymentAmount.toFixed(2)}`); // Removed debug log
            // console.log(`   Received: $${parseFloat(amount).toFixed(2)}`); // Removed debug log
            // console.log(`   Difference: $${Math.abs(parseFloat(amount) - expectedPaymentAmount).toFixed(2)}`); // Removed debug log

            return res.status(400).json({
                status: 'error',
                message: `Payment amount mismatch. Expected: $${expectedPaymentAmount.toFixed(2)}, Received: $${parseFloat(amount).toFixed(2)}`,
                expected_amount: expectedPaymentAmount,
                received_amount: parseFloat(amount),
                calculation_breakdown: {
                    total_amount: totalAmount,
                    discount_amount: discountAmount,
                    promo_eligible_base_amount: promoEligibleBaseAmount,
                    promo_amount: promoAmount,
                    total_reduction: totalReduction,
                    amount_after_discount_and_promo: amountAfterDiscountAndPromo,
                    tax_amount: taxAmount,
                    service_charge_base: serviceChargeBase,
                    service_charge: serviceCharge,
                    final_charged_amount: expectedPaymentAmount
                }
            });
        }

        // Create payment record
        const newPayment = await Payment.create({
            order_id,
            amount: parseFloat(amount),
            payment_mode,
            transaction_id,
            discount_id,
            promo_id: promo_id_to_use // Use the determined promo_id
        });

        // Calculate total payments for this order
        const allPayments = await Payment.findAllByOrderId(order_id);
        const totalPaidAmount = allPayments.reduce((sum, payment) =>
            sum + parseFloat(payment.amount), 0
        );

        // Determine order status based on payment completion
        let orderStatusString;
        let orderStatusId;
        let isOrderOpen;

        if (Math.abs(totalPaidAmount - expectedPaymentAmount) <= tolerance) {
            orderStatusString = 'closed';
            orderStatusId = 2; // Assuming: 1=open, 2=closed, 3=voided
            isOrderOpen = false;
            // console.log(`✅ Order ${order_id} CLOSED - Payment complete`); // Removed debug log
            // console.log(`   Total Paid: $${totalPaidAmount.toFixed(2)}`); // Removed debug log
            // console.log(`   Expected: $${expectedPaymentAmount.toFixed(2)}`); // Removed debug log
        } else if (totalPaidAmount > expectedPaymentAmount + tolerance) {
            orderStatusString = 'closed';
            orderStatusId = 2;
            isOrderOpen = false;
            // console.log(`⚠️  Order ${order_id} CLOSED - Overpayment detected`); // Removed debug log
            // console.log(`   Total Paid: $${totalPaidAmount.toFixed(2)}`); // Removed debug log
            // console.log(`   Expected: $${expectedPaymentAmount.toFixed(2)}`); // Removed debug log
            // console.log(`   Overpayment: $${(totalPaidAmount - expectedPaymentAmount).toFixed(2)}`); // Removed debug log
        } else if (totalPaidAmount > 0) {
            orderStatusString = 'partially paid';
            orderStatusId = 1; // Keep as open but with different string status
            isOrderOpen = true;
            // console.log(`🔄 Order ${order_id} PARTIALLY PAID`); // Removed debug log
            // console.log(`   Paid: $${totalPaidAmount.toFixed(2)} / $${expectedPaymentAmount.toFixed(2)}`); // Removed debug log
            // console.log(`   Remaining: $${(expectedPaymentAmount - totalPaidAmount).toFixed(2)}`); // Removed debug log
        } else {
            orderStatusString = 'open';
            orderStatusId = 1;
            isOrderOpen = true;
            // console.log(`ℹ️ Order ${order_id} remains OPEN - No payment recorded`); // Removed debug log
        }

        // Prepare update data - include promo_amount
        const updateData = {
            order_status: orderStatusId,
            is_open: isOrderOpen,
            total_amount: totalAmount,
            discount_amount: discountAmount,
            promo_amount: promoAmount, // Store the calculated promo amount
            tax_amount: taxAmount,
            service_charge: serviceCharge,
            charged_amount: expectedPaymentAmount
        };

        // console.log(`📝 Updating order ${order_id} with data:`, updateData); // Removed debug log

        // Update order with calculated amounts and status
        const updatedOrder = await Order.update(order_id, updateData);

        // console.log(`📋 Order update result:`, updatedOrder); // Removed debug log

        // Verify the update worked correctly
        if (updatedOrder) {
            // console.log(`✅ Order updated successfully:`); // Removed debug log
            // console.log(`   Order Status: ${updatedOrder.order_status}`); // Removed debug log
            // console.log(`   Is Open: ${updatedOrder.is_open}`); // Removed debug log
            // console.log(`   Charged Amount: ${updatedOrder.charged_amount}`); // Removed debug log
            // console.log(`   Promo Amount (stored): ${updatedOrder.promo_amount}`); // Removed debug log

            if (orderStatusString === 'closed' && updatedOrder.charged_amount == null) {
                console.error(`❌ CRITICAL: charged_amount was not updated! Expected: ${expectedPaymentAmount}, Got: ${updatedOrder.charged_amount}`);
            }

            if (orderStatusString === 'closed' && updatedOrder.order_status !== 2) {
                console.error(`❌ CRITICAL: order_status was not updated! Expected: 2, Got: ${updatedOrder.order_status}`);
            }
        }

        // Prepare detailed response
        const paymentSummary = {
            total_amount: totalAmount,
            discount_amount: discountAmount,
            promo_id_applied: promo_id_to_use, // Which promo ID was actually applied
            promo_eligible_base_amount: promoEligibleBaseAmount,
            promo_amount: promoAmount,
            total_reduction: totalReduction,
            amount_after_discount_and_promo: amountAfterDiscountAndPromo,
            tax_amount: taxAmount,
            service_charge_base: serviceChargeBase,
            service_charge: serviceCharge,
            final_charged_amount: expectedPaymentAmount,
            total_paid_so_far: totalPaidAmount,
            remaining_balance: Math.max(0, expectedPaymentAmount - totalPaidAmount),
            payment_status: orderStatusString,
            is_fully_paid: orderStatusString === 'closed',
            discount_info: discountInfo,
            promo_info: promoInfo, // Include promoInfo in the response
            calculation_steps: [
                `1. total_amount = $${totalAmount.toFixed(2)} (sum of active order items)`,
                `2. discount_amount = $${discountAmount.toFixed(2)} (${discountInfo ? discountInfo.amount + '%' : '0%'} of total_amount)`,
                `3. promo_eligible_base = $${promoEligibleBaseAmount.toFixed(2)} (base for promo calculation, specific items or all)`,
                `4. promo_amount = $${promoAmount.toFixed(2)} (${promoInfo ? promoInfo.discount_amount + (promoInfo.discount_type === 'percentage' ? '%' : ' (fixed)') : '0%'} applied)`,
                `5. total_reduction = $${totalReduction.toFixed(2)} (discount + promo)`,
                `6. amount_after_discount_and_promo = $${amountAfterDiscountAndPromo.toFixed(2)} (total - total_reduction)`,
                `7. tax_amount = $${taxAmount.toFixed(2)} (${(taxRate * 100).toFixed(1)}% of adjusted amount)`,
                `8. service_charge = $${serviceCharge.toFixed(2)} (${(serviceChargeRate * 100).toFixed(1)}% of base)`,
                `9. charged_amount = $${expectedPaymentAmount.toFixed(2)} (adjusted + tax + service_charge)`
            ]
        };

        res.status(201).json({
            status: 'success',
            message: orderStatusString === 'closed'
                ? 'Payment processed successfully. Order closed.'
                : `Payment processed. Order status: ${orderStatusString}`,
            data: {
                payment: newPayment,
                order: updatedOrder,
                payment_summary: paymentSummary
            }
        });

    } catch (error) { // This `catch` now correctly corresponds to the `try` block for processPayment
        console.error('Error processing payment:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process payment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Recalculates and provides the breakdown of an order's bill for the checkout page.
 * This function does NOT process any payment or update order status in the database.
 * It's intended to display the final bill to the customer before payment.
 *
 * @param {object} req - The request object, expected to contain:
 * - req.params.order_id: The ID of the order to calculate for.
 * - req.body.discount_id (optional): The ID of a discount to apply.
 * - req.body.promo_id (optional): The ID of a specific promo to try applying.
 * @param {object} res - The response object.
 */
exports.checkout = async (req, res) => {
    const { order_id } = req.params; // Get order_id from URL parameters
    const { discount_id, promo_id: requested_promo_id } = req.body; // Get discount and promo from request body

    let promo_id_to_use = null; // This will hold the promo_id that is actually applied
    let promoInfo = null;       // This will hold the details of the applied promo

    try {
        const order = await Order.findById(order_id);
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        const allOrderItems = await OrderItem.findAllByOrderId(order_id);
        const activeItems = allOrderItems.filter(item => item.status !== 'cancelled');

        if (activeItems.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No active items in order to calculate bill'
            });
        }

        // Step 1: Calculate total_amount (sum of active order items' total_price)
        const totalAmount = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

        // Step 2: Calculate Discount Amount
        let discountAmount = 0;
        let discountInfo = null;

        if (discount_id) {
            discountInfo = await getDiscountById(discount_id);
            if (discountInfo) {
                discountAmount = totalAmount * (parseFloat(discountInfo.amount) / 100);
                discountAmount = Math.min(discountAmount, totalAmount); // Cap discount
            }
        }

        // Determine which promo to apply (explicitly requested or automatic)
        if (requested_promo_id) {
            // First, try to validate the explicitly requested promo
            const validatedPromo = await validateSpecificPromo(requested_promo_id);
            if (validatedPromo) {
                promoInfo = validatedPromo;
                promo_id_to_use = promoInfo.promo_id;
                // console.log(`Checkout: Using explicitly requested and validated promo_id: ${promo_id_to_use}`); // Removed debug log
            } else {
                // console.log(`Checkout: Explicitly requested promo_id ${requested_promo_id} is invalid, inactive, or out of date range. Attempting automatic promo.`); // Removed debug log
                // If requested promo is invalid, fall back to automatic check
                promoInfo = await getAutomaticPromo();
                if (promoInfo) {
                    promo_id_to_use = promoInfo.promo_id;
                    // console.log(`Checkout: Automatically applied promo ${promo_id_to_use}.`); // Removed debug log
                } else {
                    // console.log('Checkout: No automatic promo found.'); // Removed debug log
                }
            }
        } else {
            // No promo_id provided in request, try to find an automatic one
            promoInfo = await getAutomaticPromo();
            if (promoInfo) {
                promo_id_to_use = promoInfo.promo_id;
                // console.log(`Checkout: Automatically applied promo ${promo_id_to_use}.`); // Removed debug log
            } else {
                // console.log('Checkout: No automatic promo found.'); // Removed debug log
            }
        }

        // Step 3: Calculate Promo Amount (now using promo_id_to_use and promoInfo)
        let promoAmount = 0;
        let promoEligibleBaseAmount = 0;

        if (promo_id_to_use && promoInfo) { // Only proceed if a promo is determined to be used
            const eligiblePromoItemIds = await PromoItem.findByPromoId(promo_id_to_use);

            if (eligiblePromoItemIds.length === 0) {
                // Scenario 1: promo_item table for this promo_id is empty -> applies to ALL
                promoEligibleBaseAmount = totalAmount;
                // console.log(`Checkout: Promo ${promo_id_to_use} applies to all items. Base for promo calculation: $${promoEligibleBaseAmount.toFixed(2)}`); // Removed debug log
            } else {
                // Scenario 2: promo_item table contains specific item_ids -> applies to specific
                promoEligibleBaseAmount = activeItems.reduce((sum, item) => {
                    if (eligiblePromoItemIds.includes(item.menu_item_id)) { // Assuming order_item.menu_item_id
                        return sum + parseFloat(item.total_price);
                    }
                    return sum;
                }, 0);
                // console.log(`Checkout: Promo ${promo_id_to_use} applies to specific items. Eligible Base for promo calculation: $${promoEligibleBaseAmount.toFixed(2)}`); // Removed debug log

                if (promoEligibleBaseAmount === 0) {
                    // console.log(`Checkout: No active order items found that are eligible for item-specific promo ${promo_id_to_use}. Promo amount will be 0.`); // Removed debug log
                }
            }

            if (promoEligibleBaseAmount > 0) {
                if (promoInfo.discount_type === 'percentage') {
                    promoAmount = promoEligibleBaseAmount * (parseFloat(promoInfo.discount_amount) / 100);
                } else if (promoInfo.discount_type === 'fixed_amount') {
                    promoAmount = parseFloat(promoInfo.discount_amount);
                }
                promoAmount = Math.min(promoAmount, promoEligibleBaseAmount); // Cap promo by its eligible base
            } else {
                promoAmount = 0;
            }

            // Cap promoAmount by the remaining amount after discount, to ensure total reduction isn't illogical
            promoAmount = Math.min(promoAmount, totalAmount - discountAmount);
        }

        // Total reduction from order (sum of discount and promo)
        const totalReduction = discountAmount + promoAmount;
        const amountAfterDiscountAndPromo = totalAmount - totalReduction;

        // Step 4: Calculate tax on adjusted amount
        const salesTaxRate = await OrderItem.getSalesTaxRate();
        const taxRate = salesTaxRate ? parseFloat(salesTaxRate.amount) / 100 : 0.08;
        const taxAmount = amountAfterDiscountAndPromo * taxRate;

        // Step 5: Calculate service charge on (adjusted_amount + tax_amount)
        const serviceChargeTax = await OrderItem.getServiceChargeTaxRate();
        const serviceChargeRate = serviceChargeTax ? parseFloat(serviceChargeTax.amount) / 100 : 0.10;
        const serviceChargeBase = amountAfterDiscountAndPromo + taxAmount;
        const serviceCharge = serviceChargeBase * serviceChargeRate;

        // Step 6: Calculate final charged amount
        const finalChargedAmount = amountAfterDiscountAndPromo + taxAmount + serviceCharge;

        // console.log(`Checkout for Order ${order_id} - Calculation Breakdown:`); // Removed debug log
        // console.log(`1. Total Amount (order items): $${totalAmount.toFixed(2)}`); // Removed debug log
        // console.log(`2. Discount Amount: $${discountAmount.toFixed(2)} (${discountInfo ? discountInfo.amount + '%' : '0%'} of total)`); // Removed debug log
        // console.log(`3. Promo Eligible Base Amount: $${promoEligibleBaseAmount.toFixed(2)}`); // Removed debug log
        // console.log(`4. Promo Amount: $${promoAmount.toFixed(2)} (${promoInfo ? promoInfo.discount_amount + (promoInfo.discount_type === 'percentage' ? '%' : ' (fixed)') : '0%'} applied)`); // Removed debug log
        // console.log(`5. Total Reduction (Discount + Promo): $${totalReduction.toFixed(2)}`); // Removed debug log
        // console.log(`6. Amount After Discount & Promo: $${amountAfterDiscountAndPromo.toFixed(2)}`); // Removed debug log
        // console.log(`7. Tax Amount: $${taxAmount.toFixed(2)} (${(taxRate * 100).toFixed(1)}% of adjusted amount)`); // Removed debug log
        // console.log(`8. Service Charge Base: $${serviceChargeBase.toFixed(2)} (adjusted amount + tax)`); // Removed debug log
        // console.log(`9. Service Charge: $${serviceCharge.toFixed(2)} (${(serviceChargeRate * 100).toFixed(1)}% of base)`); // Removed debug log
        // console.log(`10. Final Charged Amount: $${finalChargedAmount.toFixed(2)}`); // Removed debug log

        // Prepare detailed response, similar to payment_summary
        const checkoutSummary = {
            order_id: order_id,
            total_items_amount: totalAmount,
            discount_amount: parseFloat(discountAmount.toFixed(2)),
            promo_id_applied: promo_id_to_use,
            promo_eligible_base_amount: parseFloat(promoEligibleBaseAmount.toFixed(2)),
            promo_amount: parseFloat(promoAmount.toFixed(2)),
            total_reduction: parseFloat(totalReduction.toFixed(2)),
            amount_after_discount_and_promo: parseFloat(amountAfterDiscountAndPromo.toFixed(2)),
            tax_amount: parseFloat(taxAmount.toFixed(2)),
            service_charge_base: parseFloat(serviceChargeBase.toFixed(2)),
            service_charge: parseFloat(serviceCharge.toFixed(2)),
            final_charged_amount: parseFloat(finalChargedAmount.toFixed(2)),
            discount_info: discountInfo,
            promo_info: promoInfo,
            calculation_steps: [
                `1. total_items_amount = $${totalAmount.toFixed(2)} (sum of active order items)`,
                `2. discount_amount = $${discountAmount.toFixed(2)} (${discountInfo ? discountInfo.amount + '%' : '0%'} of total_items_amount)`,
                `3. promo_eligible_base = $${promoEligibleBaseAmount.toFixed(2)} (base for promo calculation, specific items or all)`,
                `4. promo_amount = $${promoAmount.toFixed(2)} (${promoInfo ? promoInfo.discount_amount + (promoInfo.discount_type === 'percentage' ? '%' : ' (fixed)') : '0%'} applied)`,
                `5. total_reduction = $${totalReduction.toFixed(2)} (discount + promo)`,
                `6. amount_after_discount_and_promo = $${amountAfterDiscountAndPromo.toFixed(2)} (total_items_amount - total_reduction)`,
                `7. tax_amount = $${taxAmount.toFixed(2)} (${(taxRate * 100).toFixed(1)}% of adjusted amount)`,
                `8. service_charge = $${serviceCharge.toFixed(2)} (${(serviceChargeRate * 100).toFixed(1)}% of adjusted + tax)`,
                `9. final_charged_amount = $${finalChargedAmount.toFixed(2)} (adjusted + tax + service_charge)`
            ]
        };

        res.status(200).json({
            status: 'success',
            message: 'Checkout bill calculated successfully.',
            data: checkoutSummary
        });

    } catch (error) {
        console.error('Error calculating checkout bill:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to calculate checkout bill',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


exports.getAllPaymentsWithOrderItemsGroupedBySession = async (req, res) => {
    try {
        const groupedPayments = await Payment.findAllWithOrderItemsGroupedBySession();
        res.status(200).json({ status: 'success', data: groupedPayments });
    } catch (error) {
        console.error('Error fetching payments with order items grouped by session:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch payments with order items' });
    }
};

exports.getPaymentsBySessionAndMode = async (req, res) => {
    const { cashier_session_id, payment_mode_id } = req.params;
    try {
        if (!cashier_session_id || !payment_mode_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Cashier Session ID and Payment Mode ID are required',
            });
        }
        const payments = await Payment.findAllBySessionAndPaymentMode(
            cashier_session_id,
            payment_mode_id
        );
        res.status(200).json({ status: 'success', data: payments });
    } catch (error) {
        console.error('Error fetching payments by session and mode:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch payments by session and mode',
        });
    }
};


module.exports = exports;