const Joi = require('joi').extend(require('@joi/date'));

module.exports = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(50),
  startDate: Joi.date().format('YYYY-MM-DD').utc(),
  endDate: Joi.date().format('YYYY-MM-DD').utc(),
  type: Joi.string().pattern(/[0-9a-zA-Z.]+/),
  application: Joi.string().pattern(/[0-9a-zA-Z.]+/), // action id
  status: Joi.string().pattern(/[0-9a-zA-Z.]+/),
  lastItem: Joi.string(),
  senderWalletId: Joi.string().pattern(/[0-9a-zA-Z.]+/),
  receiverWalletId: Joi.string().pattern(/[0-9a-zA-Z.]+/),
}).min(1);
