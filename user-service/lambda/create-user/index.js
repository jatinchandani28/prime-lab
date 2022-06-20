const { StatusCodes } = require('http-status-codes');
const { nanoid } = require('nanoid');
const axios = require('axios');
const utils = require('../../utils');
const schema = require('../../validation/user-schema.js');
const Wallets = require('../../src/models/wallets');

const reqId = nanoid();

module.exports.handler = async (event) => {
  try {
    const params = JSON.parse(event.body);

    const { error } = schema.validate(params, { abortEarly: false });
    if (error) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        errors: error.details.map((item) => item.message),
      });
    }
    if (params.phone && !params.countryCode) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'country code required',
      });
    }
    let { walletName } = params;
    delete params.walletName;

    walletName = walletName.toLowerCase();

    if (params.email && (await utils.checkEmailExists(params.email))) {
      return utils.send(StatusCodes.CONFLICT, {
        message: 'Email already exist',
      });
    }
    if (params.phone && (await utils.checkPhoneExists(params.phone))) {
      return utils.send(StatusCodes.CONFLICT, {
        message: 'Phone already exist',
      });
    }
    if (await utils.checkWalletNameExists(walletName)) {
      return utils.send(StatusCodes.CONFLICT, {
        message: 'Account ID already exist',
      });
    }

    params.userId = nanoid();
    console.log(`reqId: ${reqId}, User registration parameters `, params);

    const dbUser = await createUser(params);
    dbUser.walletName = walletName;

    const authResponse = await utils.getAuthResponse(dbUser);
    params.jwtAccessToken = authResponse.jwtAccessToken;

    const wallet = await createWallet(params, walletName);
    
    const wallets = await Wallets.getWalletsByUserID(
      params.userId,
      authResponse.jwtAccessToken,
    );
    dbUser.wallets = wallets;

    const response = {
      jwtAccessToken: authResponse.jwtAccessToken,
      jwtRefreshToken: authResponse.jwtRefreshToken,
      user: { ...dbUser },
    };
    console.log(`reqId: ${reqId}, User register response `, response);
    return utils.send(StatusCodes.CREATED, response);
  } catch (err) {
    console.log(`reqId: ${reqId}, login err`, err);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: `${err.message}`,
    });
  }
};

const createUser = async (request) => {
  const user = { ...request };

  const params = {
    Item: {
      created: +new Date(),
      status: utils.UserStatus.Active.name,
      isPhoneVerified: false,
      isEmailVerified: false,
      ...user,
    },
    TableName: process.env.DYNAMODB_USER_TABLE,
  };

  const userCreateResult = await utils.dynamoDb.put(params);
  console.log(`reqId: ${reqId}, User register response `, userCreateResult);
  return params.Item;
};

const createWallet = async (params, walletName) => {
  try {
    const param = await utils.getParam('/near/api-gateway/url');

    const requestParams = {
      walletName,
    };
    console.log(`reqId: ${reqId}, wallet request`, requestParams);
    const config = {
      headers: { Authorization: `${params.jwtAccessToken}` },
    };
    const walletURL = `${param.Parameter.Value}/wallets`;
    console.log(`reqId: ${reqId}, walletURL`, walletURL);
    const walletCreateResponse = await axios.post(
      walletURL,
      requestParams,
      config,
    );
    console.log(`reqId: ${reqId}, walletCreateResponse `, walletCreateResponse);
  } catch (err) {
    console.log(`reqId: ${reqId}, walletcreate error `, err);
    throw err;
  }
};
