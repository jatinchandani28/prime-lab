const utils = require('../../utils');
const { nanoid } = require('nanoid');
const { DYNAMODB_NFT_ACTIVITIES_TABLE } = process.env;

async function getActivitiesByNftId(nftId) {
  const params = {
    TableName: DYNAMODB_NFT_ACTIVITIES_TABLE,
    ScanIndexForward: false,
    IndexName: 'nftId-Index',
    KeyConditionExpression: '#nftId = :nftId',
    ExpressionAttributeValues: {
      ':nftId': nftId,
    },
    ExpressionAttributeNames: {
      '#nftId': 'nftId',
    },
  };
  const { Items } = await utils.dynamoDb.query(params);
  return Items;
}

const createActivity = async (params) => {
  const tableParams = {
    TableName: DYNAMODB_NFT_ACTIVITIES_TABLE,
    Item: {
      activityId: nanoid(),
      nftId: params.nftId,
      action: params.action,
      fromWalletId: params.fromWalletId,
      toWalletId: params.toWalletId,
      amount: params.amount,
      created: +new Date()
    },
  };

  await utils.dynamoDb.put(tableParams);

  return tableParams.Item;
};

module.exports = {
  getActivitiesByNftId,
  createActivity,
};
