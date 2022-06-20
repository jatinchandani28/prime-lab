const DynamoDB = require('aws-sdk/clients/dynamodb');

const docClient = new DynamoDB.DocumentClient();

const { TABLE_NAME_TRANSACTIONS = 'near-transactions' } = process.env;

async function getTransactionById(transactionId) {
  const { Item } = await docClient.get({
    TableName: TABLE_NAME_TRANSACTIONS,
    Key: {
      transactionId,
    },
  }).promise();
  return Item;
}

module.exports = {
  getTransactionById,
};
