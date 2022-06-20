const Joi = require('joi');

module.exports = Joi.object({
  recipientWalletId: Joi.string().required(),
});
