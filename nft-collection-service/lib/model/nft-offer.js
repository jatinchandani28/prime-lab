const utils = require('../../utils');
const { OfferType } = require('../../utils');
const { nanoid } = require('nanoid');
const { DYNAMODB_NFT_OFFERS_TABLE } = process.env;

const createOffer = async (params) => {
  const { nftId, offerType, offerPrice, offerNftId, action, userId, expire } = params;
  const tableParams = {
    TableName: DYNAMODB_NFT_OFFERS_TABLE,
    Item: {
      offerId: nanoid(),
      nftId, offerType, action, userId, expire,
      ...(offerType === OfferType.TOKEN && { offerPrice }),
      ...(offerNftId === OfferType.NFT && { offerNftId }),
      status: 'pending',
      created: +new Date(),
      updated: +new Date(),
    },
  };

  await utils.dynamoDb.put(tableParams);

  return tableParams.Item;
};

async function getOffersByNftId(nftId) {
  const params = {
    TableName: DYNAMODB_NFT_OFFERS_TABLE,
    ScanIndexForward: true,
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

async function getOfferById(offerId) {
  const params = {
    TableName: DYNAMODB_NFT_OFFERS_TABLE,
    Key: {
      offerId: offerId,
    },
  };
  const { Item } = await utils.dynamoDb.get(params);
  return Item;
}

async function updateOfferById(offerId, inputParams) {
  const params = {
    TableName: DYNAMODB_NFT_OFFERS_TABLE,
    Key: {
      offerId: offerId,
    },
    ...utils.constructUpdateExpressions(inputParams),
    ReturnValues: 'ALL_NEW',
  };
  const { Attributes } = await utils.dynamoDb.update(params);
  return Attributes;
}

async function deleteOfferById(offerId) {
  const params = {
    TableName: DYNAMODB_NFT_OFFERS_TABLE,
    Key: {
      offerId: offerId,
    },
  };
  const { Item } = await utils.dynamoDb.get(params);
  return  Item;
}

module.exports = {
  createOffer,
  getOffersByNftId,
  getOfferById,
  updateOfferById,
};
