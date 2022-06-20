const Joi = require('joi');

module.exports = Joi.object({
  nftId: Joi.string()
    .min(10)
    .max(30)
    .pattern(/^[a-zA-Z0-9]/)
    .required(),
});
