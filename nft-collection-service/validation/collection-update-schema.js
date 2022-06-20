const Joi = require('joi');

module.exports = Joi.object({
  collectionName: Joi.string(),
  ownerId: Joi.string().pattern(/^[a-zA-Z0-9_\- ]{1,21}$/),
});
