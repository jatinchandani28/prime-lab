'use strict';
const Joi = require('joi');

module.exports = Joi.object({
  offerId: Joi.string().required(),
});
