const DynamoDB = require('aws-sdk/clients/dynamodb');
const { nanoid } = require('nanoid');
const { StatusCodes } = require('http-status-codes');
const { isEmpty } = require('lodash');
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
  const { contactId, userId } = event.pathParameters;

  try {
    if (!userId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "userId" is required.',
      });
    }

    if (!userId) {
      console.log(`reqId: ${reqId}, error: userId parameter is invalid.`);
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "userId" is required.',
      });
    }

    if (!contactId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "contactId" is required.',
      });
    }
    await utils.verifyAccessToken(event);
    const contact = await dynamo
      .get({
        TableName: 'near-contacts',
        Key: {
          contactId: contactId.trim(),
        },
      })
      .promise();

    if (isEmpty(contact)) {
      console.log(`reqId: ${reqId}, error: contactId: ${contactId} not found!`);
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `contactId: ${contactId} not found! !`,
      });
    }

    const params = {
      TableName: 'near-contacts',
      Key: { contactId },
      UpdateExpression: 'set isFavorite = :r',
      ConditionExpression: 'userId = :u',
      ExpressionAttributeValues: {
        ':r': !contact.Item.isFavorite,
        ':u': userId,
      },
      ReturnValues: 'UPDATED_NEW',
    };

    const data = await dynamo.update(params).promise();

    if (data) {
      console.log(
        `reqId: ${reqId}, msg: Contact favorite status updated successfully!`,
      );
      return utils.send(StatusCodes.OK, {
        message: 'Contact favorite status updated successfully!',
        data: data.Attributes,
      });
    }

    console.log(`reqId: ${reqId}, error: Unable to update contact favorite`);
    return utils.send(StatusCodes.NOT_FOUND, {
      message: 'Unable to update contact favorite',
      data: {},
    });
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      console.log(
        `reqId: ${reqId}, error: Error updating contact favorite status. userId:${userId}  not found `,
      );
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `Error updating contact favorite status. userId: ${userId} not found!`,
      });
    }

    console.log(`reqId: ${reqId}, error: Error updating contact favorite`);
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error updating contact favorite!',
        data: error.message,
      },
      error,
    );
  }
};
