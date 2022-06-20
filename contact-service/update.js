const DynamoDB = require('aws-sdk/clients/dynamodb');
const { nanoid } = require('nanoid');
const { StatusCodes } = require('http-status-codes');
const utils = require('./utils');
const schema = require('./validation/contact-update-schema');

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
  const contactJSON = JSON.parse(event.body);  
  try {
    await utils.verifyAccessToken(event);
    if (!contactId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "contactId" is required.',
      });
    }

    const { error } = schema.validate(contactJSON);

    if (error) {
      console.log(`reqId: ${reqId}, error: One or more fields are invalid.`);
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'One or more fields are invalid.',
        data: error.details,
      });
    }

    let updateExpression = 'set';
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};

    Object.keys(contactJSON).forEach((item) => {
      updateExpression += ` #${item} = :${item} ,`;
      ExpressionAttributeNames[`#${item}`] = item;
      ExpressionAttributeValues[`:${item}`] = contactJSON[item];
    });
    updateExpression = updateExpression.slice(0, -1);

    const params = {
      TableName: 'near-contacts',
      Key: {
        contactId,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ConditionExpression: 'attribute_exists(contactId)',
      ReturnValues: 'UPDATED_NEW',
    };

    const data = await dynamo.update(params).promise();

    if (data) {
      console.log(`reqId: ${reqId}, msg: Contact updated successfully!`);
      return utils.send(StatusCodes.OK, {
        message: 'Contact updated successfully!',
        data,
      });
    }

    console.log(`reqId: ${reqId}, error: Unable to update contact`);
    return utils.send(StatusCodes.NOT_FOUND, {
      message: 'Unable to update contact',
      data: {},
    });
  } catch (err) {
    if (err.code === 'ConditionalCheckFailedException') {
      console.log(
        `reqId: ${reqId}, error: Error updating contactId:${contactId}  not found `,
      );
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `Error updating contact. contactId: ${contactId} not found!`,
      });
    }
    console.log(`reqId: ${reqId}, error: Error updating contacts`);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Error updating contacts!',
      data: err.message,
    },err);
  }
};
