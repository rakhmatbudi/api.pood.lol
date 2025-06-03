// controllers/paymentController.js - Complete Fixed Version
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');

// Helper function to get discount details
async function getDiscountById(discountId) {
  try {
    const db = require('../config/db');
    const query = 'SELECT * FROM discounts WHERE id = $1';
    const { rows } = await db.query(query, [discountId]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching discount:', error);
    return null;
  }
}

exports.processPayment = async (req, res) => {
  const { order_id, amount, payment_mode, transaction_id, discount_id } = req.body;
  
  try {
    // Check if the order exists
    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    // Calculate current total from active (non-cancelled) order items
    const allOrderItems = await OrderItem.findAllByOrderId(order_id);
    const activeItems = allOrderItems.filter(item => item.status !== 'cancelled');
    
    if (activeItems.length === 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No active items in order to process payment' 
      });
    }

    // Step 1: Calculate total_amount (sum of active order items)
    const totalAmount = activeItems.reduce((sum, item) => sum + parseFloat(item.total_price), 0);
    
    // Step 2: Apply discount to total_amount first
    // discount_amount = total_amount × discount_percentage
    let discountAmount = 0;
    let discountInfo = null;
    
    if (discount_id) {
      discountInfo = await getDiscountById(discount_id);
      if (discountInfo) {
        discountAmount = totalAmount * (parseFloat(discountInfo.amount) / 100);
      }
    }
    
    const amountAfterDiscount = totalAmount - discountAmount;
    
    // Step 3: Calculate tax on discounted amount
    // tax_amount = (total_amount - discount_amount) × tax_rate
    const salesTaxRate = await OrderItem.getSalesTaxRate();
    const taxRate = salesTaxRate ? parseFloat(salesTaxRate.amount) / 100 : 0.08;
    const taxAmount = amountAfterDiscount * taxRate;
    
    // Step 4: Calculate service charge on (discounted_amount + tax_amount)
    // service_charge = (total_amount - discount_amount + tax_amount) × service_charge_rate
    const serviceChargeTax = await OrderItem.getServiceChargeTaxRate();
    const serviceChargeRate = serviceChargeTax ? parseFloat(serviceChargeTax.amount) / 100 : 0.10;
    const serviceChargeBase = amountAfterDiscount + taxAmount;
    const serviceCharge = serviceChargeBase * serviceChargeRate;
    
    // Step 5: Calculate final charged amount
    // charged_amount = (total_amount - discount_amount) + tax_amount + service_charge
    const expectedPaymentAmount = amountAfterDiscount + taxAmount + serviceCharge;
    
    console.log(`Order ${order_id} - Calculation Breakdown:`);
    console.log(`1. Total Amount (order items): $${totalAmount.toFixed(2)}`);
    console.log(`2. Discount Amount: $${discountAmount.toFixed(2)} (${discountInfo ? discountInfo.amount + '%' : '0%'} of total)`);
    console.log(`3. Amount After Discount: $${amountAfterDiscount.toFixed(2)}`);
    console.log(`4. Tax Amount: $${taxAmount.toFixed(2)} (${(taxRate * 100).toFixed(1)}% of discounted amount)`);
    console.log(`5. Service Charge Base: $${serviceChargeBase.toFixed(2)} (discounted amount + tax)`);
    console.log(`6. Service Charge: $${serviceCharge.toFixed(2)} (${(serviceChargeRate * 100).toFixed(1)}% of base)`);
    console.log(`7. Final Charged Amount: $${expectedPaymentAmount.toFixed(2)}`);

    // Basic validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ status: 'error', message: 'Payment amount is invalid' });
    }
    if (!payment_mode) {
      return res.status(400).json({ status: 'error', message: 'Payment mode is required' });
    }

    // Validate payment amount matches expected amount
    const tolerance = 0.01; // Precise tolerance for currency
    if (Math.abs(parseFloat(amount) - expectedPaymentAmount) > tolerance) {
      console.log(`❌ Payment amount mismatch:`);
      console.log(`   Expected: $${expectedPaymentAmount.toFixed(2)}`);
      console.log(`   Received: $${parseFloat(amount).toFixed(2)}`);
      console.log(`   Difference: $${Math.abs(parseFloat(amount) - expectedPaymentAmount).toFixed(2)}`);
      
      return res.status(400).json({ 
        status: 'error', 
        message: `Payment amount mismatch. Expected: $${expectedPaymentAmount.toFixed(2)}, Received: $${parseFloat(amount).toFixed(2)}`,
        expected_amount: expectedPaymentAmount,
        received_amount: parseFloat(amount),
        calculation_breakdown: {
          total_amount: totalAmount,
          discount_amount: discountAmount,
          amount_after_discount: amountAfterDiscount,
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
      discount_id 
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
      // Payment complete: total_paid = (total_amount - discount_amount) + tax_amount + service_charge
      orderStatusString = 'closed';
      orderStatusId = 2; // Assuming: 1=open, 2=closed, 3=voided
      isOrderOpen = false;
      console.log(`✅ Order ${order_id} CLOSED - Payment complete`);
      console.log(`   Total Paid: $${totalPaidAmount.toFixed(2)}`);
      console.log(`   Expected: $${expectedPaymentAmount.toFixed(2)}`);
    } else if (totalPaidAmount > expectedPaymentAmount + tolerance) {
      // Overpayment - still close the order but log the discrepancy
      orderStatusString = 'closed';
      orderStatusId = 2;
      isOrderOpen = false;
      console.log(`⚠️  Order ${order_id} CLOSED - Overpayment detected`);
      console.log(`   Total Paid: $${totalPaidAmount.toFixed(2)}`);
      console.log(`   Expected: $${expectedPaymentAmount.toFixed(2)}`);
      console.log(`   Overpayment: $${(totalPaidAmount - expectedPaymentAmount).toFixed(2)}`);
    } else if (totalPaidAmount > 0) {
      // Partial payment
      orderStatusString = 'partially paid';
      orderStatusId = 1; // Keep as open but with different string status
      isOrderOpen = true;
      console.log(`🔄 Order ${order_id} PARTIALLY PAID`);
      console.log(`   Paid: $${totalPaidAmount.toFixed(2)} / $${expectedPaymentAmount.toFixed(2)}`);
      console.log(`   Remaining: $${(expectedPaymentAmount - totalPaidAmount).toFixed(2)}`);
    } else {
      // No payment (shouldn't happen after successful payment creation)
      orderStatusString = 'open';
      orderStatusId = 1;
      isOrderOpen = true;
      console.log(`❌ Order ${order_id} remains OPEN - No payment recorded`);
    }

    // Prepare update data
    const updateData = {
      order_status: orderStatusId,      // Integer status field (e.g., 2)
      is_open: isOrderOpen,
      total_amount: totalAmount,        // Sum of order items (before discount)
      discount_amount: discountAmount,  // Discount applied to total_amount
      tax_amount: taxAmount,            // Tax on discounted amount
      service_charge: serviceCharge,    // Service charge on (discounted amount + tax)
      charged_amount: expectedPaymentAmount  // Final amount charged to customer
    };

    console.log(`📝 Updating order ${order_id} with data:`, updateData);

    // Update order with calculated amounts and status
    const updatedOrder = await Order.update(order_id, updateData);
    
    console.log(`📋 Order update result:`, updatedOrder);

    // Verify the update worked correctly
    if (updatedOrder) {
      console.log(`✅ Order updated successfully:`);
      console.log(`   Order Status: ${updatedOrder.order_status}`);
      console.log(`   Is Open: ${updatedOrder.is_open}`);
      console.log(`   Charged Amount: ${updatedOrder.charged_amount}`);
      
      // Check if the important fields were updated
      if (orderStatusString === 'closed' && updatedOrder.charged_amount == null) {
        console.error(`❌ CRITICAL: charged_amount was not updated! Expected: ${expectedPaymentAmount}, Got: ${updatedOrder.charged_amount}`);
      }
      
      if (orderStatusString === 'closed' && updatedOrder.order_status !== 2) {
        console.error(`❌ CRITICAL: order_status was not updated! Expected: 2, Got: ${updatedOrder.order_status}`);
      }
    }

    // Prepare detailed response
    const paymentSummary = {
      total_amount: totalAmount,                    // Original order items total
      discount_amount: discountAmount,              // Discount applied first
      amount_after_discount: amountAfterDiscount,   // total_amount - discount_amount
      tax_amount: taxAmount,                        // Tax on discounted amount
      service_charge_base: serviceChargeBase,       // Base for service charge calculation
      service_charge: serviceCharge,                // Service charge on (discounted + tax)
      final_charged_amount: expectedPaymentAmount,  // What customer actually pays
      total_paid_so_far: totalPaidAmount,
      remaining_balance: Math.max(0, expectedPaymentAmount - totalPaidAmount),
      payment_status: orderStatusString,
      is_fully_paid: orderStatusString === 'closed',
      discount_info: discountInfo,
      calculation_steps: [
        `1. total_amount = $${totalAmount.toFixed(2)} (sum of order items)`,
        `2. discount_amount = $${discountAmount.toFixed(2)} (${discountInfo ? discountInfo.amount + '%' : '0%'} of total_amount)`,
        `3. tax_amount = $${taxAmount.toFixed(2)} (${(taxRate * 100).toFixed(1)}% of discounted amount)`,
        `4. service_charge = $${serviceCharge.toFixed(2)} (${(serviceChargeRate * 100).toFixed(1)}% of discounted + tax)`,
        `5. charged_amount = $${expectedPaymentAmount.toFixed(2)} (discounted + tax + service_charge)`
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