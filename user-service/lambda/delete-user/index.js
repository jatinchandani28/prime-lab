const { StatusCodes } = require('http-status-codes');

const utils = require('../../src/helpers/utils');
const Users = require('../../src/models/users');
const HttpError = require('../../src/helpers/exception/error');

module.exports.handler = async (event) => {
  const {
    pathParameters: { userId },
  } = event;

  try {
    if (!userId || userId === 'null') {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'userId missing in the request!',
      );
    }

    const token = event.headers.Authorization || event.headers.authorization;

    if (!token) {
      throw new HttpError(
        StatusCodes.UNAUTHORIZED,
        'You are not authenticated',
      );
    }
    // const secretKeyParameterStore = await utils.getParam('SECRET_KEY');
    // const SECRET_KEY = secretKeyParameterStore.Parameter.Value;
    // if (!SECRET_KEY) {
    //   throw new Error('SECRET_KEY parameter has not been set');
    // }

    const tokenResponse = await jwt.verify(token);

    const user = await Users.getUser(userId);

    if (!user) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `Invalid user ID or does not exist`,
      });
    }
    
    await Users.upsertUser({
      userId,
      status: 'deleted',
    });

    return utils.send(StatusCodes.ACCEPTED, {
      message: `You have successfully deleted ${
         user.userId
      }`,
    });
  } catch (e) {
    return utils.send(
      e.status || StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: e.message,
        data: e.data,
      },
      e,
    );
  }
};
