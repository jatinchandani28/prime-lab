const Joi = require('joi');

module.exports = Joi.object({
  contactIds: Joi.array().items(Joi.string().required()),
});
