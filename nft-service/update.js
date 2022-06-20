const { StatusCodes } = require('http-status-codes');
const DynamoDB = require('aws-sdk/clients/dynamodb');
const utils = require('./utils');
const schema = require('./validation/update-nft-schema');
const HttpError = require('./lib/error');

const dynamodb = new DynamoDB.DocumentClient();

const updateNFT = async (params) => {
  const {
    nftId,
    title,
    description,
    categoryId,
    filePath,
    price,
    ownerWalletId,
  } = params;

  const tableParams = {
    TableName: process.env.DYNAMODB_NEAR_NFTS_TABLE,
    Key: {
      nftId,
    },
    UpdateExpression:
      'set title = :title, description = :description, categoryId = :categoryId, filePath = :filePath, price = :price',
    ConditionExpression: '#ownerWalletId = :ownerWalletId and #nftId = :nftId ',
    ExpressionAttributeNames: {
      '#ownerWalletId': 'ownerWalletId',
      '#nftId': 'nftId',
    },
    ExpressionAttributeValues: {
      ':title': title,
      ':description': description,
      ':categoryId': categoryId,
      ':filePath': filePath,
      ':price': price,
      ':ownerWalletId': ownerWalletId,
      ':nftId': nftId,
    },
  };
  const { Item } = await dynamodb.update(tableParams).promise();
  return Item;
};

module.exports.handler = async (event) => {
  console.log('event', event);
  try {
    const {
      pathParameters: { nftId },
      body,
    } = event;
    const data = JSON.parse(body);

    const user = await utils.verifyAccessToken(event);
    
    // TODO: make a decision here is: it walletId or walletName
    data.ownerWalletId = user.walletId || user.walletName;

    if (!nftId) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Missing nftId path param');
    }
    data.nftId = nftId;
    const { error } = schema.validate(data, utils.schemaOptions);

    if (error) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        error.details.map((x) => x.message).join(', '),
        error.details,
      );
    }
    try {
      const { price } = data;
      if (!price && Number.isNaN(parseInt(price, 10))) {
        throw new HttpError(StatusCodes.BAD_REQUEST, 'Price is not valid');
      }
      const nft = await updateNFT(data);
      return utils.send(StatusCodes.OK, {
        message: 'NFT updated successfully.',

        data: nft,
      });
    } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') {
        throw new HttpError(
          StatusCodes.BAD_REQUEST,
          `NFT '${nftId}' is not found or you don't have the right to update it`,
        );
      }
      throw err;
    }
  } catch (err) {
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error update NFT',
        data: err.message,
      },
      err,
    );
  }
};
