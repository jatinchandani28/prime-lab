const dynamodb = require('../lib/dynamodb');

const { DYNAMODB_USER_TABLE } = process.env;

/**
 * Update or Insert a new user
 * @param {string} userId - UserId
 * @param {Object} data - data to update or insert
 * @param {string} [conditionExpression] - any condition expression to be checked before upsert
 * @return {Promise<DocumentClient.AttributeMap>}
 */

async function upsertUser({ userId, ...data }, conditionExpression) {
  const { Attributes } = await dynamodb.update({
    TableName: DYNAMODB_USER_TABLE,
    Key: { userId },
    ...dynamodb.marshallUpdateRequest(data),
    ...(conditionExpression
      ? {
        ConditionExpression: conditionExpression,
      }
      : {}),
    ReturnValues: 'ALL_NEW',
  }).promise();

  return Attributes;
}

/**
 * Retrieve a specific user using userId
 * @param {string} userId - UserId
 * @return {Promise<DocumentClient.AttributeMap>}
 */
async function getUser(userId) {
  const { Item } = await dynamodb.get({
    TableName: DYNAMODB_USER_TABLE,
    Key: { userId },
  }).promise();
  return Item;
}

module.exports = {
  upsertUser,
  getUser,
};
