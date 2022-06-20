'use strict'
const AWS = require("aws-sdk");
const { nanoid } = require('nanoid');
const { StatusCodes } = require('http-status-codes');
const utils = require("./utils");
const { deleteProfileJoi } = require('./validation/joiSchema')

/**
 * [ This Fn will deleted the user profile after certain checks ]
 * 
 * @param {object} event Incoming Lambda Request Object
 * @returns 
 */
module.exports.main = async (event) => {
  /**
   * 1. Retrieve userId and request body from path params and body respectively
   * 2. Validate request body using Joi
   * 3. If any error during step-2, return Fn flow with valid error message
   * 4. If no userId found from path params, return Fn flow with valid error message
   * 5. Fetch all near-wallets data based on userId
   * 6. If more than 1 near-wallets found for the user, we should not allow user to delete his profile
   * 7. If users near-wallets' balance found greater than 0, then we should not allow user to delete his profile
   * 8. Return Fn flow with valid error message if point 6 & 7 are not satisfied
   * 9. Fetch data from near-otp table based on userId and OTP received in body
   * 10. If there is no data found from near-otp, return Fn flow with valid error message
   * 11. If all above checks passed successfully, mark near-users table data as "deleted" and expire the OTP in near-otp table
   */
  const reqId = nanoid();
  try {

    const { body: eventBody, pathParameters: { userId } } = event
    const body = JSON.parse(eventBody)

    const { error } = deleteProfileJoi.validate(body);

    if (error) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: "One or more fields are invalid.",
        data: error.details,
      });
    }

    if (!userId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "userId" is required.'
      });
    }

    const params = {
      TableName: process.env.DYNAMODB_WALLET_TABLE,
      ScanIndexForward: true,
      IndexName: "userId-Index",
      KeyConditionExpression: "#userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      },
      ExpressionAttributeNames: {
        "#userId": "userId"
      }
    }
    const { Items: userWalletsData } = await utils.dynamoDb.query(params);

    if (userWalletsData?.length > 1) {
      return utils.send(StatusCodes.CONFLICT, {
        message: `More than 1 wallets found for user: ${userId}, please delete wallets first.`,
        data: {}
      });
    }
    if (userWalletsData?.length) {
      let balanceExists = false
      for (const elem of userWalletsData) {
        if (elem?.balance > 0) {
          balanceExists = true
          break;
        }
      }
      if (balanceExists) {
        return utils.send(StatusCodes.CONFLICT, {
          message: `More than 0 balance found in your wallets. You are not allowed to delete your account.`,
          data: {}
        });
      }
    }

    const { Items: verifyOTPResult } = await getOTP(userId, body.otp);
    if (!verifyOTPResult.length) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: "Incorrect code, please enter a valid code",
      });
    }
    let isCodeValid = false
    for (const elem of verifyOTPResult) {
      if(elem?.code && elem.code === body.otp) {
        isCodeValid = true
        break;
      }
    }
    if (!isCodeValid) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: "Incorrect code, please enter a valid code",
      });
    }

    await Promise.all([
      markUserAsDeleted(userId, reqId),
      expireOTP(userId, body.otp, verifyOTPResult[0].ttl)
    ])

    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: `You have successfully deleted user: ${userId}`,
      data: []
    });
  } catch (error) {
    console.error(`reqId: ${reqId}, error: Error while deleting user profile! ${error}`);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Error while deleting user profile!',
      data: error.message
    });
  }
}

const getOTP = async (userId, otp) => {
  const params = {
    TableName: process.env.DYNAMODB_OTP_TABLE,
    KeyConditionExpression: "#userId = :userId AND #ttl < :ttl",
    ExpressionAttributeValues: {
      ":userId": userId,
      ":ttl": Math.floor(new Date().getTime() / 1000)
    },
    ExpressionAttributeNames: {
      '#userId': 'userId',
      '#ttl': 'ttl'
    }
  };
  const result = await utils.dynamoDb.query(params);
  return result;
};

const markUserAsDeleted = async (userId, reqId) => {
  const params = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    Key: {
      userId: userId
    },
    UpdateExpression: "set #status = :status",
    ConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
      ":status": utils.UserStatus.Deleted.name,
    },
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ReturnValues: "UPDATED_NEW",
  };
  return utils.dynamoDb.update(params);
}

const expireOTP = async (userId, otp, ttl) => {
  const params = {
    TableName: process.env.DYNAMODB_OTP_TABLE,
    Key: {
      userId: userId,
      ttl: ttl,
    },
    UpdateExpression: "set #status = :status",
    ConditionExpression: "userId = :userId AND code = :code",
    ExpressionAttributeValues: {
      ":status": utils.OtpStatus.Expired.name,
      ":userId": userId,
      ":code": otp,
    },
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ReturnValues: "UPDATED_NEW",
  };
  return utils.dynamoDb.update(params);
};