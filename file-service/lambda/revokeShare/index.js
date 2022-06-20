const utils = require('../../utils');
const { StatusCodes } = require('http-status-codes');
const { verifyUser } = require('../../user');
const Files = require('../../src/models/files');
const HttpError = require('../../error');
const { getWallet } = require('../../src/models/wallets');

module.exports.handler = async (event) => {
  const {
    pathParameters: { fileId, walletId },
    body,
  } = event;

  try {
    const { receiverId } = JSON.parse(body);
    if (receiverId == null) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'receiverId missing in the request!',
      );
    }

    const [{ userId }, wallet, receiverFile] = await Promise.all([
      verifyUser(event),
      getWallet(walletId),
      Files.getFile(receiverId, fileId),
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

    if (!receiverFile) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        'Receiver wallet does not share this file',
      );
    }
    await Files.deleteFile(receiverId, fileId);

    return utils.send(StatusCodes.ACCEPTED);
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
