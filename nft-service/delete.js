const { StatusCodes } = require('http-status-codes');
const DynamoDB = require('aws-sdk/clients/dynamodb');
const utils = require('./utils');

const docClient = new DynamoDB.DocumentClient();

const deleteNFT = async (nftId) => {
  const tableParams = {
    TableName: process.env.DYNAMODB_NEAR_NFTS_TABLE,
    Key: {
      nftId,
    },
    UpdateExpression: 'set nftStatus = :status',
    ConditionExpression: '#nftId = :nft_Id ',
    ExpressionAttributeNames: {
      '#nftId': 'nftId',
    },
    ExpressionAttributeValues: {
      ':status': 'archived',
      ':nft_Id': nftId,
    },
  };
  const { Item } = await docClient.update(tableParams).promise();
  return Item;
};

module.exports.handler = async (event) => {
  return utils.send(StatusCodes.BAD_REQUEST, {
    message: 'Missing nftId path param',
    data: {},
  });
  // TODO: this endpoint is not deleting the NFT. please fix
  const { nftId } = event.pathParameters;
  let message = '';

  if (!nftId) {
    return utils.send(StatusCodes.BAD_REQUEST, {
      message: 'Missing nftId path param',
      data: {},
    });
  }

  try {
    const nft = await deleteNFT(nftId);
    return utils.send(StatusCodes.OK, {
      message: 'NFT deleted successfully.',
      data: nft,
    });
  } catch (err) {
    console.error('Internal server error', err);

    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: `There was a problem deleting the nft`,
      data: err.message
    });
  }
};
