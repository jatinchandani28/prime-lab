const Joi = require('joi');

module.exports = Joi.object({
  firstName: Joi.string().trim().allow(''),

  lastName: Joi.string()
    .trim()
    .pattern(/^[a-z A-Z]+(-[a-z A-Z]+)?$/)
    .allow(''),

  jobTitle: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9 ]+$/)
    .allow(''),

  email: Joi.array().items(
    Joi.object({
      address: Joi.string()
        .trim()
        .pattern(
          /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        ) // ^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$ // Ian: this pattern would allow invalid emails like test@example.c where example.c is an invalid domain
        .allow(''),
      type: Joi.string().allow(''),
    }),
  ),

  phone: Joi.array().items(
    Joi.object({
      // E.164
      number: Joi.string()
        .trim()
        .pattern(/^\+[1-9]\d{1,14}$/)
        .allow(''),
      type: Joi.string().allow(''),
    }),
  ),

  address: Joi.array().items(
    Joi.object({
      street: Joi.string().trim().allow(''),
      city: Joi.string().trim().allow(''),
      region: Joi.string().trim().allow(''),
      country: Joi.string().trim().allow(''),
      postalCode: Joi.string().trim().allow(''),
      type: Joi.string().allow(''),
    }),
  ),

  companies: Joi.array()
    .items(
      Joi.string()
        .min(2)
        .max(50)
        .trim()
        .pattern(/^[a-zA-Z0-9 ]+$/)
        .allow('', null)
        .messages({
          'string.min': 'Company names should have a minimum of 2 characters',
          'string.max': 'Company names should have a minimum of 50 characters',
        }),
    )
    .allow(null),

  groups: Joi.array()
    .items(
      Joi.string()
        .min(2)
        .max(50)
        .trim()
        .pattern(/^[a-zA-Z0-9_\- ]+$/)
        .allow('', null)
        .messages({
          'string.min': 'Group names should have a minimum of 2 characters',
          'string.max': 'Group names should have a minimum of 50 characters',
        }),
    )
    .allow(null),

  dob: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .allow(''),

  importSource: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9_\- ]+$/)
    .allow(''),

  appId: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9-_]{21}$/)
    .allow(''),

  profilePhotoPath: Joi.string().trim().allow(''),

  contactStatus: Joi.string().allow(''),
});
