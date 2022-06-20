// eslint-disable-next-line import/no-extraneous-dependencies
const S3 = require('aws-sdk/clients/s3');
const crypto = require('crypto');
const BPromise = require('bluebird');
const { StatusCodes } = require('http-status-codes');
const { v4: uuidv4 } = require('uuid');
const utils = require('../../utils');
const HttpError = require('../../error');

// TODO: use aliases fro ../../src/models/wallets -> ~models/wallets
const Wallets = require('../../src/models/wallets');
const Files = require('../../src/models/files');

// TODO: replace user file by module from user-service/utils when they finish returning decoded
//  value
const { verifyUser } = require('../../user');

const s3 = new S3({ signatureVersion: 'v4' });

const {
  BUCKET_NAME_FILES,
  SIGNED_URL_EXPIRATION = 60 * 15, // 15mn
} = process.env;

module.exports.handler = async (event) => {
  // TODO: use a library that handles log sampling according to stage
  console.log('event', JSON.stringify(event));
  // console.log(event);
  const {
    body: eventBody,
    pathParameters: { walletId },
  } = event;
  let body;
  try {
    try {
      body = JSON.parse(eventBody);
    } catch (err) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'Invalid JSON Body',
        data: {},
      });
    }
    const {
      name, path, description, storageProvider, parts = 0,
    } = body;
    const { userId } = await verifyUser(event);

    // Starting from here, user is authenticated
    const wallet = await Wallets.getWallet(walletId);

    if (!wallet) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Wallet not found');
    }
    if (wallet.userId !== userId || wallet.walletId !== walletId) {
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        'Wallet associated with user mismatch with stored wallet',
      );
    }

    const fileId = uuidv4(); // Generate random UUID V4 as clear data encryption key
    const dataEncryptionKey = uuidv4(); // Generate random UUID V4 as clear data encryption key

    // TODO: see if we can use AWS Encryption SDK (RSA format?) https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/use-raw-rsa-keyring.html
    // TODO: to uncomment when near-walletsPrivate table is created
    // const encryptedDataEncryptionKey = utils.encrypt(dataEncryptionKey, wallet.pubKey);
    // TODO: encrypt dataEncryptionKey with wallet.pubKey before sending back to the client
    const encryptedDataEncryptionKey = dataEncryptionKey;

    const dataEncryptionKeySHA256 = crypto.createHash('sha256').update(dataEncryptionKey);
    const dataEncryptionKeyMd5 = crypto.createHash('md5')
      .update(dataEncryptionKeySHA256.digest())
      .digest('base64');

    // const base = crypto.createHash('sha256').update(dataEncryptionKey).digest('base64');
    // console.log('base64', base);

    const url = await s3.getSignedUrlPromise('putObject', {
      Bucket: BUCKET_NAME_FILES,
      // Key: `${ walletId }/${ fileId }`,
      Key: `${walletId}/${fileId}_${name}`,
      Expires: SIGNED_URL_EXPIRATION,
      // SSECustomerAlgorithm: 'AES256',
      // SSECustomerKeyMD5: dataEncryptionKeyMd5,
      ACL: 'public-read',
    });

    let uploadId;
    let multipartUrls = [];
    if (parts) {
      const { UploadId } = await s3.createMultipartUpload({
        Bucket: BUCKET_NAME_FILES,
        Key: `${walletId}/${fileId}_${name}`,
        ACL: 'public-read',
      }).promise();
      uploadId = UploadId;
      multipartUrls = await BPromise.map(
        Array(parts),
        async (_, index) => s3.getSignedUrl('uploadPart', {
          Bucket: BUCKET_NAME_FILES,
          // Key: `${ walletId }/${ fileId }`,
          Key: `${walletId}/${fileId}_${name}`,
          Expires: SIGNED_URL_EXPIRATION,
          // SSECustomerAlgorithm: 'AES256',
          // SSECustomerKeyMD5: dataEncryptionKeyMd5,

          UploadId,
          PartNumber: index + 1,
        }),
        { concurrency: 10 },
      );
    }

    const { ttl, ...file } = await Files.upsertFile({
      fileId,
      userId,
      walletId,
      ownerId: walletId,
      name,
      path,
      description,
      storageProvider,
      dataEncryptionKey: {
        md5: dataEncryptionKeyMd5,
        encrypted: encryptedDataEncryptionKey,
      },
      publicUrl: `https://${BUCKET_NAME_FILES}.s3.amazonaws.com/${walletId}/${fileId}_${name}`,
      ttl: Math.floor(Date.now() / 1000) + SIGNED_URL_EXPIRATION,
    });

    const response = {
      ...file,
      url,
      ...(multipartUrls.length ? { multipart: { urls: multipartUrls, uploadId } } : {}),
    };
    return utils.send(StatusCodes.OK, response);
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
