const schema = require('./validation/collection-update-schema');
const { StatusCodes } = require('http-status-codes');
const utils = require('./utils');
const { updateCollection } = require('./lib/model/nft-collection');

module.exports.handler = async (event) => {
  try {    
    const {
      pathParameters: { nftCollectionId },
    } = event;

    const params = JSON.parse(event.body);

    const { error } = schema.validate(params);

    if (error)
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'One or more fields are invalid.',
        data: error.details,
      });

    if (!nftCollectionId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "nftCollectionId" is required.',
      });
    }

    const result = await updateCollection(nftCollectionId, {
      ...params,
    });

    return utils.send(StatusCodes.OK, {
      message: 'NFT collection updated successfully.',
      data: result,
    });
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
