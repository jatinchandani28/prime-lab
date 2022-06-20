'use strict';
const AWS = require('aws-sdk');
const xray = require('aws-xray-sdk');
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');

const SECRET_KEY = process.env.SECRET_KEY;
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;
const TOKEN_EXPIRY_IN_MILLISECONDS = process.env.TOKEN_EXPIRY_IN_MILLISECONDS;
const REFRESH_TOKEN_EXPIRY_IN_MILLISECONDS =
  process.env.REFRESH_TOKEN_EXPIRY_IN_MILLISECONDS;
const IS_OFFLINE = process.env.IS_OFFLINE;
const awsWrapped = process.env.IS_LOCAL ? AWS : xray.captureAWS(AWS);
const client = IS_OFFLINE
  ? new awsWrapped.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000',
    })
  : new awsWrapped.DynamoDB.DocumentClient();

const getAuthResponse = async (user) => {
  const accessToken = jwt.sign(user, SECRET_KEY, {
    expiresIn: TOKEN_EXPIRY_IN_MILLISECONDS,
  });

  const refreshToken = jwt.sign(user, REFRESH_SECRET_KEY, {
    expiresIn: REFRESH_TOKEN_EXPIRY_IN_MILLISECONDS,
  });

  return {
    jwtAccessToken: accessToken,
    jwtRefreshToken: refreshToken,
    user: user,
  };
};

const verifyAccessToken = async (req) => {
  let token = req.headers['Authorization'];
  if (token) throw new Error('Access Token is required.');

  jwt.verify(token, SECRET_KEY, function (err, decoded) {
    if (err) {
      return false;
    } else {
      req.decoded = decoded;
      return true;
    }
  });
};

const verifyRefreshToken = async (refreshToken) => {
  jwt.verify(refreshToken, REFRESH_SECRET_KEY, function (err, decoded) {
    if (err) {
      return false;
    } else {
      req.decoded = decoded;
      return true;
    }
  });
};

// function updateTableName(params) {
//   return {
//     ...params,
//     TableName: `${process.env.databaseServiceName}-${config.resourcesStage}-${params.TableName}`,
//   };
// }

const dynamoDb = {
  get: (params) => client.get(params).promise(),
  scan: async (params) => {
    let resultArr = [];
    await client.scan(params, onScan).promise();
    return resultArr;

    function onScan(err, data) {
      if (err) {
        console.error(
          'Unable to scan the table. Error JSON:',
          JSON.stringify(err, null, 2),
        );
      } else {
        data.Items.forEach(function (itemdata) {
          resultArr.push(itemdata);
        });
        // continue scanning if we have more items
        if (typeof data.LastEvaluatedKey != 'undefined') {
          params.ExclusiveStartKey = data.LastEvaluatedKey;
          client.scan(params, onScan);
        }
      }
    }
  },
  batchGet: (params) => client.batchGet(params).promise(),
  batchWrite: (params) => client.batchWrite(params).promise(),
  query: (params) => client.query(params).promise(),
  put: (params) => client.put(params).promise(),
  update: (params) => client.update(params).promise(),
  delete: (params) => client.delete(params).promise(),
  transactWriteItems: (params) => client.transactWrite(params).promise(),
};

const send = (statusCode, data, err = null) => {
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };

  if (err) {
    if (err.name === 'TokenExpiredError') {
      const { message } = err;
      return {
        statusCode: 401,
        headers: responseHeaders,
        body: JSON.stringify({
          message,
        }),
      };
    }
  }

  return {
    statusCode: statusCode,
    headers: responseHeaders,
    body: JSON.stringify(data),
  };
};

//Get difference in years for given date vs current date
const getDateDifference = (inputDate, inputFormat, unit) => {
  inputDate = DateTime.fromFormat(inputDate, inputFormat);
  const currentDate = DateTime.now();
  const difference = currentDate.diff(inputDate, unit)[unit];
  return difference;
};

//NOTE: USER STATUS
class UserStatus {
  static Active = new UserStatus('active');
  static Blocked = new UserStatus('blocked');
  static Deleted = new UserStatus('deleted');

  constructor(name) {
    this.name = name;
  }
}

module.exports = {
  verifyRefreshToken,
  getAuthResponse,
  verifyAccessToken,
  client,
  UserStatus,
  dynamoDb,
  awsWrapped,
  send,
  getDateDifference,
};
