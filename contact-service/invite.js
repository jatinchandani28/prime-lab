const AWS = require('aws-sdk');
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

const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.main = async (event) => {
  const reqId = nanoid();
  const { contactId } = event.pathParameters;

  try {
    if (!contactId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "contactId" is required.',
      });
    }
    const { userId } = await utils.verifyAccessToken(event);
    let baseURL = '';
    if (process.env.IS_OFFLINE) {
      baseURL = `http://${event.headers.Host}`;
    } else {
      baseURL = `https://${event.headers.Host}`;
    }
    const data = {
      inviteLink: `${baseURL}/invite/${reqId}`,
    };

    const params = {
      TableName: 'near-contacts',
      Key: { contactId },
      UpdateExpression: 'set inviteStatus = :s',
      ExpressionAttributeValues: {
        ':s': 'invited',
        ':userId': userId,
      },
      ConditionExpression:
        'attribute_exists(contactId) and attribute_exists(userId) and userId=:userId',
      ReturnValues: 'UPDATED_NEW',
    };
    await dynamo.update(params).promise();

    return utils.send(StatusCodes.OK, data);
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      console.log(
        `reqId: ${reqId}, error: Error updating contact invite status. userId:${userId}, contactId: ${contactId}  not found `,
      );
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `Error updating contact invite status. userId: ${userId}, contactId: ${contactId} not found!`,
      });
    }
    console.log(`reqId: ${reqId}, error: Error invite contacts`);
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error invite contacts!',
        data: error.message,
      },
      error,
    );
  }
};
