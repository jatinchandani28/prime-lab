// eslint-disable-next-line import/no-extraneous-dependencies
const S3 = require('aws-sdk/clients/s3');
const { StatusCodes } = require('http-status-codes');
const utils = require('../../utils');
const HttpError = require('../../error');

const Files = require('../../src/models/files');

// TODO: replace user file by module from user-service/utils when they finish returning decoded
//  value
const { verifyUser } = require('../../user');

const s3 = new S3({ signatureVersion: 'v4' });

const {
  BUCKET_NAME_FILES,
} = process.env;

module.exports.handler = async (event) => {
  // TODO: use a library that handles log sampling according to stage
  console.log('event', JSON.stringify(event));
  // console.log(event);
  const {
    body: eventBody,
    pathParameters: { walletId, fileId },
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
      parts, uploadId,
    } = body;
    const { userId } = await verifyUser(event);
    const file = await Files.getFile(walletId, fileId);

    if (!file) {
      throw new HttpError(StatusCodes.NOT_FOUND, `File '${fileId}' not found`);
    }

    if (file.userId !== userId || file.walletId !== walletId) {
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        'You are not allowed to access this resource',
      );
    }

    await s3.completeMultipartUpload({
      Bucket: BUCKET_NAME_FILES, /* Bucket name */
      Key: `${walletId}/${fileId}_${file.name}`, /* File name */
      MultipartUpload: {
        Parts: parts, /* Parts uploaded */
      },
      UploadId: uploadId, /* UploadId from Endpoint 1 response */
    }).promise();

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
