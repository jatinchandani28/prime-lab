const Joi = require('joi');

const shareAppSchema = Joi.object({
    contactId: Joi.string().min(6).max(25).required(),
    appId: Joi.string().min(6).max(25).required(),
});



module.exports = {
    shareAppSchema
}