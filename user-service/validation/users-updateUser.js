const Joi = require('joi');

module.exports = Joi.object({
  firstName: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z ]+$/)
    .messages({
      'string.pattern.base': 'fullName fails to match the required pattern',
      'string.base': 'fullName must be a type of string',
      'string.empty': 'fullName must contain value',
      'any.required': 'fullName is a required field',
    }),

  lastName: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z ]+$/)
    .messages({
      'string.pattern.base': 'lastName fails to match the required pattern',
      'string.base': 'lastName must be a type of string',
      'string.empty': 'lastName must contain value',
      'any.required': 'lastName is a required field',
    }),
})
  .keys({
    countryCode: Joi.string().pattern(/^\+(?:[0-9] ?){0,3}[0-9]$/),
    phone: Joi.string().pattern(/^(?:[0-9] ?){6,14}[0-9]$/),
    email: Joi.string().pattern(
      /^[_a-z0-9-]+(\.[_a-z0-9-]+)*(\+[a-z0-9-]+)?@[a-z0-9-]+(\.[a-z0-9-]+)*$/i,
    ),
  })
  .or('phone', 'email')
  .and('phone', 'countryCode')
  .messages({
    'object.missing': 'Email or Phone is required',
    'object.and': 'Phone and Country Code are both required',
  });
