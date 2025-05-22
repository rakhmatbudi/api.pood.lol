const Joi = require('joi');

const validateOrder = (req, res, next) => {
  const schema = Joi.object({
    table_number: Joi.string().max(20).required(),
    server_id: Joi.number().integer().allow(null),
    cashier_session_id: Joi.number().integer().required(),
    // Add the new order_type_id field here
    order_type_id: Joi.number().integer().required(), // <--- ADDED THIS LINE
    status: Joi.string().valid('open', 'closed', 'voided').default('open'),
    is_open: Joi.boolean().default(true),
    total_amount: Joi.number().precision(2).default(0),
    customer_id: Joi.number().integer().allow(null)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }
  next();
};

const validateUpdateOrder = (req, res, next) => {
  const schema = Joi.object({
    table_number: Joi.string().max(20),
    server_id: Joi.number().integer().allow(null),
    cashier_session_id: Joi.number().integer().allow(null),
    // Add order_type_id here, typically optional for updates
    order_type_id: Joi.number().integer().optional(), // <--- ADDED THIS LINE, set as optional
    status: Joi.string().valid('open', 'closed', 'voided'),
    is_open: Joi.boolean(),
    total_amount: Joi.number().precision(2),
    customer_id: Joi.number().integer().allow(null)
  }).min(1); // At least one field must be provided

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }
  next();
};

module.exports = {
  validateOrder,
  validateUpdateOrder
};