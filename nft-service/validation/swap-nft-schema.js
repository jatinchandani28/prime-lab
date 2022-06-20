const Joi = require('joi');

module.exports = Joi.object({
  swapNftId: Joi.string()
    .min(10)
    .max(30)
    .pattern(/^[a-zA-Z0-9]/)
    .required(),
  flag: Joi.string().min(1).max(10).required(),
});
