const chunk = require('lodash/chunk');
const flatten = require('lodash/flatten');
const BPromise = require('bluebird');

const { TABLE_NAME_USERS } = process.env;
const docClient = require('../dynamodb');

async function batchGetUsers(userIds = []) {
  const batches = chunk(userIds, 100); // this is a hard limitation for batchGetItem
  const results = await BPromise.map(
    batches,
    async (batch) => {
      const params = {
        RequestItems: {
          [TABLE_NAME_USERS]: { Keys: batch.map((userId) => ({ userId })) },
        },
      };
      return docClient.batchGet(params)
        .promise()
        .then(({ Responses: { [TABLE_NAME_USERS]: items } }) => items);
    },
    { concurrency: 5 },
  ); // 5 * 100 = 500 contacts concurrently
  return flatten(results);
}

async function getUserByEmail(email) {
  const { Items } = await docClient.query({
    TableName: TABLE_NAME_USERS,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
  }).promise();
  return Items[0];
}

async function getUserByPhone(phone) {
  const { Items } = await docClient.query({
    TableName: TABLE_NAME_USERS,
    IndexName: 'PhoneIndex',
    KeyConditionExpression: 'phone = :phone',
    ExpressionAttributeValues: {
      ':phone': phone,
    },
  }).promise();
  return Items[0];
}

module.exports = {
  batchGetUsers,
  getUserByEmail,
  getUserByPhone,
};
