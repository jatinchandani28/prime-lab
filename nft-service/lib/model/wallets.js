const { TABLE_NAME_WALLETS = 'near-wallets' } = process.env;
const docClient = require('../dynamodb');

async function listUserWallets(userId) {
  const { Items } = await docClient.query({
    TableName: TABLE_NAME_WALLETS,
    IndexName: 'userId-Index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  }).promise();
  return Items;
}

async function getWallet(walletId) {
  const { Item } = await docClient.get({
    TableName: TABLE_NAME_WALLETS,
    Key: {
      walletId,
    },
  }).promise();
  if (!Item) {
    throw new Error(`Wallet '${walletId}' not found`);
  }
  return Item;
}

module.exports = {
  listUserWallets,
  getWallet,
};
