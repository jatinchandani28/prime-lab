const utils = require('./utils');
const { StatusCodes } = require('http-status-codes');
const schema = require('./validation/user-authentication-schema.js');

module.exports.handler = async (event) => {
  try {
    const params = JSON.parse(event.body);

    const { error } = schema.validate(params, { abortEarly: false });

    if (error)
      if (error) {
        return utils.send(StatusCodes.BAD_REQUEST, {
          errors: error.details.map((item) => item.message),
        });
      }

    const response = {
      walletId: params.walletId,
      channelType: params.channelType,
      email: '',
    };

    return utils.send(StatusCodes.OK, response);
  } catch (err) {
    console.log(err);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Ops...',
    });
  }
};
