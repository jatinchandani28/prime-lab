const middy = require('@middy/core');
const jsonBodyParser = require('@middy/http-json-body-parser');
const httpErrorHandler = require('@middy/http-error-handler');
const { StatusCodes } = require('http-status-codes');
const utils = require('./utils');

// const sendTokenSchema = require('./validation/send-schema');
const createAccountSchema = require('./validation/create-account-schema');
const createFileSchema = require('./validation/create-file-schema');
const deleteFileSchema = require('./validation/delete-file-schema');
const grantFileAccessSchema = require('./validation/grant-file-access-schema');
const revokeFileAccessSchema = require('./validation/revoke-file-access-schema');
const nftSeriesCreateSchema = require('./validation/nfts-series-create-schema');
const nftsSeriesMintSchema = require('./validation/nfts-serie-mint-schema');
const createAndMintSchema = require('./validation/create-and-mint-nft-schema');

const baseHandler = async (event) => {
  console.log('event', JSON.stringify(event));
  const params = event.body;

  const operations = {
    // send_token: sendTokenSchema,
    create_account: createAccountSchema,
    create_file: createFileSchema,
    delete_file: deleteFileSchema,
    grant_file_access: grantFileAccessSchema,
    revoke_file_access: revokeFileAccessSchema,
    nft_series_create: nftSeriesCreateSchema,
    nft_series_mint: nftsSeriesMintSchema,
    create_and_mint_nft: createAndMintSchema,
  };

  if ((!params.type || !operations[params.type])) {
    return utils.send(StatusCodes.BAD_REQUEST, {
      message: `Parameter type is invalid or missing ${params.type || 'undefined'}. Allowed types are: ${Object.keys(operations).join(', ')}`,
    });
  }

  const { error } = operations[params.type].validate(params);

  if (error) {
    return utils.send(StatusCodes.BAD_REQUEST, {
      message: 'One or more fields are invalid.',
      data: error.details,
    });
  }

  try {
    const response = await utils.processOperation(params);
    return utils.send(StatusCodes.OK, { message: 'Transaction created successfully.', data: response });
  } catch (err) {
    console.log('Error creating transaction', err);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: `Error creating transaction:${err.stack}`,
      data: err.message,
    });
  }
};

const main = middy(baseHandler)
  .use(jsonBodyParser())
  .use(httpErrorHandler());

module.exports = { main };
