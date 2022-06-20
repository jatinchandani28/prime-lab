const { StatusCodes } = require('http-status-codes');
const middy = require('@middy/core');
const jsonBodyParser = require('@middy/http-json-body-parser');
const httpErrorHandler = require('@middy/http-error-handler');
const AWS = require('aws-sdk');
const utils = require('./utils');
const schema = require('./validation/transaction-filter-schema');
const { validatorMiddleware } = require('./middleware/validator');

const docClient = new AWS.DynamoDB.DocumentClient();

const DEFAULT_PAGE_LIMIT = 50;

const baseHandler = async (event) => {
  try {
    const { queryStringParameters } = event;

    if(!queryStringParameters.senderWalletId && !queryStringParameters.receiverWalletId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'Either senderWalletId or receiverWalletId is required. You need to pass them as query parameters.',
        data: {},
      });
    }

    if(queryStringParameters.senderWalletId && queryStringParameters.receiverWalletId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'You can pass only one of senderWalletId or receiverWalletId. You need to pass them as query parameters.',
        data: {},
      });
    }


    const walletId = queryStringParameters.senderWalletId || queryStringParameters.receiverWalletId;

    let lookFor = 'senderWalletId';
    if(queryStringParameters.receiverWalletId) {
      lookFor = 'receiverWalletId';
    }

    try {
      const transactions = await getTransactions(walletId, lookFor, queryStringParameters);
      return utils.send(StatusCodes.OK, { message: 'Transactions list retrieved successfully.', ...transactions });
    } catch (err) {
      console.log('Error retrieving list of transactions', err);
      return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, { message: 'Ops...' });
    }
  } catch (err) {
    console.log('Error retrieving list of transactions', err);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, { message: err.message });
  }
};

const main = middy(baseHandler)
  .use(jsonBodyParser())
  .use(validatorMiddleware({schema,validateQueryString: true}))
  .use(httpErrorHandler())

module.exports = { main };

const getTransactions = async (walletId, lookFor, params) => {
  let limit = DEFAULT_PAGE_LIMIT;
  let lastItem = null;
  let filter = null;

  let dynamoDBIndex = 'senderWalletId-Index';
  if (lookFor === 'receiverWalletId') {
      dynamoDBIndex = 'receiverWalletId-Index';
  }

  if (params) {
    filter = buildFilterExpression(params);
    limit = params.limit;
    lastItem = params.lastItem;
  }

  const tableParams = {
    TableName: 'near-transactions',
    IndexName: dynamoDBIndex,
    KeyConditionExpression: `${lookFor} = :walletId`,
    Limit: limit,
    ExpressionAttributeValues: {
      ':walletId': walletId,
    },
  };

  if (lastItem) {
    const [transactionId, walletToLookFor] = Buffer.from(lastItem, 'base64').toString('ascii').split(',');
    const exclusiveStartKey = {
      transactionId
    };

    if(lookFor == 'senderWalletId') {
      exclusiveStartKey.senderWalletId = walletToLookFor;
    } else {
      exclusiveStartKey.receiverWalletId = walletToLookFor;
    }

    tableParams.ExclusiveStartKey = exclusiveStartKey;

  }
  if (filter) {
    tableParams.FilterExpression = filter.filterExpression;
    tableParams.ExpressionAttributeValues = { ...tableParams.ExpressionAttributeValues, ...filter.expressionAttributeValues };
    if (filter.expressionAttributeNames) {
      tableParams.ExpressionAttributeNames = filter.expressionAttributeNames;
    }
  }

  const query = await docClient.query(tableParams).promise();
  const result = { data: query.Items };
  if (query.LastEvaluatedKey) {
    console.log(query.LastEvaluatedKey);
    result.lastItem = Buffer.from(`${query.LastEvaluatedKey.transactionId},${query.LastEvaluatedKey[lookFor]}`).toString('base64');
  }
  return result;
};

const buildFilterExpression = (params) => {
  let filterExpression = null;
  let expressionAttributeValues = null;
  let expressionAttributeNames = null;

  if (params.startDate && params.endDate) {
    filterExpression = 'created >= :startDate AND created <= :endDate';
    expressionAttributeValues = { ':startDate': utils.toTimestamp(params.startDate), ':endDate': utils.toTimestamp(params.endDate) };
  }
  if (params.type) {
    filterExpression = filterExpression ? `${filterExpression} AND #t = :type` : '#t = :type';
    expressionAttributeValues = expressionAttributeValues
      ? { ...expressionAttributeValues, ':type': params.type }
      : { ':type': params.type };
    expressionAttributeNames = { '#t': 'type' };
  }
  // TODO be sure if application is actionId
  if (params.application) {
    filterExpression = filterExpression ? `${filterExpression} AND actionId = :actionId` : 'actionId = :actionId';
    expressionAttributeValues = expressionAttributeValues
      ? { ...expressionAttributeValues, ':actionId': params.application }
      : { ':actionId': params.application };
  }

  if (params.status) {
    filterExpression = filterExpression ? `${filterExpression} AND #sta = :status` : '#sta = :status';
    expressionAttributeValues = expressionAttributeValues
      ? { ...expressionAttributeValues, ':status': params.status }
      : { ':status': params.status };
    expressionAttributeNames = expressionAttributeNames
      ? { ...expressionAttributeNames, '#sta': 'status' }
      : { '#sta': 'status' };
  }

  return {
    filterExpression,
    expressionAttributeValues,
    expressionAttributeNames,
  };
};

