const Joi = require('joi');

module.exports = Joi.object({
  senderWalletId: Joi.string().pattern(/^[a-zA-Z0-9-_\.]{2,59}[a-zA-Z0-9].near$/).required(),
  type: Joi.string().valid('nft_series_mint').required(),
  seriesId: Joi.number().required(),
  deposit: Joi.number().required(),
  media: Joi.string().uri().required(),
  reference: Joi.string().uri().required(),
  appId: Joi.string().required(),
  actionId: Joi.string().required(),
  title: Joi.string(),
  description: Joi.string(),
  mediaHash: Joi.string(),
  copies: Joi.string(),
  issuedAt: Joi.string(),
  expiresAt: Joi.string(),
  startsAt: Joi.string(),
  updatedAt: Joi.string(),
  extra: Joi.string(),
  referenceHash: Joi.string(),
  transactionId: Joi.string()
});