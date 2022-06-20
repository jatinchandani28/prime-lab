const utils = require('../../utils');
const { StatusCodes } = require('http-status-codes');
const { verifyUser } = require('../../user');
const Files = require('../../src/models/files');
const HttpError = require('../../error');
const { getWallet } = require('../../src/models/wallets');

module.exports.handler = async (event) => {
  // TODO: use a library that handles log sampling according to stage
  // console.log('event', JSON.stringify(event));

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

    const [{ userId }, wallet, receiverWallet] = await Promise.all([
      verifyUser(event),
      getWallet(walletId),
      getWallet(receiverId),
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

    if (!receiverWallet) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Receiver wallet not found');
    }

    const file = await Files.getFile(walletId, fileId);
    if (!file) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        `No file '${fileId}' associated with this wallet`,
      );
    }
    const sharedFile = await Files.upsertFile({
      ...file,
      ownerId: walletId,
      walletId: receiverWallet.walletId,
      userId: receiverWallet.userId,
      sharedAt: new Date().toISOString(),
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
