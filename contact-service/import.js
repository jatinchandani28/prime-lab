/* eslint-disable no-plusplus */
const BPromise = require('bluebird');
const { chunk, filter, map } = require('lodash');
const DynamoDB = require('aws-sdk/clients/dynamodb');
const { nanoid } = require('nanoid');
const { StatusCodes } = require('http-status-codes');
const utils = require('./utils');
const hash = require('object-hash');
const { contactSchema } = require('./validation/schema');

const dynamo = new DynamoDB.DocumentClient();

const { TABLE_NAME_CONTACTS = 'near-contacts' } = process.env;

function importContact(userId) {
  return async function (contact) {
    const { error } = await contactSchema.validate(
      contact,
      utils.schemaOptions,
    );

    if (error) {
      return {
        error: `${error.details.map((x) => x.message).toString()}`,
        contact,
      };
    }

    const [email = {}] = contact.email;
    const [phone = {}] = contact.phone;

    if (!email.address && !phone.number) {
      return {
        error: 'One value is mandatory from email and phone',
      };
    }
    const data = {
      ...contact,
      userId,
      isFavorite: false,
    };
    const item = {
      ...data,
      contactId: hash(data, { algorithm: 'sha256', encoding: 'hex' }),
    };
    return {
      PutRequest: {
        Item: item,
      },
    };
  };
}

module.exports.main = async (event) => {
  console.log('event', event);
  const reqId = nanoid();
  try {
    const { userId } = event.pathParameters;
    const importArray = JSON.parse(event.body);

    if (!userId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "userId" is required.',
      });
    }
    // TODO: add further check to ensure userid is for the current user
    await utils.verifyAccessToken(event);
    const results = await BPromise.map(importArray, importContact(userId), {
      concurrency: 5,
    });
    const errors = filter(results, (r) => !!r.error);
    const putRequests = filter(results, (r) => !r.error);
    const putErrors = [];

    if (putRequests.length) {
      const batches = chunk(putRequests, 25); // Hard limit of batch requests in dynamodb
      await BPromise.map(
        batches,
        async (batch) => {
          const {
            UnprocessedItems: { [TABLE_NAME_CONTACTS]: unprocessedItems },
          } = await dynamo
            .batchWrite({
              RequestItems: {
                [TABLE_NAME_CONTACTS]: batch,
              },
            })
            .promise();
          if (unprocessedItems?.length) {
            putErrors.push(...unprocessedItems);
          }
        },
        { concurrency: 5 },
      );
    }

    return utils.send(StatusCodes.OK, {
      message: 'Contacts imported.',
      data: {
        contactsImported: putRequests.length - putErrors.length,
        contactsNotImported: errors.length + putErrors.length,
        contactsWithError: map(errors, 'contact'),
        ...(errors.length + putErrors.length > 0
          ? { errorMessage: map(errors, 'error') }
          : {}),
      },
    });
  } catch (error) {
    console.log(`reqId: ${reqId}, error: Error importing contacts`, error);
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error importing contacts!',
        data: error.message,
      },
      error,
    );
  }
};
