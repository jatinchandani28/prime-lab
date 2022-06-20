"use strict";
const Joi = require("joi");

module.exports = Joi.object({
  offerType: Joi.string().equal('NFT', 'TOKEN').required(),
  expire: Joi.date().timestamp().required(),
});