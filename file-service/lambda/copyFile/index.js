const S3 = require('aws-sdk/clients/s3');
const { StatusCodes } = require('http-status-codes');
const { v4: uuidv4 } = require('uuid');
const utils = require('../../utils');
const HttpError = require('../../error');

// TODO: use aliases fro ../../src/models/wallets -> ~models/wallets
const Files = require('../../src/models/files');

// TODO: replace user file by module from user-service/utils when they finish returning decoded
//  value
const { verifyUser } = require('../../user');
const { getWallet } = require('../../src/models/wallets');

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

    // TODO: @feature/file-service-andre: verify that the walletId linked to userId otherwise UNAUTHORIZED
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
    const copyFileId = uuidv4();

    await s3.copyObject({
      Bucket: BUCKET_NAME_FILES,
      CopySource: `${file.ownerId}/${fileId}`,
      Key: `${walletId}/${copyFileId}`,
    });

    // TODO: handle dataEncryptionKey transfer from owner to new owner
    const copyFile = await Files.upsertFile({
      ...file,
      walletId,
      ownerId: walletId, // Transfer property to current wallet
      fileId: copyFileId,
      userId,
      name: `Copy of ${file.name}`,
    });

    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: BUCKET_NAME_FILES,
      Key: `${copyFile.ownerId}/${copyFile.fileId}`,
      Expires: SIGNED_URL_EXPIRATION,
      SSECustomerAlgorithm: 'AES256',
      SSECustomerKeyMD5: copyFile.dataEncryptionKey?.md5,
    });

    return utils.send(StatusCodes.OK, { ...copyFile, url });
  } catch (e) {
    if (!e.status) {
      console.error(e.message, e);
    }
    return utils.send(
      e.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: e.message,
        data: e.data,
      },
      e,
    );
  }
};
