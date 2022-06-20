const Joi = require('joi');

module.exports = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[^\s][a-zA-Z0-9-_]+[a-zA-Z0-9-_\s;&!@#$]+$/)
    .required()
    .messages({
      'string.pattern.base':
        'Title fails to match the required pattern /^[a-zA-Z0-9-_]+[a-zA-Z0-9-_/s;&!@#$]+$/',
      'string.empty': 'Title must contain value',
      'any.required': 'Title is a required field',
    }),
  description: Joi.string()
    .trim()
    .min(1)
    .max(150)
    .pattern(/^[a-zA-Z0-9-_]+[a-zA-Z0-9-_\s;&!@$]+$/)
    .optional(),
  // TODO: uncomment collectionId when the FE will be sending it
  // collectionId: Joi.string().required().pattern(/^[a-zA-Z0-9-_]{1,21}$/),
  // recipientWalletId: Joi.string().required().pattern(/^[a-zA-Z0-9-_]{1,21}$/),
  categoryId: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9-_]{1,21}$/),
  filePath: Joi.string().uri().required(),
  tags: Joi.array().items(Joi.string().pattern(/^[a-zA-Z0-9]+$/)),
  capacity: Joi.number(),
});
