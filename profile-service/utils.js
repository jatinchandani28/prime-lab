'use strict';
const AWS = require('aws-sdk');
const awsWrapped = AWS;

let options = {};

if (process.env.IS_OFFLINE) {
  options = {
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
  };
}

const client = new awsWrapped.DynamoDB.DocumentClient(options);

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
class UserStatus {
  static Active = new UserStatus('active');
  static Blocked = new UserStatus('blocked');
  static Deleted = new UserStatus('deleted');

  constructor(name) {
    this.name = name;
  }
}

class OtpStatus {
  static Active = new UserStatus('active');
  static Expired = new UserStatus('expired');
  constructor(name) {
    this.name = name;
  }
}

module.exports = {
  send,
  dynamoDb,
  OtpStatus,
  UserStatus,
};
