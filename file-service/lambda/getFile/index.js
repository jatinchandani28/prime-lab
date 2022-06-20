const S3 = require('aws-sdk/clients/s3');
const utils = require('../../utils');
const { StatusCodes } = require('http-status-codes');
const { verifyUser } = require('../../user');
const Files = require('../../src/models/files');
const HttpError = require('../../error');
const Wallets = require('../../src/models/wallets');

const s3 = new S3({ signatureVersion: 'v4' });

const {
  BUCKET_NAME_FILES,
  SIGNED_URL_EXPIRATION = 60 * 15, // 15mn
} = process.env;

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

    const { userId } = await verifyUser(event);

    // Starting from here, user is authenticated
    const wallet = await Wallets.getWallet(walletId);

    if (!wallet) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Wallet not found');
    }
    if (wallet.walletId !== walletId) {
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        'Wallet associated with user mismatch with stored wallet',
      );
    }
    const file = await Files.getFile(walletId, fileId);
    if (!file) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        `No file '${fileId}' associated with this wallet`,
      );
    }

    if (![file.walletId, file.ownerId].includes(walletId)) {
      // Wallet requesting the file is not the owner nor a friend of the owner
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        `You are not authorized to perform this operation`,
      );
    }

    if (file.ownerId !== file.walletId && !file.acceptedAt) {
      // This file is shared and receiver didn't yet acceptted
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        `You must accept file share before accessing this file`,
      );
    }

    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: BUCKET_NAME_FILES,
      Key: `${file.ownerId}/${fileId}`,
      Expires: SIGNED_URL_EXPIRATION,
      SSECustomerAlgorithm: 'AES256',
      SSECustomerKeyMD5: file.dataEncryptionKey?.md5,
    });

    return utils.send(StatusCodes.OK, { ...file, url });
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
