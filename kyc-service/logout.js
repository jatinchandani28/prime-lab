const utils = require('./utils');
const { StatusCodes } = require('http-status-codes');
const schema = require('./validation/user-authentication-schema.js');

module.exports.handler = async (event) => {
  try {
    const response = {
      message: 'You have successfully logged out',
    };

    return utils.send(StatusCodes.OK, response);
  } catch (err) {
    console.log(err);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Ops...',
    });
  }
};
