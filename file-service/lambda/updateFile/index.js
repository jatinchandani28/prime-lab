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
    if (!fileId || fileId === 'null') {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'fileId missing in the request!',
      );
    }

    const [{ userId }, wallet] = await Promise.all([
      verifyUser(event),
      getWallet(walletId),
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

    const { name, description } = JSON.parse(body);

    let file;
    try {
      file = await Files.upsertFile(
        { fileId, walletId, name, description },
        `ownerId = :walletId`,
        (params) => {
          return {
            ...params,
            ExpressionAttributeValues: {
              ...params.ExpressionAttributeValues,
              ':walletId': walletId,
            },
          };
        },
      );
    } catch (error) {
      // Wallet requesting the file is not the owner nor a friend of the owner
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        `File does not exist or you are not authorized to perform this operation`,
      );
    }
    if (!file) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        `No file '${fileId}' associated with user`,
      );
    }
    return utils.send(StatusCodes.OK, { ...file });
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
