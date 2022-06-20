// TODO: use alias to reference ~lib/ instead of ../../src/lib
const dynamodb = require('../lib/dynamodb');

const { TABLE_NAME_HASHES } = process.env;

/**
 * Create or update a hash
 * @param {object} data - any other information about the hash
 * @param {string} [conditionExpression] - optional condition
 * @return {Promise<DocumentClient.AttributeMap>}
 */
async function upsertHash(
    { hk, sk, ...data }, conditionExpression = undefined) {
  const { Attributes } = await dynamodb.update({
    TableName: TABLE_NAME_HASHES,
    Key: {
      hk: `HASH#${ data.value }`,
      sk: `value=${ data.value }`,
    },
    ...dynamodb.marshallUpdateRequest(
        data),
    ...(conditionExpression
        ? {
          ConditionExpression: conditionExpression,
        }
        : {}),
    ReturnValues: 'ALL_NEW',
  }).promise();

  return Attributes;
}

async function getHash(value) {
  const { Item } = await dynamodb.get({
    TableName: TABLE_NAME_HASHES,
    Key: {
      hk: `HASH#${ value }`,
      sk: `value=${ value }`,
    },
  }).promise();
  return Item;
}

module.exports = {
  upsertHash,
  getHash,
};
