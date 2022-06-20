const DynamoDB = require('aws-sdk/clients/dynamodb');
const { nanoid } = require('nanoid');
const { StatusCodes } = require('http-status-codes');
const utils = require('./utils');

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
    await dynamo
      .delete({
        TableName: 'near-contacts',
        Key: { contactId },
        ConditionExpression: 'attribute_exists(contactId)',
      })
      .promise();

    console.log(
      `reqId: ${reqId}, msg: Contact with contactId: ${contactId} deleted successfully!`,
    );
    return utils.send(StatusCodes.OK, {
      message: 'Contact deleted successfully!',
    });
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      console.log(
        `reqId: ${reqId}, error: Error deleting contactId:${contactId}  not found `,
      );
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `Error deleting contact. contactId: ${contactId} not found!`,
      });
    }

    console.log(`reqId: ${reqId}, error: Error deleting contacts to the user`);
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error deleting contacts to the user!',
        data: error.message,
      },
      error,
    );
  }
};
