'use strict'
const AWS = require("aws-sdk");
const { nanoid } = require('nanoid');
const { isEmpty } = require('lodash')
const { StatusCodes } = require('http-status-codes');
const utils = require("./utils");

let options = {}

if (process.env.IS_OFFLINE) {
  options = {
    region: 'us-east-1',
    endpoint: 'http://localhost:8000'
  }
}

const dynamo = new AWS.DynamoDB.DocumentClient(options);
/**
 * [ This Fn is fetching user information based on userId ]
 * 
 * @param {object} event Lambda event object
 * @returns 
 */
module.exports.main = async (event) => {
  /**
   * 1. Retrieve userId from pathParameters from lambda event object.
   * 2. If no userId found from pathParameters, throw appropriate error.
   * 3. Retrieve user data based on userId
   * 4. Return userData if found.
   * 5. Return error object if no userData found
   */
  const reqId = nanoid();
  try {
    const { userId } = event.pathParameters

    if (!userId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "userId" is required.'
      });
    }

    const user = await dynamo.get({
      TableName: process.env.DYNAMODB_USER_TABLE,
      Key: {
        userId
      }
    }).promise();

    if (!isEmpty(user)) {
      console.log(`reqId: ${reqId}, msg: User detail retrieved successfully!`);
      return utils.send(StatusCodes.OK, {
        message: 'User detail retrieved successfully!',
        data: user
      });
    }

    console.log(`reqId: ${reqId}, error: User detail not found for userId: ${userId} !`);
    return utils.send(StatusCodes.NOT_FOUND, {
      message: `User detail not found for userId: ${userId} !`,
      data: {}
    });
  } catch (error) {
    console.log(`reqId: ${reqId}, error: Error to get user detail!`);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Error to get user detail!',
      data: error.message
    });
  }
};