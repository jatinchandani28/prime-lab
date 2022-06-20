const { StatusCodes } = require('http-status-codes');
const jwt = require('jsonwebtoken');

const utils = require('../../utils');
const Users = require('../../src/models/users');
const Wallets = require('../../src/models/wallets');

module.exports.handler = async (event) => {
  const {
    pathParameters: { userId },
  } = event;
  try {
    if (!userId || userId === 'null') {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'userId missing in the request',
      });
    }

    const token = event.headers.Authorization || event.headers.authorization;

    if (!token) {
      return utils.send(StatusCodes.UNAUTHORIZED, {
        message: 'You are not authenticated',
      });
    }

    const secretKeyParameterStore = await utils.getParam('SECRET_KEY');
    const SECRET_KEY = secretKeyParameterStore.Parameter.Value;
    if (!SECRET_KEY) {
      throw new Error('SECRET_KEY parameter has not been set');
    }

    const tokenResponse = await jwt.verify(token, SECRET_KEY);

    const user = await Users.getUser(userId);

    if (!user) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `Invalid user ID or does not exist`,
      });
    }

    user.walletName = tokenResponse.walletName;

    const wallets = await Wallets.getWalletsByUserID(userId, token);
    user.wallets = wallets;

    const authResponse = await utils.getAuthResponse(user);

    return utils.send(StatusCodes.OK, authResponse);
  } catch (e) {
    console.log(e);
    return utils.send(
      e.expiredAt
        ? StatusCodes.UNAUTHORIZED
        : e.status || StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: e.message,
        data: e.data || e.expiredAt || e.date,
      },
      e,
    );
  }
};
