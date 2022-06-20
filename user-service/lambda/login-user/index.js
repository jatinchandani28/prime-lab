const { StatusCodes } = require('http-status-codes');
const { nanoid } = require('nanoid');
const randomGen = require('random-gen');
const utils = require('../../utils');
const schema = require('../../validation/user-authentication-schema.js');

const reqId = nanoid();
let FROM_EMAIL_ADDRESS = `NFT Maker App <do-not-reply@nearlogin.io>`;

module.exports.handler = async (event) => {
  console.log('event', JSON.stringify(event));
  try {
    const isBodyJSONObj = utils.isJsonObject(event.body)
    if(!isBodyJSONObj) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        status: false,
        message: "content should be JSON",
      });
    }

    // const fromEmailParameterStore = await utils.getParam('FROM_EMAIL_ADDRESS');
    // FROM_EMAIL_ADDRESS = fromEmailParameterStore.Parameter.Value;
    const params = JSON.parse(event.body);
    console.log(`params.walletID: ${params.walletID}`);
    const { error } = schema.validate(params, { abortEarly: false });
    params.walletID = params.walletID || params.walletId;
    params.walletId = params.walletID || params.walletId;
    if (error) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        errors: error.details.map((item) => item.message),
      });
    }
    console.log(`checkWalletNameExists`);
    const walletNameExists = await utils.checkWalletNameExists(params.walletID);
    console.log(walletNameExists);
    if (!walletNameExists) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: 'Account ID not found',
      });
    }

    const { Items } = await getWalletInformationByID(params.walletID);

    const { userId } = Items[0];
    await checkPrevOTP(userId);

    const userInfoResult = await getUserInformationByID(userId);
    console.log(`reqId: ${reqId}, login userInfoResult `, userInfoResult);

    if (!userInfoResult || userInfoResult.Count === 0) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: 'Wallet owner does not exist',
      });
    }

    const userInfo = userInfoResult.Items[0];
    const otp = randomGen.number(6);

    await createOTP(userId, otp);

    const otpMessageSubject = 'OTP from primelab';
    const otpMessage = `Your One Time Password to login to NFT Maker App is ${otp}`;
    let { channelType = 'phone' } = params;  

    if (!userInfo.phone) {
      channelType = 'email';
    }

    if (!userInfo.email) {
      channelType = 'phone';
    }

    if(userInfo.phone && userInfo.email){
      channelType = 'phone';
    }

    if (channelType === 'email' && userInfo.email && userInfo.email.length) {
      await utils.sendEmail(
        [userInfo.email],
        FROM_EMAIL_ADDRESS,
        otpMessageSubject,
        otpMessage,
      );
    } else if (
      channelType === 'phone' &&
      userInfo.phone &&
      userInfo.phone.length
    ) {
      await utils.sendSMS(
        `${userInfo.countryCode}${userInfo.phone}`,
        otpMessage,
      );
    } else if (
      channelType === 'email' &&
      !(userInfo.email && userInfo.email.length)
    ) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'User is registered with phone number',
      });
    } else if (
      channelType === 'phone' &&
      !(userInfo.phone && userInfo.phone.length)
    ) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'User is registered with email',
      });
    }

    const response = {
      walletId: params.walletId,
      channelType,
    };

    if (channelType === 'phone') {
      const phoneLength = userInfo.phone.length - 4;
      let maskedPhone = userInfo.phone.substring(
        userInfo.phone.length - 4,
        userInfo.phone.length,
      );

      maskedPhone = '*'.repeat(phoneLength) + maskedPhone;
      response.phone = maskedPhone;
    }
    if (channelType === 'email') {
      const [emailName, domain] = userInfo.email.split('@');

      console.log(`reqId: ${reqId}, email name and domain `, emailName, domain);

      let emailNameLength = emailName.length - 2;
      if (emailNameLength < 1) {
        emailNameLength = 1;
      }
      let maskedEmailName;
      if (emailNameLength > 0) {
        maskedEmailName =
          emailName.substring(0, 2) + '*'.repeat(emailNameLength);
      }
      const [provider, tld] = domain.split('.');

      let providerLength;
      let maskingLength = 3;
      if (provider.length < 3) {
        providerLength = provider.length - 1;
        maskingLength = 1;
      } else {
        providerLength = provider.length - 3;
      }

      console.log(`reqId: ${reqId}, provider `, provider);
      const maskedProviderName =
        provider.substring(0, providerLength) + '*'.repeat(providerLength);

      const maskedEmail = `${maskedEmailName}@${maskedProviderName}.${tld}`;
      response.email = maskedEmail;
    }
    return utils.send(StatusCodes.OK, response);
  } catch ({ message }) {
    const keyParsingJsonError = getKeyErrorWhenParsingJson(message, event.body);

    if (keyParsingJsonError) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        errors: [`${keyParsingJsonError} fails to match the required pattern`],
      });
    }

    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, { message });
  }
};

const getKeyErrorWhenParsingJson = (message, params) => {
  if (message.includes('JSON at position')) {
    const valueErrorIndex = Number(message.split('JSON at position ')[1]);
    const keys = params.substring(0, valueErrorIndex).split('"');
    return keys[keys.length - 2];
  }
  return null;
};

const getWalletInformationByID = async (walletId) => {
  console.log(`getWalletInformationByID`);
  const params = {
    TableName: process.env.DYNAMODB_WALLET_TABLE,
    IndexName: 'walletName-Index',
    KeyConditionExpression: 'walletName = :walletName',
    ExpressionAttributeValues: {
      ':walletName': walletId,
    },
  };
  const result = await utils.dynamoDb.query(params);
  return result;
};

const getUserInformationByID = async (userId) => {
  console.log(`getUserInformationByID`);
  const params = {
    TableName: process.env.DYNAMODB_USER_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  };
  const result = await utils.dynamoDb.query(params);
  return result;
};

const createOTP = async (userId, otp) => {
  const params = {
    Item: {
      userId,
      code: otp,
      created: +new Date(),
      ttl:
        Math.floor(Date.now() / 1000) +
        parseInt(process.env.OTP_EXPIRY_IN_SECONDS),
      status: utils.OtpStatus.Active.name,
    },
    TableName: process.env.DYNAMODB_OTP_TABLE,
  };

  await utils.dynamoDb.put(params);
  return params.Item;
};

const checkPrevOTP = async (userId) => {
  console.log(`checkPrevOTP`);
  const params = {
    TableName: process.env.DYNAMODB_OTP_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  };
  const getOTPResult = await utils.dynamoDb.query(params);
  console.log(`reqId: ${reqId}, login getOTPResult`, getOTPResult);
  if (getOTPResult.Count > 0) {
    await deletePrevOTP(
      userId,
      getOTPResult.Items[0].code,
      getOTPResult.Items[0].ttl,
    );
  }
};

const deletePrevOTP = async (userId, otp, ttl) => {
  const params = {
    TableName: process.env.DYNAMODB_OTP_TABLE,
    Key: {
      userId,
      ttl,
    },
    ConditionExpression: 'userId = :userId AND code = :code',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':code': otp,
    },
  };
  console.log(`reqId: ${reqId}, params `, params);
  const result = await utils.dynamoDb.delete(params);
  return result;
};
