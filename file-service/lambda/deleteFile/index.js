const S3 = require('aws-sdk/clients/s3');
const utils = require('../../utils');
const { StatusCodes } = require('http-status-codes');
const { verifyUser } = require('../../user');
const Files = require('../../src/models/files');
const HttpError = require('../../error');
const { getWallet } = require('../../src/models/wallets');

const s3 = new S3();

const { BUCKET_NAME_FILES } = process.env;

module.exports.handler = async (event) => {
  const {
    pathParameters: { fileId, walletId },
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

    const file = await Files.getFile(walletId, fileId);
    if (!file) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        `No file '${fileId}' associated with wallet '${walletId}'`,
      );
    }

    if (![file.walletId, file.ownerId].includes(walletId)) {
      // Wallet requesting the file is not the owner nor a friend of the owner
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        `You are not authorized to perform this operation`,
      );
    }
    await Promise.all([
      Files.deleteFileFromAllWallets(file.hash),
      s3
        .deleteObject({
          Bucket: BUCKET_NAME_FILES,
          Key: `${userId}/${fileId}`,
        })
        .promise(),
    ]);

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
