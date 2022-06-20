const { StatusCodes } = require('http-status-codes');
const Hashes = require('../../src/models/hashes');
const HttpError = require('../../src/lib/error');
const http = require('../../src/lib/http');

module.exports.handler = async (event) => {
  try {
    const { hash } = event.pathParameters;
    if(!hash){
      throw new HttpError(
          StatusCodes.BAD_REQUEST,
          `Hash value is required`,
      );
    }
    const item = await Hashes.getHash(hash);
    if(!item){
      throw new HttpError(
          StatusCodes.NOT_FOUND,
          `Hash '${value}' not found`,
      );
    }
    const { hk, sk, hk1, sk1, ...data } = item;

    return http.send(StatusCodes.OK, data);
  } catch (e) {
    return http.send(e.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: e.message,
      data: e.data,
    });
  }
};
