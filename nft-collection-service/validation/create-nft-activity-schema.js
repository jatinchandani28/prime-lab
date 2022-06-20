'use strict';
const Joi = require('joi');

module.exports = Joi.object({
  nftId: Joi.string().required(),
  action: Joi.string().valid('mint', 'offer', 'counter', 'approved', 'rejected', 'rejected', 'transfer').required(),
  fromWalletId: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-z0-9-_]{2,59}.near$/)
    .required()
    .messages({
      'string.pattern.base': `fromWalletId fails to match the required pattern`,
      'string.base': `fromWalletId must be a type of string`,
      'string.empty': `fromWalletId must contain value`,
      'any.required': `fromWalletId is a required field`,
    }),
  toWalletId: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-z0-9-_]{2,59}.near$/)
    .messages({
      'string.pattern.base': `fromWalletId fails to match the required pattern`,
      'string.base': `fromWalletId must be a type of string`,
    }),
  amount: Joi.number()
});
