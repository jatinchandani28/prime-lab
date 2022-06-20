const Joi = require("joi");

module.exports = Joi.object({
    walletName: Joi.string().max(50).required(),
}).keys({
    privateKey: Joi.string().min(1),
    passPhrases: Joi.string().min(1)
}).or('privateKey', 'passPhrases');