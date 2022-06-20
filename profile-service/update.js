"use strict";
const AWS = require("aws-sdk");
const { nanoid } = require("nanoid");
const { isEmpty } = require("lodash");
const { StatusCodes } = require("http-status-codes");
const utils = require("./utils");
const schema = require("./validation/update-profile-schema");
let options = {};

if (process.env.IS_OFFLINE) {
  options = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
  };
}

const dynamo = new AWS.DynamoDB.DocumentClient(options);

/**
 * [ This Fn is fetching user information based on userId ]
 *
 * @param {object} event Lambda event object
 * @returns
 */
module.exports.main = async (event) => {
  const reqId = nanoid();
  try {
    const {
      pathParameters: { userId },
    } = event;
    let profileJSON = JSON.parse(event.body);

    if (!userId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "userId" is required.',
      });
    }

    const { error } = schema.validate(profileJSON);

    if (error) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: "One or more fields are invalid.",
        data: error.details,
      });
    }

    let updateExpression = "SET";
    let ExpressionAttributeNames = {};
    let ExpressionAttributeValues = {};
    for (const item in profileJSON) {
      updateExpression += ` #${item} = :${item} ,`;
      ExpressionAttributeNames["#" + item] = item;
      ExpressionAttributeValues[":" + item] = profileJSON[item];
    }
    updateExpression = updateExpression.slice(0, -1);

    const { Item } = await dynamo
      .get({
        TableName: process.env.DYNAMODB_USER_TABLE,
        Key: {
          userId,
        },
      })
      .promise();

    if (!Item) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `User not found for userId: ${userId} !`,
      });
    }

    const user = await dynamo
      .update({
        TableName: process.env.DYNAMODB_USER_TABLE,
        Key: {
          userId,
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: ExpressionAttributeNames,
        ExpressionAttributeValues: ExpressionAttributeValues,
        ConditionExpression: "attribute_exists(userId)",
        ReturnValues: "ALL_NEW",
      })
      .promise();

    if (!isEmpty(user)) {
      console.log(`reqId: ${reqId}, msg: User detail updated successfully!`);
      return utils.send(StatusCodes.OK, {
        message: "User detail updated successfully!",
        data: user.Attributes,
      });
    }
  } catch (error) {
    console.log(`reqId: ${reqId}, error: Error to update user detail!`);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: `Error to update user detail! ${error.message}`,
    });
  }
};
