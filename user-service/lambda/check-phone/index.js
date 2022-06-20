const { StatusCodes } = require('http-status-codes');
const { nanoid } = require('nanoid');
const randomGen = require('random-gen');
const schema = require('../../validation/check-phone-schema');
const utils = require('../../utils');

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
    const walletId = params.walletName;
    const phone = `${params.countryCode}${params.phone}`;

    const [isExistingPhone, isExistingWalletName] = await Promise.all([
      utils.checkPhoneExists(phone), utils.checkWalletNameExists(walletId),
    ]);

    if (!isExistingPhone || !isExistingWalletName) {
      const message = !isExistingPhone ? 'Phone does not exist' : 'Account ID not found';
      return utils.send(StatusCodes.NOT_FOUND, { message });
    }

    const otp = randomGen.number(6);
    const otpMessage = `Your One Time Password is ${otp}`;
    await utils.sendSMS(phone, otpMessage);
    return utils.send(StatusCodes.OK, {
      message: 'Sent OPT code to phone',
    });
  } catch (err) {
    console.log(`reqId: ${reqId}, login err`, err);
    return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
      message: `${err.message}`,
    });
  }
};
