const utils = require('./utils');
const { StatusCodes } = require('http-status-codes');
const { nanoid } = require('nanoid');
const schema = require('./validation/user-schema.js');

module.exports.handler = async (event) => {
  try {
    const params = JSON.parse(event.body);

    const { error } = schema.validate(params, { abortEarly: false });

    if (error) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        errors: error.details.map((item) => item.message),
      });
    }

    // if (await checkUserExists(params.email, params.phone)) {
    //   return utils.send(StatusCodes.BAD_REQUEST, {
    //     message: 'User already exists.',
    //     data: params,
    //   });
    // }

    // if (await checkWalletExists(params.walletId)) {
    //   return utils.send(StatusCodes.BAD_REQUEST, {
    //     message: 'WalletId already exists.',
    //     data: params,
    //   });
    // }

    const dbUser = await createUser(params);

    // const dbWallet = await createWallet(dbUser.userId, params.walletId);

    const response = {
      data: {
        jwtAccessToken: '',
        jwtRefreshToken: '',
        user: { ...dbUser },
      },
    };

    return utils.send(StatusCodes.CREATED, response);
  } catch (err) {
    console.log(err);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Ops...',
    });
  }
};

const createUser = async (request) => {
  const user = { ...request };

  const params = {
    Item: {
      userId: nanoid(),
      created: +new Date(),
      status: utils.UserStatus.Active.name,
      isPhoneVerified: false,
      isEmailVerified: false,
      wallets: [],
      ...user,
    },
    TableName: 'near-users',
  };

  await utils.dynamoDb.put(params);

  return params.Item;
};

const createWallet = async (userId, walletId) => {
  const params = {
    Item: {
      walletId: walletId,
      userId: userId,
      created: +new Date(),
    },
    TableName: 'near-wallets',
  };

  await utils.dynamoDb.put(params);

  return params.Item;
};

const checkWalletExists = async (walletId) => {
  const params = {
    TableName: 'near-wallets',
    Key: {
      walletId: walletId,
    },
  };
  const result = await utils.dynamoDb.get(params);

  

  return result.Item ? true : false;
};

const checkUserExists = async (email, phone) => {
  const params = {
    TableName: 'near-users',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
  };
  const result = await utils.dynamoDb.query(params);
  return result.Item ? true : false;
};
