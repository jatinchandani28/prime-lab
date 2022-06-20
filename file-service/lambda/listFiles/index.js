const { StatusCodes } = require('http-status-codes');

const utils = require('../../utils');
const Files = require('../../src/models/files');
const { verifyUser } = require('../../user');
const { getWallet } = require('../../src/models/wallets');
const HttpError = require('../../error');

module.exports.handler = async (event) => {
  // TODO: use a library that handles log sampling according to stage
  // console.log('event', JSON.stringify(event));
  try {
    const {
      pathParameters: { walletId },
    } = event;
    const { userId } = await verifyUser(event);
    const wallet = await getWallet(walletId);

    if (!wallet) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Wallet not found');
    }
    if (wallet.userId !== userId || wallet.walletId !== walletId) {
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        'Wallet associated with user mismatch with stored wallet',
      );
    }

    const files = await Files.getFiles(walletId);
    // return all files except those that was not uploaded
    return utils.send(
      StatusCodes.OK,
      files.filter((file) => !!file.hash),
    );
  } catch (e) {
    if (!e.status) {
      console.error(e.message, e);
    }
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
