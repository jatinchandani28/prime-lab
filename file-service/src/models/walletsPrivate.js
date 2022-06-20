const { StatusCodes } = require('http-status-codes');
// TODO: use alias to reference ~lib/ instead of ../../src/lib
const dynamodb = require('../lib/dynamodb');
const HttpError = require('../../error');

const { TABLE_NAME_WALLETS_PRIVATE } = process.env;

/**
 * Retrieves wallet item from 'wallets' table using it's walletId.
 * @param {string} walletId
 * @return {Promise<{[p: string]: any}>}
 */
async function getWallet(walletId) {
  const { Item } = await dynamodb.get({
    TableName: TABLE_NAME_WALLETS_PRIVATE,
    Key: {
      walletId,
    },
  }).promise();

  if (!Item) {
    throw new HttpError(StatusCodes.NOT_FOUND, `Wallet '${walletId} not found'`);
  }

  return Item;
}

module.exports = {
  getWallet,
};
