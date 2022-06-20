'use strict';
const Joi = require('joi');

module.exports = Joi.object({
  action: Joi.string().equal('approved', 'rejected').required(),
  note: Joi.string(),
});
