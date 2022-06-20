const utils = require("./utils");
const { getCollectionsByOwnerId } = require("./lib/model/nft-collection");
const { StatusCodes } = require('http-status-codes');

module.exports.handler = async (event) => {
  try {    
    const { pathParameters: { ownerId } } = event;
    if (!ownerId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "ownerId" is required.'
      });
    }

    const result = await getCollectionsByOwnerId(ownerId);

    if (!result.length) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `Collections doesn't exist.`
      })
    }

    return utils.send(StatusCodes.OK, {
      message: "NFT Collections retrieved successfully.",
      data: result,
    });
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};

