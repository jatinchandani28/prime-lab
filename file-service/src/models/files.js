// TODO: use alias to reference ~lib/ instead of ../../src/lib
const dynamodb = require('../lib/dynamodb');

const { TABLE_NAME_FILES } = process.env;

/**
 * Update or Insert a new file item in files table
 * @param {string} fileId - File UUID to update/insert
 * @param {string} userId - UserId who have access to this file
 * @param {Object} data - data to update or insert
 * @param {string} [conditionExpression] - any condition expression to be checked before upsert
 * @param {function} [paramsFn] - function to alter update parameters
 * @return {Promise<DocumentClient.AttributeMap>}
 */
async function upsertFile({ fileId, walletId, ...data }, conditionExpression, paramsFn = (p) => p) {
  const { Attributes } = await dynamodb.update(paramsFn({
    TableName: TABLE_NAME_FILES,
    Key: {
      fileId,
      walletId,
    },
    ...dynamodb.marshallUpdateRequest(data),
    ...(conditionExpression
        ? {
          ConditionExpression: conditionExpression,
        }
        : {}),
    ReturnValues: 'ALL_NEW',
  })).promise();

  return Attributes;
}

/**
 * Retrieve a specific file using its fileId and walletId
 * @param {string} fileId - file id to retrieve
 * @param {string} walletId - wallet id that should hold the file
 * @return {Promise<DocumentClient.AttributeMap>}
 */
async function getFile(walletId, fileId) {
  const { Item } = await dynamodb.get({
    TableName: TABLE_NAME_FILES,
    Key: {
      fileId,
      walletId,
    },
  }).promise();
  return Item;
}

/**
 * Retrieves all files that belong to a walletId
 * @param userId
 * @return {Promise<DocumentClient.AttributeMap[]>}
 */
async function getFiles(walletId) {
  // TODO: add pagination & limit to the query
  const { Items } = await dynamodb.query({
    TableName: TABLE_NAME_FILES,
    KeyConditionExpression: 'walletId = :walletId',
    ExpressionAttributeValues: {
      ':walletId': walletId
    }
  }).promise();
  return Items;
}

async function deleteFile(walletId, fileId) {
  await dynamodb.delete({
    TableName: TABLE_NAME_FILES,
    Key: {
      fileId,
      walletId,
    },
    // ReturnValues: 'ALL_OLD'
  }).promise();
}

/**
 * Delete a file from all wallets based on its hash
 * @param {string} hash - Hash value of the file
 * @return {Promise<void>}
 */
async function deleteFileFromAllWallets(hash) {
  const { Items } = await dynamodb.query({
    TableName: TABLE_NAME_FILES,
    IndexName: 'hash-index',
    KeyConditionExpression: `#hash = :hash`,
    ExpressionAttributeNames: {
      '#hash': 'hash',
    },
    ExpressionAttributeValues: {
      ':hash': hash,
    },
  }).promise();
  const keys = (Items || []).map((item) => ({ walletId: item.walletId, fileId: item.fileId }));
  await dynamodb.transactWrite({
    TransactItems: keys.map((Key) => ({
      Delete: {
        TableName: TABLE_NAME_FILES,
        Key,
      },
    })),
  }).promise();
}

module.exports = {
  upsertFile,
  getFile,
  getFiles,
  deleteFile,
  deleteFileFromAllWallets
};
