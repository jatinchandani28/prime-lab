const utils = require('./utils');
const { StatusCodes } = require('http-status-codes');
const schema = require('./validation/make-nft-offer-schema');
const { createOffer } = require('./lib/model/nft-offer');
const { OfferAction } = require('./utils');
const { getNftById } = require('./lib/model/nft');

module.exports.handler = async (event) => {
  
  try {    
    const body = JSON.parse(event.body);
    const { pathParameters: { nftId } } = event;
    const { error } = schema.validate(body, { abortEarly: false });
    if (error)
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'One or more fields are invalid or missing.',
        data: error.details.map((item) => item.message),
      });

    if (!nftId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "nftId" is required.',
      });
    }

    const nft = await getNftById(nftId);
    if (!nft) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `NFT not found by nftId: ${nftId} !`,
      });
    }

    body.nftId = nftId;
    body.action = OfferAction.INITIAL;
    const result = await createOffer(Object.assign(nftId, body));

    return utils.send(StatusCodes.OK, {
      message: 'The NFT offer has been initialized successfully.',
      data: result,
    });
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
