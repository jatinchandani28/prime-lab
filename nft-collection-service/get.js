const utils = require('./utils');
const { StatusCodes } = require('http-status-codes');
const { getCollectionById } = require("./lib/model/nft-collection");

module.exports.handler = async (event) => {
  try {    
    const {
      pathParameters: { nftCollectionId },
    } = event;
    if (!nftCollectionId) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: 'The path parameter "nftCollectionId" is required.',
      });
    }

    const collection = await getCollectionById(nftCollectionId);

    if (!collection || !collection.active) {
      console.log(`Collection not found for collectionID: ${nftCollectionId}`);
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `Collection not found for collectionID: ${nftCollectionId}`
      })
    }

    return utils.send(StatusCodes.OK, {
      message: 'NFT collection retrieved successfully.',
      data: collection,
    });
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};


