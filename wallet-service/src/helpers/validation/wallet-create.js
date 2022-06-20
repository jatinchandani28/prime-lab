const Joi = require("joi");

module.exports = Joi.object({
    walletName: Joi.string().max(140).required(),
    appId: Joi.string().alphanum().max(150),
    walletIconUrl: Joi.string().uri(),
    countryCode: Joi.string().max(4)
});
