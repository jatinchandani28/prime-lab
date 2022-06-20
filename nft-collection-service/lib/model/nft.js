const utils = require("../../utils");
const { DYNAMODB_NFTS_TABLE } = process.env;

async function getNftById(nftId) {
  const params = {
    TableName: DYNAMODB_NFTS_TABLE,
    Key: {
      nftId
    }
  }
  const { Item } = await utils.dynamoDb.get(params);
  return Item;
}

async function updateNftById(nftId, inputParams) {
  const params = {
    TableName: DYNAMODB_NFTS_TABLE,
    Key: {
      nftId
    },
    ...utils.constructUpdateExpressions(inputParams)
  }
  const { Item } = await utils.dynamoDb.update(params);
  return Item;
}

module.exports = {
  getNftById,
  updateNftById,
}