const DynamoDB = require('aws-sdk/clients/dynamodb');
const { nanoid } = require('nanoid');
const { StatusCodes } = require('http-status-codes');
const utils = require('./utils');
const { contactIdSchema } = require('./validation/schema');

// let options = {};

// if (process.env.IS_OFFLINE) {
//   options = {
//     region: 'us-east-1',
//     endpoint: 'http://localhost:8000',
//   };
// }

const dynamo = new DynamoDB.DocumentClient();

module.exports.main = async (event) => {
  const reqId = nanoid();
  const { contactId } = event.pathParameters;

  try {
    if (!contactId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "contactId" is required.',
      });
    }
    await utils.verifyAccessToken(event);
    const { error: contactIdError } = contactIdSchema.validate({ contactId });

    if (contactIdError) {
      console.log(`reqId: ${reqId}, error: contactId parameter is invalid.`);
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'contactId parameter is invalid.',
        data: contactIdError.details.map((item) => item.message),
      });
    }

    const params = {
      TableName: 'near-contacts',
      Key: { contactId },
      UpdateExpression: 'set contactStatus = :s',
      ExpressionAttributeValues: {
        ':s': 'blocked',
      },
      ConditionExpression: 'attribute_exists(contactId)',
      ReturnValues: 'UPDATED_NEW',
    };

    const data = await dynamo.update(params).promise();

    if (data) {
      console.log(`reqId: ${reqId}, msg: Contact blocked successfully!`);
      return utils.send(StatusCodes.OK, {
        message: 'Contact blocked successfully!',
        data,
      });
    }

    console.log(`reqId: ${reqId}, error: Unable to block contact`);
    return utils.send(StatusCodes.NOT_FOUND, {
      message: 'Unable to block contact',
    });
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      console.log(
        `reqId: ${reqId}, error: Error blocking contactId:${contactId}  not found `,
      );
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `Error blocking contact. contactId: ${contactId} not found!`,
      });
    }

    console.log(`reqId: ${reqId}, error: Error blocking contact`);
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error blocking contacts!',
        data: error.message,
      },
      error,
    );
  }
};
