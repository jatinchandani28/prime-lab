const utils = require('../../utils');
const { nanoid } = require('nanoid');
const { DYNAMODB_NFT_COLLECTIONS_TABLE } = process.env;

async function getCollectionsByOwnerId(ownerId) {
  const params = {
    TableName: DYNAMODB_NFT_COLLECTIONS_TABLE,
    ScanIndexForward: true,
    IndexName: 'OwnerIdIndex',
    KeyConditionExpression: '#ownerId = :ownerId',
    FilterExpression: "active = :active",
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
      ':active': true
    },
    ExpressionAttributeNames: {
      '#ownerId': 'ownerId',
    },
  };
  const { Items } = await utils.dynamoDb.query(params);
  return Items;
}

const createCollection = async (params) => {
  const { collectionName, ownerId } = params;
  const tableParams = {
    TableName: DYNAMODB_NFT_COLLECTIONS_TABLE,
    Item: {
      collectionId: nanoid(),
      collectionName,
      ownerId,
      active: true,
      created: +new Date(),
      updated: +new Date(),
    },
  };

  await utils.dynamoDb.put(tableParams);

  return tableParams.Item;
};

const getCollectionById = async (collectionId) => {
  const tableParams = {
    TableName: DYNAMODB_NFT_COLLECTIONS_TABLE,
    Key: {
      collectionId: collectionId,
    },
  };
  const { Item } = await utils.dynamoDb.get(tableParams);
  return Item;
};

const updateCollection = async (collectionId, inputParams) => {
  const { collectionName, ownerId } = inputParams;
  const params = {
    TableName: DYNAMODB_NFT_COLLECTIONS_TABLE,
    Key: {
      collectionId,
    },
    UpdateExpression: 'set collectionName = :collectionName, updated = :updated',
    ConditionExpression: 'attribute_exists(collectionId) and #collectionId = :collectionId and #ownerId = :ownerId and #active = :active',
    ExpressionAttributeNames: {
      '#collectionId': 'collectionId',
      '#ownerId': 'ownerId',
      '#active': 'active',
    },
    ExpressionAttributeValues: {
      ':collectionId': collectionId,
      ':collectionName': collectionName,
      ':active': true,
      ':ownerId': ownerId,
      ':updated': +new Date()
    },
    ReturnValues: 'ALL_NEW',
  };
  const { Attributes } = await utils.dynamoDb.update(params);
  return Attributes;
};

const deleteCollection = async (collectionId) => {
  const params = {
    TableName: DYNAMODB_NFT_COLLECTIONS_TABLE,
    Key: {
      collectionId: collectionId,
    },
    UpdateExpression: 'set active = :active, updated = :updated',
    ConditionExpression: 'attribute_exists(collectionId) and #collectionId = :collectionId',
    ExpressionAttributeNames: {
      '#collectionId': 'collectionId',
    },
    ExpressionAttributeValues: {
      ':collectionId': collectionId,
      ':active': false,
      ':updated': +new Date()
    },
    ReturnValues: 'ALL_NEW',
  };
  const { Attributes } = await utils.dynamoDb.update(params);
  return Attributes;
};

module.exports = {
  getCollectionsByOwnerId,
  createCollection,
  updateCollection,
  getCollectionById,
  deleteCollection
};
