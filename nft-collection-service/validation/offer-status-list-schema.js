"use strict";
const Joi = require("joi");

module.exports = Joi.object({
  status: Joi.string().equal('pending', 'approved', 'rejected').required(),
  nftId: Joi.string().required(),
});