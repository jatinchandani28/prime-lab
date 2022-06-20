// TODO: use user-service/utils instead. wait for decoded jwt to be returned by fuction verifyUser
// TODO: remove jsonwebtoken package from file-service
const jwt = require('jsonwebtoken');
const { StatusCodes } = require('http-status-codes');
const HttpError = require('./error');

const SECRET_KEY = 'MyAwesomeKey';
const verifyUser = async (req) => {
  const token = req.headers.Authorization || req.headers.authorization;
  if (!token) {
    throw new HttpError(StatusCodes.UNAUTHORIZED, 'Your are not authenticated');
  }
  // // Uncomment this and set a debug breakpoint to inspect the tkn value to get a new token
  // const tkn = jwt.sign({
  //   userId: 'V1StGXR8_Z65dHi6B-myT',
  //   firstName: 'test',
  //   lastName: 'user',
  //   walletId: 'wafgesh.near',
  //   email: 'mock-test@primelab.io',
  //   phone: '+2551817181',
  //   dob: '2000-10-10',
  // }, SECRET_KEY, {
  //   expiresIn: 60 * 1000 * 60 * 24 * 7,
  // });
  try {
    return jwt.verify(token.replace('Bearer ', ''), SECRET_KEY);
  } catch (error) {
    console.info('error verifying jwt token', error);
    throw error;
  }
};

module.exports = {
  verifyUser,
};

