const utils = require('./utils');
const { StatusCodes } = require('http-status-codes');
const { DYNAMODB_NFT_COLLECTIONS_TABLE } = process.env;

module.exports.handler = async (event) => {
  try {    
    // we should have all collectionsId to fetch by batchGet
    const collection = await getCollections({}, [], 0);
    return utils.send(200, {
      message: 'NFT Collections retrieved successfully.',
      data: collection,
    });
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};

const getCollections = async (collection, collectionIDList, i) => {
  // Create KeyList
  const keyList = [];
  for (
    let j = i * 100;
    j >= i * 100 && j < (i + 1) * 100 && j < collectionIDList.length;
    j++
  ) {
    keyList.push({
      collectionId: collectionIDList[j],
    });
  }
  if (!keyList.length) return collection;
  const params = {
    RequestItems: {},
  };
  const collectionTable = DYNAMODB_NFT_COLLECTIONS_TABLE;
  params.RequestItems[collectionTable] = {
    Keys: keyList,
  };
  const data = await utils.dynamoDb.batchGet(params);
  for (let i in data.Responses[collectionTable]) {
    collection[data.Responses[collectionTable][i].collectionId] =
      data.Responses[collectionTable][i];
  }
  if (i < Math.floor(collectionIDList.length / 100)) {
    return await getCollections(collection, collectionIDList, i + 1);
  } else {
    return collection;
  }
};
