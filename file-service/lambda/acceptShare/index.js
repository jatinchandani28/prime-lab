const utils = require('../../utils');
const { StatusCodes } = require('http-status-codes');
const { verifyUser } = require('../../user');
const Files = require('../../src/models/files');
const HttpError = require('../../error');
const { getWallet } = require('../../src/models/wallets');

module.exports.handler = async (event) => {
  const {
    pathParameters: { fileId, walletId },
  } = event;

  try {
    const [{ userId }, wallet, file] = await Promise.all([
      verifyUser(event),
      getWallet(walletId),
      Files.getFile(walletId, fileId),
    ]);

    if (!wallet) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Wallet not found');
    }
    if (wallet.userId !== userId || wallet.walletId !== walletId) {
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        'Wallet associated with user mismatch with stored wallet',
      );
    }

    if (!file) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        'This file is not shared with this wallet',
      );
    }
    if (file.acceptedAt) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'This file was already accepted',
      );
    }

    if (!file.sharedAt) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'This file was not shared with this wallet',
      );
    }

    const sharedFile = await Files.upsertFile({
      fileId,
      walletId,
      acceptedAt: new Date().toISOString(),
    });
    return utils.send(StatusCodes.OK, { ...sharedFile });
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
