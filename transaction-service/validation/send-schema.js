const Joi = require('joi');

module.exports = Joi.object({
  senderWalletId: Joi.string().pattern(/^[a-zA-Z0-9-_\.]{2,59}[a-zA-Z0-9].near$/).required(),
  receiverWalletId: Joi.string().pattern(/^[a-zA-Z0-9-_\.]{2,59}[a-zA-Z0-9].near$/).required(),
  transactionValue: Joi.number().required(),
  type: Joi.string().valid('send_token').required(),
});
