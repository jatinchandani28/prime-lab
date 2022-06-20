const Joi = require("joi");

module.exports = Joi.object({

     walletId: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-z0-9-_]{2,59}.near$/)
    .required()
    .messages({
      'string.pattern.base': `walletID fails to match the required pattern`,
      'string.base': `walletID must be a type of string`,
      'string.empty': `walletID must contain value`,
      'any.required': `walletID is a required field`,
    }),
    
});
