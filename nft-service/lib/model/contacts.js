const chunk = require('lodash/chunk');
const flatten = require('lodash/flatten');
const BPromise = require('bluebird');

const { TABLE_NAME_CONTACTS } = process.env;
const docClient = require('../dynamodb');

async function batchGetContacts(contactIds = []) {
  const batches = chunk(contactIds, 100); // this is a hard limitation for batchGetItem
  const results = await BPromise.map(
    batches,
    async (batch) => {
      const params = {
        RequestItems: {
          [TABLE_NAME_CONTACTS]: { Keys: batch.map((contactId) => ({ contactId })) },
        },
      };
      return docClient.batchGet(params)
        .promise()
        .then(({ Responses: { [TABLE_NAME_CONTACTS]: items } }) => items);
    },
    { concurrency: 5 },
  ); // 5 * 100 = 500 contacts concurrently
  return flatten(results);
}

async function updateContact({ contactId, ...data }) {
  const { Attributes } = await docClient.update({
    TableName: TABLE_NAME_CONTACTS, Key: { contactId }, ...docClient.marshallUpdateRequest(data),
  }).promise();
  return Attributes;
}

module.exports = {
  batchGetContacts,
  updateContact,
};
