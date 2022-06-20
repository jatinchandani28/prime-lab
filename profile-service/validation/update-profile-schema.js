const Joi = require("joi");

module.exports = Joi.object({
    firstName: Joi.string().max(100).messages({
        "string.base": `"firstName" should be a type of 'text'`,
        "string.max": `"firstName" should have a minimum length of {#limit}`,
        "any.required": `"firstName" is a required field`,
      }),

    lastName: Joi.string().max(100).messages({
        "string.base": `"lastName" should be a type of 'text'`,
        "string.empty": `"lastName" cannot be an empty field`,
        "string.max": `"lastName" should have a maximum length of {#limit}`,
      }),

    profilePhoto: Joi.string(),

    email: Joi.string().pattern(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/),

    phone: Joi.string().pattern(/^\+(?:[0-9] ?){6,14}[0-9]$/),

    countryCode: Joi.string().min(2).max(4),
}).min(1);

