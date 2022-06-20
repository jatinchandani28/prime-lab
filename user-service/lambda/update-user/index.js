const { StatusCodes } = require('http-status-codes');
const utils = require('../../utils');

const Users = require('../../src/models/users');
const Wallets = require('../../src/models/wallets');

const schema = require('../../validation/users-updateUser');

module.exports.handler = async (event) => {
  const {
    body,
    pathParameters: { userId },
  } = event;
  try {
    const token = event.headers.Authorization || event.headers.authorization;
    if (!userId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'One or more fields are invalid.',
        errors: {},
      });
    }

    if (userId === 'login') {
      return utils.send(StatusCodes.METHOD_NOT_ALLOWED, {
        errors: ['PUT Method not allowed'],
      });
    }

    if (!token) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'You are not authenticated.',
        errors: {},
      });
    }

    const request = JSON.parse(body);
    const { error } = schema.validate(request);

    if (error) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'One or more fields are invalid.',
        errors: error.details.map((item) => item.message),
      });
    }

    /**
     * @TODO
     * We should make only one call for updating and if the user
     * If not found, this update function must throw an error, otherwise user will be updated
     * */
    const dbUser = await Users.getUser(userId);
    if (!dbUser) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: 'Invalid user ID or does not exist',
      });
    }

    const { firstName, lastName, email, phone, countryCode } = request;

    const wallets = await Wallets.getWalletsByUserID(userId, token);

    /**
     * Check if email has changed
     **/
    if (email && dbUser.email?.trim() != email.trim()) {
      const emailCheck = await utils.checkEmailExists(email);
      if (emailCheck) {
        return utils.send(StatusCodes.CONFLICT, {
          message: 'Email already exist',
        });
      }
    }

    /**
     * Check if phone has changed
     **/
    if (phone && dbUser.phone?.trim() != phone.trim()) {
      const phoneCheck = await utils.checkPhoneExists(phone);
      if (phoneCheck) {
        return utils.send(StatusCodes.CONFLICT, {
          message: 'Phone already exist',
        });
      }
    }

    const user = await Users.upsertUser({
      userId,
      firstName,
      lastName,
      email,
      phone,
      countryCode,
    });

    user.wallets = wallets;

    return utils.send(StatusCodes.ACCEPTED, user);
  } catch (e) {
    console.log(e);
    return utils.send(e.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: e.message,
      data: e.data,
    });
  }
};
