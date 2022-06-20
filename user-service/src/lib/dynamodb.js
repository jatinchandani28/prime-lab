const Dynamodb = require('aws-sdk/clients/dynamodb');

// Profit from free cold start to init clients
let options = {
  region: 'us-east-1',
  endpoint: 'http://127.0.0.1:8000'
}
const client = new DynamoDB.DocumentClient(options)
//const client = new Dynamodb.DocumentClient();


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
    ...input,
    created: now.toISOString(),
    updated: now.toISOString(),
  };
  const expressionAttributeNames = {
    '#created': 'created',
  };
  const expressionAttributeValues = {
    ':created': data.created,
  };

  const keys = Object.keys(data).filter((key) => !RESERVED_KEYS.includes(key));

  const updateExpressionItems = [];

  keys.forEach((key) => {
      if (data[key] !== null && data[key] !== undefined) {
        updateExpressionItems.push(`#${key}=:${key}`);
        expressionAttributeValues[`:${key}`] = data[key];
        expressionAttributeNames[`#${key}`] = key;
      }
  });

  const UpdateExpression = `SET ${updateExpressionItems.join(
    ', ',
  )}, #created = if_not_exists(created, :created)`;

  return {
    UpdateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };
};

module.exports = client;
