const DynamoDB = require('aws-sdk/clients/dynamodb');

const { TABLE_NAME_NFT_COLLECTIONS } = process.env;
const docClient = new DynamoDB.DocumentClient();

async function getById(collectionId) {
  const { Item } = await docClient.get({
    TableName: TABLE_NAME_NFT_COLLECTIONS,
    Key: {
      collectionId,
    },
  }).promise();
  return Item;
}

module.exports = {
  getById,
};
