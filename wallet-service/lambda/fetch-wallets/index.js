const { StatusCodes } = require('http-status-codes');

const Wallets = require('../../src/models/wallets');

const { verifyUser } = require('../../src/helpers/auth/user');
const utils = require('../../src/helpers/utils');

module.exports.handler = async (event) => {
  try {
    const { userId } = await verifyUser(event);
    const wallets = await Wallets.getWalletsByUserId(userId);
    return utils.send(StatusCodes.OK, wallets);
  } catch (e) {
    return utils.send(
      e.status || StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: e.message,
        data: e.data,
      },
      e,
    );
  }
};
