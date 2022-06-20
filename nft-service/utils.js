const AWS = require('aws-sdk');
const { StatusCodes } = require('http-status-codes');
const parameterStore = new AWS.SSM();
const jwt = require('jsonwebtoken');
const unirest = require('unirest');

const { IS_OFFLINE } = process.env;

const client = new AWS.DynamoDB.DocumentClient();

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

const callServerRequest = async (
  subUrl,
  method = 'GET',
  token,
  params = '',
) => {
  try {
    const { DEV_BASEURL, PROD_BASEURL, IS_OFFLINE } = process.env;
    const url = IS_OFFLINE ? DEV_BASEURL : PROD_BASEURL;

    // AMANDEEP SINGH tested the apis with below url
    // const baseUrl = `https://33fn0u9ffl.execute-api.sa-east-1.amazonaws.com/${subUrl}`;

    const baseUrl = `${url}/${subUrl}`;
    console.log('base URL is ', baseUrl);
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    };

    if (method.toLowerCase() === 'get') {
      const response = await unirest.get(baseUrl).headers(headers);
      return {
        statusCode: response.code,
        body: response.body,
      };
    } else if (method.toLowerCase() === 'post') {
      const response = await unirest
        .post(baseUrl)
        .type('json')
        .headers(headers)
        .send(params);

      return {
        statusCode: response.code,
        body: response.body,
      };
    }
  } catch (error) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      message: `${error.message}`,
    };
  }
};

const verifyAccessToken = async (req) => {
  try {
    let token = req.headers.Authorization || req.headers.authorization;
    if (!token) {
      throw new Error('Access Token is required.');
    }
    token = token.replace('Bearer ', '');
    const userInfo = await jwt.verify(token, process.env.SECRET_KEY);
    userInfo.walletId = userInfo.walletId || userInfo.walletName;
    userInfo.walletName = userInfo.walletId || userInfo.walletName;
    return userInfo;
  } catch (err) {
    throw err;
  }
};

const OfferType = {
  TOKEN: 'TOKEN',
  NFT: 'NFT',
};

const OfferAction = {
  INITIAL: 'initial',
  COUNTER: 'counter',
};

const OfferStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const NftSwapStatus = {
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

const schemaOptions = {
  errors: {
    wrap: {
      label: '',
    },
  },
};

const generateTokenLink = async (param) => {
  // @TODO: Need to fetch secret_key from SSM and use same in claim.js while verifying token
  // const secreteKeyParameterStore = await getParam("SECRET_KEY");
  // const SECRET_KEY = secreteKeyParameterStore.Parameter.Value;

  const accessToken = jwt.sign(param, process.env.SECRET_KEY, {
    expiresIn: process.env.TOKEN_EXPIRY_IN_MILLISECONDS,
  });
  return accessToken;
};

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

const sendEmail = async function (
  toEmailAddresses,
  fromEmailAddress,
  subject,
  messageBody,
) {
  console.log(
    `send email: ${toEmailAddresses}, ${fromEmailAddress}, ${subject}, ${messageBody}`,
  );
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
    const publishEmailPromise = await new AWS.SES({ apiVersion: '2010-12-01' })
      .sendEmail(params)
      .promise();
    return publishEmailPromise.MessageId;
  } catch (error) {
    console.error(`sendemail error:` + error.message);
    console.log(error);
    throw error;
  }
};
const getWalletDetails = async (walletId) => {
  const params = {
    TableName: process.env.DYNAMODB_WALLET_TABLE,
    Key: {
      walletId,
    },
  };
  const { Item = null } = await client.get(params).promise();
  if (!Item) {
    throw {
      message: new Error('Receiver Wallet not found!.'),
    };
  }
  return Item;
};

const getUserDetails = async (userId) => {
  const params = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    Key: {
      userId,
    },
  };
  const { Item = null } = await client.get(params).promise();
  if (!Item) {
    throw {
      message: new Error('No user data found.'),
    };
  }
  return Item;
};

class UserStatus {
  static Active = new UserStatus('active');
  static Blocked = new UserStatus('blocked');
  static Deleted = new UserStatus('deleted');

  constructor(name) {
    this.name = name;
  }
}
module.exports = {
  send,
  OfferType,
  OfferAction,
  OfferStatus,
  dynamoDb,
  schemaOptions,
  NftSwapStatus,
  verifyAccessToken,
  generateTokenLink,
  callServerRequest,
  getParam,
  sendEmail,
  getUserDetails,
  getWalletDetails,
  UserStatus,
};
