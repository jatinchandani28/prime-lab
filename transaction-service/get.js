const { StatusCodes } = require('http-status-codes');
const AWS = require('aws-sdk');
const utils = require('./utils');

const docClient = new AWS.DynamoDB.DocumentClient();
const getTransactionById = async (transactionId) => {
  const tableParams = {
    TableName: 'near-transactions',
    Key: {
      transactionId,
    },
  };

  const result = await docClient.get(tableParams).promise();

  return result;
};
module.exports.main = async (event) => {
  const { transactionId } = event.pathParameters;

  if (!transactionId) {
    return utils.send(StatusCodes.BAD_REQUEST, {
      message: 'Missing transactionId path param',
      data: {},
    });
  }

  try {
    const transaction = await getTransactionById(transactionId);

    if (Object.keys(transaction).length === 0) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'Transaction not found',
      });
    }

    return utils.send(StatusCodes.OK, { message: 'Transaction retrieved successfully.', data: transaction.Item });
  } catch (err) {
    console.log(`Error retrieving transaction ${transactionId}`, err);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: `Error retrieving transaction ${transactionId}`,
      data: err.message
    });
  }
};
