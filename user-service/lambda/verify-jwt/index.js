const { StatusCodes } = require('http-status-codes');
const jwt = require('jsonwebtoken');

const utils = require('../../utils');

module.exports.handler = async (event) => {
  try {
    if (!event.body) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'body missing in the request',
      });
    }

    const { token } = JSON.parse(event.body);

    if (!token || token === 'null') {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'token missing in the request',
      });
    }
    const cleanedToken = token.replace('Bearer ', '');
    const secreteKeyParameterStore = await utils.getParam('SECRET_KEY');
    const SECRET_KEY = secreteKeyParameterStore.Parameter.Value;

    if (!SECRET_KEY) {
      throw new Error('SECRET_KEY parameter has not been set');
    }

    const tokenResponse = await jwt.verify(cleanedToken, SECRET_KEY);

    return utils.send(StatusCodes.OK, {
      authenticated: true,
      data: tokenResponse,
    });
  } catch (e) {
    console.log(e);
    return utils.send(
      e.status || StatusCodes.UNAUTHORIZED,
      {
        authenticated: false,
        message: e.message,
        data: e.data || e.expiredAt || e.date,
      },
      e,
    );
  }
};
