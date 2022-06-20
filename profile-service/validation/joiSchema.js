const Joi = require("joi");

module.exports.deleteProfileJoi = Joi.object({
    otp: Joi.string()
        .pattern(/^[0-9]{6}$/)
        .required()
        .messages({
            'string.pattern.base': `OTP is not a valid input for OTP, only takes numbers`,
            'string.base': `OTP must be a type of string`,
            'string.empty': `OTP must contain value`,
            'any.required': `OTP is a required field`,
        })
});