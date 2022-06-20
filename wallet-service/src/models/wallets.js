const dynamodb = require("../lib/dynamodb");

const { TABLE_NAME_WALLETS } = process.env;

/**
 * Update or Insert a new wallet item in wallets table
 * @param {string} walletId - Wallet UUID to update/insert
 * @param {string} userId - UserId who has access to this wallet
 * @param {Object} data - data to update or insert
 * @param {string} [conditionExpression] - any condition expression to be checked before upsert
 * @return {Promise<DocumentClient.AttributeMap>}
 */

async function upsertWallet({ walletId, ...data }, conditionExpression) {
  const { Attributes } = await dynamodb
    .update({
      TableName: TABLE_NAME_WALLETS,
      Key: {
        walletId,
      },
      ...dynamodb.marshallUpdateRequest(data),
      ...(conditionExpression
        ? {
            ConditionExpression: conditionExpression,
          }
        : {}),
      ReturnValues: "ALL_NEW",
    })
    .promise();

  return Attributes;
}

/**
 * Retrieve a specific wallet using userId and walletId
 * @param {string} walletId - Wallet UUID
 * @param {string} userId - UserId who has access to this wallet
 * @return {Promise<DocumentClient.AttributeMap>}
 */
async function getWallet(walletId) {
  const { Item } = await dynamodb
    .get({
      TableName: TABLE_NAME_WALLETS,
      Key: {
        walletId,
      },
    })
    .promise();
  return Item;
}

/**
 * Retrieves all user wallets using its userId
 * @param {string} userId - UserId who has access to this wallet
 * @return {Promise<DocumentClient.AttributeMap>}
 */
async function getWalletsByUserId(userId) {
  const { Items } = await dynamodb
    .query({
      TableName: TABLE_NAME_WALLETS,
      IndexName: "userId-Index",
      KeyConditionExpression: "userId= :userId",
      ExpressionAttributeValues: { ":userId": userId },
    })
    .promise();
  return Items;
}

/**
 * Deletes a wallet using its walletId and owner userId
 * @param {string} walletId - Unique wallet identifier
 * @param {string} userId - UserId who has access to this wallet
 * @return {Promise<DocumentClient.AttributeMap[]>}
 */
async function deleteWallet(walletId) {
  await dynamodb
    .delete({
      TableName: TABLE_NAME_WALLETS,
      Key: {
        walletId,
      },
    })
    .promise();
}

/**
 * Update a wallet with transactionId
 * @param {string} walletId - Unique wallet identifier
 * @param {string} transactionId - transactionId comes from transaction API
 * @return {Promise<DocumentClient.AttributeMap[]>}
 */
async function updateWalletWithTransactionId(walletId, transactionId) {
  const { Attributes } = await dynamodb
    .update({
      TableName: TABLE_NAME_WALLETS,
      Key: {
        walletId,
      },
      UpdateExpression: "set transactionId = :transactionId",
      ConditionExpression: "#walletId = :walletId",
      ExpressionAttributeNames: {
        "#walletId": "walletId",
      },
      ExpressionAttributeValues: {
        ":transactionId": transactionId,
        ":walletId": walletId,
      },
      ReturnValues: "ALL_NEW",
    })
    .promise();

  return Attributes;
}

module.exports = {
  upsertWallet,
  getWallet,
  getWalletsByUserId,
  deleteWallet,
  updateWalletWithTransactionId,
};
