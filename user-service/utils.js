'use strict';
const AWS = require('aws-sdk');
const xray = require('aws-xray-sdk');
const jwt = require('jsonwebtoken');
const { DateTime } = require('luxon');
const { nanoid } = require('nanoid');
const axios = require('axios');
const reqId = nanoid();

const getParam = (param) => {
  return new Promise((res, rej) => {
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
};

const TOKEN_EXPIRY_IN_MILLISECONDS = process.env.TOKEN_EXPIRY_IN_MILLISECONDS;
const REFRESH_TOKEN_EXPIRY_IN_MILLISECONDS =
  process.env.REFRESH_TOKEN_EXPIRY_IN_MILLISECONDS;
const parameterStore = new AWS.SSM();
const awsWrapped = AWS;
const client = new awsWrapped.DynamoDB.DocumentClient();

const getAuthResponse = async (user) => {
  const secreteKeyParameterStore = await getParam('SECRET_KEY');
  const SECRET_KEY = secreteKeyParameterStore.Parameter.Value;

  const refreshSecreteKeyParameterStore = await getParam('REFRESH_SECRET_KEY');
  const REFRESH_SECRET_KEY = refreshSecreteKeyParameterStore.Parameter.Value;

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
  const secreteKeyParameterStore = await getParam('SECRET_KEY');
  const SECRET_KEY = secreteKeyParameterStore.Parameter.Value;

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
  const refreshSecreteKeyParameterStore = await getParam('REFRESH_SECRET_KEY');
  const REFRESH_SECRET_KEY = refreshSecreteKeyParameterStore.Parameter.Value;

  jwt.verify(refreshToken, REFRESH_SECRET_KEY, function (err, decoded) {
    if (err) {
      return false;
    } else {
      req.decoded = decoded;
      return true;
    }
  });
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

const checkEmailExists = async (email) => {
  const params = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
  };
  const result = await dynamoDb.query(params);
  console.log(`reqId: ${reqId}, result emailCheck `, result);
  return result.Count > 0;
};

const checkPhoneExists = async (phone) => {
  const params = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    IndexName: 'PhoneIndex',
    KeyConditionExpression: 'phone = :phone',
    ExpressionAttributeValues: {
      ':phone': phone,
    },
  };
  const result = await dynamoDb.query(params);
  console.log(`reqId: ${reqId}, result phoneCheck `, result);
  return result.Count > 0;
};

const checkWalletNameExists = async (walletName) => {
  const params = {
    TableName: process.env.DYNAMODB_WALLET_TABLE,
    IndexName: 'walletName-Index',
    KeyConditionExpression: 'walletName = :walletName',
    ExpressionAttributeValues: {
      ':walletName': walletName,
    },
  };
  const result = await dynamoDb.query(params);
  const dbWalletCheck = result.Count > 0;
  let indexerCheck = true;
  try{

      const config = {
        headers: { 
            'jwt_token': `${process.env.INDEXER_STATIC_JWT_TOKEN}`
          }
      };
      const indexerWalletCheckURL = `${process.env.INDEXER_API_URL}/wallets/${walletName}`;
      console.log(`reqId: ${reqId}, indexerWalletCheckURL`, indexerWalletCheckURL);
      const indexerWalletCheckResponse = await axios.get(indexerWalletCheckURL,config);
      console.log(`reqId: ${reqId}, indexerWalletCheckResponse `, indexerWalletCheckResponse);
  }catch(err){

    console.log(`Silent fail indexer check wallet name: ${walletName}`, err.response.status);
    console.log(`Silent fail indexer check wallet name: ${walletName}`, err.response.message);
    indexerCheck = err.response.status == 400?false:true
  }

  console.log("dbWalletCheck - ",dbWalletCheck);
  console.log("indexerCheck - ",indexerCheck);

  

  return dbWalletCheck || indexerCheck;

};

//Get difference in years for given date vs current date
const getDateDifference = (inputDate, inputFormat, unit) => {
  inputDate = DateTime.fromFormat(inputDate, inputFormat);
  const currentDate = DateTime.now();
  const difference = currentDate.diff(inputDate, unit)[unit];
  return difference;
};

const sendSMS = async function (toNumber, message) {
  var params = {
    Message: message,
    PhoneNumber: toNumber,
  };

  try {
    var publishTextPromise = await new AWS.SNS({ apiVersion: '2010-03-31' })
      .publish(params)
      .promise();
    return publishTextPromise.MessageId;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const sendEmail = async function (
  toEmailAddresses,
  fromEmailAddress,
  subject,
  messageBody,
) {
  // Create sendEmail params
  var params = {
    Destination: {
      ToAddresses: toEmailAddresses,
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: messageBody,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
    },
    Source: fromEmailAddress,
    ReplyToAddresses: [],
  };

  try {
    var publishEmailPromise = await new AWS.SES({ apiVersion: '2010-12-01' })
      .sendEmail(params)
      .promise();
    return publishEmailPromise.MessageId;
  } catch (error) {
    console.log(error);
    throw error;
  }
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

class OtpStatus {
  static Active = new UserStatus('active');
  static Expired = new UserStatus('expired');
  constructor(name) {
    this.name = name;
  }
}

function isJsonObject(data) {
  try {
      JSON.parse(data);
  } catch (e) {
      return false;
  }
  return true;
}

module.exports = {
  getParam,
  isJsonObject,
  verifyRefreshToken,
  getAuthResponse,
  verifyAccessToken,
  client,
  UserStatus,
  OtpStatus,
  dynamoDb,
  awsWrapped,
  send,
  getDateDifference,
  sendSMS,
  sendEmail,
  checkEmailExists,
  checkPhoneExists,
  checkWalletNameExists,
};
