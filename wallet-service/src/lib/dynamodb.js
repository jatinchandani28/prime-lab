const Dynamodb = require('aws-sdk/clients/dynamodb');

// Profit from free cold start to init clients
const client = new Dynamodb.DocumentClient();

const RESERVED_KEYS = ['created'];

/**
 * A helper function that accepts an object, adds `created`, `updated` attributes if they don't
 * exist and marshall the output. It returns UpdateExpression, ExpressionAttributeNames and
 * ExpressionAttributeValues to be used when calling dynamodb.updateItem().
 * `created` attribute is add to the table item if it does not already exist.
 *
 * @param {Object} input - Object to be updated
 * @return {{ExpressionAttributeNames: {[key: string]: string}, UpdateExpression: string, ExpressionAttributeValues: {[key: string]: DynamoDB.AttributeValue}}}
 */
client.marshallUpdateRequest = (input) => {
  const now = new Date();
  const data = {
    created: now.toISOString(),
    updated: now.toISOString(),
    ...input,
  };
  const expressionAttributeNames = {
    '#created': 'created',
  };
  const removeExpressionAttributeNames = {};
  const expressionAttributeValues = {
    ':created': data.created,
  };

  const keys = Object.keys(data).filter((key) => !RESERVED_KEYS.includes(key));
  const setKeys = keys.filter((k) => data[k] !== null && data[k] !== undefined);
  const removeKeys = keys.filter((k) => data[k] === null || data[k] === undefined);
  const updateExpressionItems = setKeys.map((key) => `#${key}=:${key}`);
  setKeys.forEach((key) => {
    expressionAttributeValues[`:${key}`] = data[key];
    expressionAttributeNames[`#${key}`] = key;
  });
  removeKeys.forEach((key) => {
    removeExpressionAttributeNames[`#${key}`] = key;
  });
  const removeExpression = removeKeys.length
    ? `REMOVE ${Object.keys(removeExpressionAttributeNames).join(', ')}`
    : '';

  const UpdateExpression = `SET ${updateExpressionItems.join(
    ', ',
  )}, #created = if_not_exists(created, :created) ${removeExpression}`;

  return {
    UpdateExpression,
    ExpressionAttributeNames: { ...expressionAttributeNames, ...removeExpressionAttributeNames },
    ExpressionAttributeValues: expressionAttributeValues,
  };
};

module.exports = client;