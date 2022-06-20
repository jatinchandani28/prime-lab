const Joi = require("joi");

module.exports = Joi.object({
    keyword: Joi.string().min(1).max(50),
    categoryId: Joi.string().min(1).max(256),
});
