const utils = require('./utils');
const { StatusCodes } = require('http-status-codes');
const schema = require('./validation/user-authentication-confirm-schema.js');

module.exports.handler = async (event) => {
  const USER = {
    firstName: 'test',
    lastName: 'user',
    walletId: 'testuser.near',
    email: 'mock-test@primelab.io',
    phone: '+2551817181',
    dob: '2000-10-10',
    userId: 'ZA8n8ZASUj6IouGQTPIZZ',
    countryCode: '+1',
  };

  try {
    const params = JSON.parse(event.body);

    const { error } = schema.validate(params, { abortEarly: false });

    if (error)
      if (error) {
        return utils.send(StatusCodes.BAD_REQUEST, {
          errors: error.details.map((item) => item.message),
        });
      }

    if (params.walletID && params.OTP && params.OTP == '222222') {
      const authResponse = await utils.getAuthResponse(USER);

      return utils.send(StatusCodes.OK, authResponse);
    } else {
      return utils.send(StatusCodes.UNAUTHORIZED, {
        message: 'OTP not provided, is invalid or expired',
      });
    }
  } catch (err) {
    console.log(err);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Ops...',
    });
  }
};
