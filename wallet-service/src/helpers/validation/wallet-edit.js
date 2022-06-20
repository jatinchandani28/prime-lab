const Joi = require("joi");

module.exports = Joi.object({
    walletName: Joi.string().max(50),
    status: Joi.string(),
    imageUrlPath: Joi.string().uri(),
    priceLimit: Joi.number(),
    kycProvider: Joi.string().max(50),
    storageProvider: Joi.string().max(50)
});