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
  // const { userId } = event.pathParameters
  try {
    const { userId } = await utils.verifyAccessToken(event);
    if (!userId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "userId" is required.',
      });
    }

    const params = {
      TableName: 'near-contacts',
      IndexName: 'userId-contactId-index',
      KeyConditionExpression: '#userId = :user_id_val',
      ExpressionAttributeNames: {
        '#userId': 'userId',
      },
      ExpressionAttributeValues: {
        ':user_id_val': userId,
      },
    };

    const scanResults = [];
    const items = await dynamo.query(params).promise();

    items.Items.forEach((item) => scanResults.push(item));

    return utils.send(StatusCodes.OK, {
      message: 'Contact list retrieved successfully!',
      data: scanResults,
    });
  } catch (error) {
    console.log(`reqId: ${reqId}, error: Error to get contact detail!`);
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error to get contact detail!',
        data: error.message,
      },
      error,
    );
  }
};
