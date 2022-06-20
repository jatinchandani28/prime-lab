const DynamoDB = require('aws-sdk/clients/dynamodb');

const { TABLE_NAME_NFT_CATEGORIES } = process.env;
const docClient = new DynamoDB.DocumentClient();

async function getById(categoryId) {
  const { Item } = await docClient.get({
    TableName: TABLE_NAME_NFT_CATEGORIES,
    Key: {
      categoryId,
    },
  }).promise();
  return Item;
}

module.exports = {
  getById,
};
