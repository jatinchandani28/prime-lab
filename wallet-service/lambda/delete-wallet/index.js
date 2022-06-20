const { StatusCodes } = require('http-status-codes');

const Wallets = require('../../src/models/wallets');

const utils = require('../../src/helpers/utils');
const { verifyUser } = require('../../src/helpers/auth/user');
const HttpError = require('../../src/helpers/exception/error');

module.exports.handler = async (event) => {
  const {
    pathParameters: { walletId },
  } = event;

  try {
    if (!walletId || walletId === 'null') {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'walletId missing in the request!',
      );
    }

    const { userId } = await verifyUser(event);
    const wallet = await Wallets.getWallet(walletId, userId);

    if (!wallet || wallet === null) {
      // Wallet missing. Was it deleted? Maybe
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        `Invalid wallet ID or does not exist`,
      );
    }

    if (wallet.userId !== userId) {
      // Provided walletId is not owned by user
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        `You are not authorized to perform this operation`,
      );
    }

    // await Wallets.deleteWallet(wallet.walletId, userId);

    await Wallets.upsertWallet({
      walletId,
      userId,
      status: 'deleted',
    });

    return utils.send(StatusCodes.ACCEPTED, {
      message: `You have successfully deleted ${
        wallet.walletName || wallet.walletId
      }`,
    });
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
