const DynamoDB = require('aws-sdk/clients/dynamodb');
const SSM = require('aws-sdk/clients/ssm');
const jwt = require('jsonwebtoken');

const parameterStore = new SSM();

const send = (statusCode, data, err = null) => {
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };

  if (err) {
    if (err.name === 'TokenExpiredError' || err.type === 'auth') {
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

const getParam = (param) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  new Promise((res, rej) => {
    parameterStore.getParameter(
      {
        Name: param,
      },
      (err, data) => {
        if (err) {
          return rej(err);
        }
        return res(data);
      },
    );
  });

const verifyAccessToken = async (req) => {
  try {
    const token = req.headers.Authorization || req.headers.authorization;
    if (!token) {
      throw {
        type: 'auth',
        message: 'Access Token is required.',
      };
    }
    let SECRET_KEY = await getParam('SECRET_KEY');
    SECRET_KEY = SECRET_KEY.Parameter.Value;
    if (!SECRET_KEY) {
      throw new Error('(ssm) SECRET_KEY parameter not set');
    }
    const userInfo = await jwt.verify(token.replace('Bearer '), SECRET_KEY);
    return userInfo;
  } catch (err) {
    console.error(`verifyAccessToken: ${err.message}`);
    throw err;
  }
};

// const { IS_OFFLINE } = process.env;
// const client = IS_OFFLINE
//   ? new AWS.DynamoDB.DocumentClient({
//     region: 'localhost',
//     endpoint: 'http://localhost:8000',
//   })
//   : new AWS.DynamoDB.DocumentClient();
const client = new DynamoDB.DocumentClient();

const dynamoDb = {
  get: (params) => client.get(params).promise(),
  scan: async (params) => {
    const resultArr = [];
    const onScan = (err, data) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error(
          'Unable to scan the table. Error JSON:',
          JSON.stringify(err, null, 2),
        );
      } else {
        data.Items.forEach((itemdata) => {
          resultArr.push(itemdata);
        });
        // continue scanning if we have more items
        if (typeof data.LastEvaluatedKey !== 'undefined') {
          // eslint-disable-next-line no-param-reassign
          params.ExclusiveStartKey = data.LastEvaluatedKey;
          client.scan(params, onScan);
        }
      }
    };

    await client.scan(params, onScan).promise();
    return resultArr;
  },
  batchGet: (params) => client.batchGet(params).promise(),
  batchWrite: (params) => client.batchWrite(params).promise(),
  query: (params) => client.query(params).promise(),
  put: (params) => client.put(params).promise(),
  update: (params) => client.update(params).promise(),
  delete: (params) => client.delete(params).promise(),
  transactWriteItems: (params) => client.transactWrite(params).promise(),
};
const schemaOptions = {
  errors: {
    wrap: {
      label: '',
    },
  },
};

module.exports = {
  send,
  verifyAccessToken,
  dynamoDb,
  schemaOptions,
  getParam,
};
