const Payment = require('../models/Payment');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const PromoItem = require('../models/PromoItem');
const db = require('../config/db'); // Assuming this is your PostgreSQL client/pool

// Helper function to get discount details
async function getDiscountById(discountId, tenant) { // Added tenant
    try {
        const query = 'SELECT * FROM discount WHERE id = $1 AND tenant = $2'; // Filter by tenant
        const { rows } = await db.query(query, [discountId, tenant]);
        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching discount:', error);
        return null;
    }
}

// Helper function to get promo details by ID
async function getPromoById(promoId, tenant) { // Added tenant
    try {
        const query = 'SELECT * FROM promo WHERE promo_id = $1 AND tenant = $2'; // Filter by tenant
        const { rows } = await db.query(query, [promoId, tenant]);
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

// Helper function to find the first active, date-valid promo for a specific tenant
async function getAutomaticPromo(tenant) { // Added tenant
    try {
        const currentDate = getCurrentDateSimple();

        const query = `
            SELECT *
            FROM promo
            WHERE is_active = TRUE
              AND start_date <= $1::date
              AND end_date >= $1::date
              AND tenant = $2 -- Filter by tenant
            ORDER BY promo_id ASC
            LIMIT 1;
        `;
        const { rows } = await db.query(query, [currentDate, tenant]);
        return rows[0] || null;
    } catch (error) {
        console.error('Error fetching automatic promo:', error);
        return null;
    }
}

// Helper to validate a specific promo by ID, including activity and date for a specific tenant
async function validateSpecificPromo(promoId, tenant) { // Added tenant
    try {
        const promo = await getPromoById(promoId, tenant); // Pass tenant
        if (!promo) return null;

        // Ensure the promo also belongs to the tenant
        if (promo.tenant !== tenant) {
            console.warn(`Attempt to validate promo ${promoId} for wrong tenant ${tenant}. Promo belongs to ${promo.tenant}.`);
            return null; // Do not return promo if it belongs to a different tenant
        }

        const currentDate = getCurrentDateSimple();
        const promoStartDate = new Date(promo.start_date).toISOString().split('T')[0];
        const promoEndDate = new Date(promo.end_date).toISOString().split('T')[0];

        if (promo.is_active === true &&
            promoStartDate <= currentDate &&
            promoEndDate >= currentDate) {
            return promo;
        }
        return null;
    } catch (error) {
        console.error('Error validating specific promo:', error);
        return null;
    }
}

exports.processPayment = async (req, res) => {
    const { order_id, amount, payment_mode, transaction_id, discount_id, promo_id: requested_promo_id } = req.body;
    const tenant = req.tenant; // Retrieve tenant from request

    if (!tenant) {
        return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
    }

    let promo_id_to_use = null;
    let promoInfo = null;

    try {
        // IMPORTANT: Ensure Order.findById checks tenant internally.
        // Assuming your Order model's findById method takes tenant as a second argument.
        const order = await Order.findById(order_id, tenant);
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        // Ensure order also belongs to the tenant (redundant if findById already checks, but safe)
        if (order.tenant !== tenant) {
            return res.status(403).json({ status: 'error', message: 'Access denied. Order does not belong to this tenant.' });
        }

        // IMPORTANT: Ensure OrderItem.findAllByOrderId checks tenant internally.
        const allOrderItems = await OrderItem.findAllByOrderId(order_id, tenant);
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
            discountInfo = await getDiscountById(discount_id, tenant); // Pass tenant
            if (discountInfo) {
                discountAmount = totalAmount * (parseFloat(discountInfo.amount) / 100);
                discountAmount = Math.min(discountAmount, totalAmount); // Cap discount
            }
        }

        // Determine which promo to apply (explicitly requested or automatic)
        if (requested_promo_id) {
            const validatedPromo = await validateSpecificPromo(requested_promo_id, tenant); // Pass tenant
            if (validatedPromo) {
                promoInfo = validatedPromo;
                promo_id_to_use = promoInfo.promo_id;
            } else {
                // Fallback to automatic promo if specific requested promo is invalid/inactive
                promoInfo = await getAutomaticPromo(tenant); // Pass tenant
                if (promoInfo) {
                    promo_id_to_use = promoInfo.promo_id;
                }
            }
        } else {
            promoInfo = await getAutomaticPromo(tenant); // Pass tenant
            if (promoInfo) {
                promo_id_to_use = promoInfo.promo_id;
            }
        }

        // Step 3: Calculate Promo Amount (now using promo_id_to_use and promoInfo)
        let promoAmount = 0;
        let promoEligibleBaseAmount = 0;

        if (promo_id_to_use && promoInfo) { // Only proceed if a promo is determined to be used
            // IMPORTANT: Ensure PromoItem.findByPromoId checks tenant internally.
            const eligiblePromoItemIds = await PromoItem.findByPromoId(promo_id_to_use, tenant); // Pass tenant

            // Transform eligiblePromoItemIds to a Set for efficient lookup
            const eligibleItemMenuIdsSet = new Set(eligiblePromoItemIds.map(item => item.menu_item_id)); // Assuming findByPromoId returns objects with menu_item_id

            if (eligibleItemMenuIdsSet.size === 0) { // If no specific items for promo, apply to total
                promoEligibleBaseAmount = totalAmount;
            } else {
                promoEligibleBaseAmount = activeItems.reduce((sum, item) => {
                    if (eligibleItemMenuIdsSet.has(item.menu_item_id)) { // Assuming order_item.menu_item_id
                        return sum + parseFloat(item.total_price);
                    }
                    return sum;
                }, 0);
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

            promoAmount = Math.min(promoAmount, totalAmount - discountAmount);
        }

        const totalReduction = discountAmount + promoAmount;
        const amountAfterDiscountAndPromo = totalAmount - totalReduction;

        // Step 4: Calculate tax on adjusted amount
        // IMPORTANT: Ensure OrderItem.getSalesTaxRate checks tenant internally.
        const salesTaxRate = await OrderItem.getSalesTaxRate(tenant); // Pass tenant
        const taxRate = salesTaxRate ? parseFloat(salesTaxRate.amount) / 100 : 0.08;
        const taxAmount = amountAfterDiscountAndPromo * taxRate;

        // Step 5: Calculate service charge on (adjusted_amount + tax_amount)
        // IMPORTANT: Ensure OrderItem.getServiceChargeTaxRate checks tenant internally.
        const serviceChargeTax = await OrderItem.getServiceChargeTaxRate(tenant); // Pass tenant
        const serviceChargeRate = serviceChargeTax ? parseFloat(serviceChargeTax.amount) / 100 : 0.10;
        const serviceChargeBase = amountAfterDiscountAndPromo + taxAmount;
        const serviceCharge = serviceChargeBase * serviceChargeRate;

        // Step 6: Calculate final charged amount
        const expectedPaymentAmount = amountAfterDiscountAndPromo + taxAmount + serviceCharge;

        // Basic validation
        if (!amount || amount <= 0) {
            return res.status(400).json({ status: 'error', message: 'Payment amount is invalid' });
        }
        if (!payment_mode) {
            return res.status(400).json({ status: 'error', message: 'Payment mode is required' });
        }

        const tolerance = 0.01;
        if (Math.abs(parseFloat(amount) - expectedPaymentAmount) > tolerance) {
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
        // IMPORTANT: Ensure Payment.create handles tenant correctly.
        const newPayment = await Payment.create({
            order_id,
            amount: parseFloat(amount),
            payment_mode,
            transaction_id,
            discount_id,
            promo_id: promo_id_to_use,
            tenant: tenant // Add tenant here for the payment record
        });

        // Calculate total payments for this order, scoped by tenant
        // IMPORTANT: Ensure Payment.findAllByOrderId checks tenant internally.
        const allPayments = await Payment.findAllByOrderId(order_id, tenant); // Pass tenant
        const totalPaidAmount = allPayments.reduce((sum, payment) =>
            sum + parseFloat(payment.amount), 0
        );

        let orderStatusString;
        let orderStatusId;
        let isOrderOpen;

        if (Math.abs(totalPaidAmount - expectedPaymentAmount) <= tolerance) {
            orderStatusString = 'closed';
            orderStatusId = 2; // Assuming: 1=open, 2=closed, 3=voided
            isOrderOpen = false;
        } else if (totalPaidAmount > expectedPaymentAmount + tolerance) {
            orderStatusString = 'closed';
            orderStatusId = 2;
            isOrderOpen = false;
        } else if (totalPaidAmount > 0) {
            orderStatusString = 'partially paid';
            orderStatusId = 1; // Keep as open but with different string status
            isOrderOpen = true;
        } else {
            orderStatusString = 'open';
            orderStatusId = 1;
            isOrderOpen = true;
        }

        // Prepare update data - include promo_amount and tenant
        const updateData = {
            order_status: orderStatusId,
            is_open: isOrderOpen,
            total_amount: totalAmount,
            discount_amount: discountAmount,
            promo_amount: promoAmount,
            tax_amount: taxAmount,
            service_charge: serviceCharge,
            charged_amount: expectedPaymentAmount,
            tenant: tenant // Add tenant here for the update to ensure tenant scope
        };

        // IMPORTANT: Ensure Order.update handles tenant correctly.
        const updatedOrder = await Order.update(order_id, updateData, tenant); // Pass tenant for update scope

        if (updatedOrder) {
            if (orderStatusString === 'closed' && updatedOrder.charged_amount == null) {
                console.error(`❌ CRITICAL: charged_amount was not updated! Expected: ${expectedPaymentAmount}, Got: ${updatedOrder.charged_amount}`);
            }

            if (orderStatusString === 'closed' && updatedOrder.order_status !== 2) {
                console.error(`❌ CRITICAL: order_status was not updated! Expected: 2, Got: ${updatedOrder.order_status}`);
            }
        }

        const paymentSummary = {
            total_amount: totalAmount,
            discount_amount: discountAmount,
            promo_id_applied: promo_id_to_use,
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
            promo_info: promoInfo,
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

    } catch (error) {
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
    const { order_id } = req.params;
    const { discount_id, promo_id: requested_promo_id } = req.body;
    const tenant = req.tenant; // Retrieve tenant from request

    if (!tenant) {
        return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
    }

    let promo_id_to_use = null;
    let promoInfo = null;

    try {
        // IMPORTANT: Ensure Order.findById checks tenant internally.
        const order = await Order.findById(order_id, tenant); // Pass tenant
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        // Ensure order also belongs to the tenant (redundant if findById already checks, but safe)
        if (order.tenant !== tenant) {
            return res.status(403).json({ status: 'error', message: 'Access denied. Order does not belong to this tenant.' });
        }

        // IMPORTANT: Ensure OrderItem.findAllByOrderId checks tenant internally.
        const allOrderItems = await OrderItem.findAllByOrderId(order_id, tenant); // Pass tenant
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
            discountInfo = await getDiscountById(discount_id, tenant); // Pass tenant
            if (discountInfo) {
                discountAmount = totalAmount * (parseFloat(discountInfo.amount) / 100);
                discountAmount = Math.min(discountAmount, totalAmount); // Cap discount
            }
        }

        // Determine which promo to apply (explicitly requested or automatic)
        if (requested_promo_id) {
            const validatedPromo = await validateSpecificPromo(requested_promo_id, tenant); // Pass tenant
            if (validatedPromo) {
                promoInfo = validatedPromo;
                promo_id_to_use = promoInfo.promo_id;
            } else {
                // Fallback to automatic promo if specific requested promo is invalid/inactive
                promoInfo = await getAutomaticPromo(tenant); // Pass tenant
                if (promoInfo) {
                    promo_id_to_use = promoInfo.promo_id;
                }
            }
        } else {
            promoInfo = await getAutomaticPromo(tenant); // Pass tenant
            if (promoInfo) {
                promo_id_to_use = promoInfo.promo_id;
            }
        }

        // Step 3: Calculate Promo Amount (now using promo_id_to_use and promoInfo)
        let promoAmount = 0;
        let promoEligibleBaseAmount = 0;

        if (promo_id_to_use && promoInfo) { // Only proceed if a promo is determined to be used
            // IMPORTANT: Ensure PromoItem.findByPromoId checks tenant internally.
            const eligiblePromoItemIds = await PromoItem.findByPromoId(promo_id_to_use, tenant); // Pass tenant

            // Transform eligiblePromoItemIds to a Set for efficient lookup
            const eligibleItemMenuIdsSet = new Set(eligiblePromoItemIds.map(item => item.menu_item_id)); // Assuming findByPromoId returns objects with menu_item_id

            if (eligibleItemMenuIdsSet.size === 0) { // If no specific items for promo, apply to total
                promoEligibleBaseAmount = totalAmount;
            } else {
                promoEligibleBaseAmount = activeItems.reduce((sum, item) => {
                    if (eligibleItemMenuIdsSet.has(item.menu_item_id)) { // Assuming order_item.menu_item_id
                        return sum + parseFloat(item.total_price);
                    }
                    return sum;
                }, 0);
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

            promoAmount = Math.min(promoAmount, totalAmount - discountAmount);
        }

        // Total reduction from order (sum of discount and promo)
        const totalReduction = discountAmount + promoAmount;
        const amountAfterDiscountAndPromo = totalAmount - totalReduction;

        // Step 4: Calculate tax on adjusted amount
        // IMPORTANT: Ensure OrderItem.getSalesTaxRate checks tenant internally.
        const salesTaxRate = await OrderItem.getSalesTaxRate(tenant); // Pass tenant
        const taxRate = salesTaxRate ? parseFloat(salesTaxRate.amount) / 100 : 0.08;
        const taxAmount = amountAfterDiscountAndPromo * taxRate;

        // Step 5: Calculate service charge on (adjusted_amount + tax_amount)
        // IMPORTANT: Ensure OrderItem.getServiceChargeTaxRate checks tenant internally.
        const serviceChargeTax = await OrderItem.getServiceChargeTaxRate(tenant); // Pass tenant
        const serviceChargeRate = serviceChargeTax ? parseFloat(serviceChargeTax.amount) / 100 : 0.10;
        const serviceChargeBase = amountAfterDiscountAndPromo + taxAmount;
        const serviceCharge = serviceChargeBase * serviceChargeRate;

        // Step 6: Calculate final charged amount
        const finalChargedAmount = amountAfterDiscountAndPromo + taxAmount + serviceCharge;

        // Prepare detailed response, similar to payment_summary
        const checkoutSummary = {
            order_id: order_id,
            order_number: order.order_number,
            table_number: order.table_number,
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
            message: 'Checkout bill calculated successfully',
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

/**
 * Get all payments with order items grouped by session for a specific tenant.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
exports.getAllPaymentsWithOrderItemsGroupedBySession = async (req, res) => {
    const tenant = req.tenant; // Retrieve tenant

    if (!tenant) {
        return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
    }

    try {
        // IMPORTANT: Ensure this method in Payment model takes tenant
        const groupedPayments = await Payment.findAllWithOrderItemsGroupedBySession(tenant);

        res.status(200).json({ status: 'success', data: groupedPayments });

    } catch (error) {
        console.error('Error fetching payments with order items grouped by session:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch payments with order items' });
    }
};

/**
 * Get payments by session ID and payment mode ID for a specific tenant.
 *
 * @param {object} req - The request object, expected to contain:
 * - req.params.cashier_session_id
 * - req.params.payment_mode_id
 * @param {object} res - The response object.
 */
exports.getPaymentsBySessionAndMode = async (req, res) => {
    const tenant = req.tenant; // Retrieve tenant

    const { cashier_session_id, payment_mode_id } = req.params;

    try {
        if (!tenant) { // Tenant ID check here too
            return res.status(400).json({ status: 'error', message: 'Tenant ID is required.' });
        }
        if (!cashier_session_id || !payment_mode_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Cashier Session ID and Payment Mode ID are required',
            });
        }

        // IMPORTANT: Ensure this method in Payment model takes tenant
        const payments = await Payment.findAllBySessionAndPaymentMode(
            cashier_session_id,
            payment_mode_id,
            tenant // Pass tenant
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