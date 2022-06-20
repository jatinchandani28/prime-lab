const Joi = require('joi');

module.exports = Joi.object({
  walletID: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z0-9-_\.]{2,59}[a-zA-Z0-9].near$/)
    .required()
    .messages({
      'string.pattern.base': 'walletID fails to match the required pattern',
      'string.base': 'walletID must be a type of string',
      'string.empty': 'walletID must contain value',
      'any.required': 'walletID is a required field',
    }),
  phone: Joi.alternatives()
    .conditional('walletID', {
      is: Joi.string().pattern(/^$/),
      then: Joi.string()
        .pattern(/^(?:[0-9] ?){6,14}[0-9]$/)
        .required(),
      otherwise: Joi.string().pattern(/^(?:[0-9] ?){6,14}[0-9]$|^$/),
    })
    .messages({
      'string.pattern.base': 'phone fails to match the required pattern',
      'string.base': 'phone must be a type of string',
      'string.empty': 'phone must contain value',
      'any.required': 'phone is a required field',
    }),
  countryCode: Joi.alternatives()
    .conditional('phone', {
      not: Joi.string().pattern(/^$/),
      // then: Joi.string().min(2).max(4).required(),
      // otherwise: Joi.string().min(2).max(4),
      then: Joi.string().pattern(/^\+(?:[0-9] ?){0,3}[0-9]$/).required(),
      otherwise: Joi.string().pattern(/^\+(?:[0-9] ?){0,3}[0-9]$/),
    })
    .messages({
      'string.base': 'countryCode must be a type of string',
      'string.empty': 'countryCode must contain value',
      'any.required': 'countryCode is a required field',
    }),

});
