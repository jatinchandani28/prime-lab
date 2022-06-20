const Joi = require('joi');

const contactSchema = Joi.object({
  firstName: Joi.string()
    .pattern(/^[a-z A-Z]+(-[a-z A-Z]+)?$/)
    .trim(),

  lastName: Joi.string()
    .trim()
    .pattern(/^[a-z A-Z]+(-[a-z A-Z]+)?$/),

  jobTitle: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9 ]+$/)
    .allow(''),

  email: Joi.array().items(
    Joi.object({
      address: Joi.string()
        .trim()
        .pattern(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/)
        .allow(''),
      type: Joi.string().allow('', null),
    }),
  ),

  phone: Joi.array().items(
    Joi.object({
      number: Joi.string()
        .trim()
        .pattern(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im)
        .allow(''),
      type: Joi.string().allow('').allow(null),
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
    .pattern(/^[a-zA-Z0-9-_]{21}$/),

  profilePhotoPath: Joi.string().trim().allow(''),

  contactStatus: Joi.string().allow(''),
});

const contactIdSchema = Joi.object({
  contactId: Joi.string()
    .pattern(/^[a-zA-Z0-9-_]{21}$/)
    .required(),
});

const isFavoriteSchema = Joi.object({
  isFavorite: Joi.boolean(),
});

module.exports = {
  contactSchema,
  contactIdSchema,
  isFavoriteSchema,
};
