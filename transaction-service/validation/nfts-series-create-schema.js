const Joi = require('joi');

module.exports = Joi.object({
    senderWalletId: Joi.string().pattern(/^[a-zA-Z0-9-_\.]{2,59}[a-zA-Z0-9].near$/).required(),
    type: Joi.string().valid("nft_series_create").required(),
    name: Joi.string().required(),
    capacity: Joi.number().required(),
    appId : Joi.string().required(),
    actionId : Joi.string().required(),
});
