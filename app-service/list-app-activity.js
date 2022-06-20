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

module.exports.main = async (event, context) => {

  const reqId = nanoid();
  const { appId } = event.pathParameters

  if (!appId) {
    return utils.send(StatusCodes.BAD_REQUEST, {
      message: 'The path parameter "appId" is required.'
    });
  }

  try {
    const appActionMapParam = {
      TableName: "near-app-actions-mapping",
      FilterExpression: "#appId = :appId",
      ExpressionAttributeNames: { "#appId": "appId" },
      ExpressionAttributeValues: { ":appId": appId }
    }

    const appActionMapDataArr = [];
    let items;
    do {
      items = await dynamo.scan(appActionMapParam).promise();
      items.Items.forEach((item) => appActionMapDataArr.push(item));
      items.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey !== "undefined");

    if (!isEmpty(appActionMapDataArr)) {
      console.log(`reqId: ${reqId}, msg: App activity retrieved successfully!`);
      const activity = await fetchAppActivities(appActionMapDataArr);
      return utils.send(StatusCodes.OK, {
        success: true,
        message: 'App activity retrieved successfully!',
        data: { appId, activity }
      });
    }

    console.log(`reqId: ${reqId}, error: App activity not found for appId: ${appId} !`);
    return utils.send(StatusCodes.NOT_FOUND, {
      errors: [{
        message: `unable to find the app activity for appId: ${appId} !`
      }]
    });

  } catch (error) {
    console.log(`reqId: ${reqId}, error: Error to get app activity!`);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Error to get app activity!',
      data: error.message
    });
  }
};


const fetchAppActivities = async (appActionMapDataArr) => {

  let filterExpression = '';
  const expressionAttributeValues = {};
  appActionMapDataArr.forEach((item, index) => {
    filterExpression += ` ${index != 0 ? 'Or' : ''} #actionId = :${index}`;
    expressionAttributeValues[`:${index}`] = item.actionId;
  });

  const appActionMasterParam = {
    TableName: "near-app-actions-master",
    FilterExpression: filterExpression,
    ExpressionAttributeNames: {
      "#actionId": "actionId"
    },
    ExpressionAttributeValues: expressionAttributeValues
  }
  const scanResults = [];
  let items;
  do {
    items = await dynamo.scan(appActionMasterParam).promise();
    items.Items.forEach((item) => {
      item.created = new Date(item.created).toISOString();
      item.updated = new Date(item.updated).toISOString();
      scanResults.push(item);
    });
    items.ExclusiveStartKey = items.LastEvaluatedKey;
  } while (typeof items.LastEvaluatedKey !== "undefined");

  return scanResults;
};
