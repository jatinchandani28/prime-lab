const { StatusCodes } = require('http-status-codes');
const utils = require('./utils');
const { deleteCollection } = require("./lib/model/nft-collection");

module.exports.handler = async (event) => {
  try {    
    const {
      pathParameters: { nftCollectionId },
    } = event;
    if (!nftCollectionId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "nftCollectionId" is required.',
      });
    }
    await deleteCollection(nftCollectionId);
    return utils.send(StatusCodes.OK, {
      message: 'NFT collection deleted successfully.'
    });
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
