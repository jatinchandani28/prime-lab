const DynamoDB = require('aws-sdk/clients/dynamodb');
const { nanoid } = require('nanoid');
const { StatusCodes } = require('http-status-codes');
const utils = require('./utils');
const { contactSchema } = require('./validation/schema');

// if (process.env.IS_OFFLINE) {
//   options = {
//     region: 'us-east-1',
//     endpoint: 'http://localhost:8000',
//   };
// }

const dynamo = new DynamoDB.DocumentClient();

module.exports.main = async (event) => {
  const reqId = nanoid();
  try {
    //const { userId } = event.pathParameters;
    const { userId } = await utils.verifyAccessToken(event);
    const contactJSON = JSON.parse(event.body);

    if (!userId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "userId" is required.',
      });
    }

    if (!userId) {
      console.log(`reqId: ${reqId}, error: userId parameter is invalid.`);
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The parameter userId parameter is required.',
      });
    }

    const { error } = contactSchema.validate(contactJSON, {abortEarly: false});
    if (error) {
       return utils.send(StatusCodes.BAD_REQUEST, {
        errors: error.details.map((item) => item.message),
      });
    }
    contactJSON.userId = userId;
    contactJSON.isFavorite = false;
    contactJSON.contactId = nanoid();

    await dynamo
      .put({
        TableName: 'near-contacts',
        Item: contactJSON,
      })
      .promise();

    console.log(`reqId: ${reqId}, msg: Contact added successfully!`);
    return utils.send(StatusCodes.CREATED, {
      message: 'Contact added successfully!',
      data: {
        contactJSON,
      },
    });
  } catch (err) {
    console.log(`reqId: ${reqId}, error: Error adding contacts to the user`);
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error adding contacts to the user!',
        data: err.message,
      },
      err,
    );
  }
};
