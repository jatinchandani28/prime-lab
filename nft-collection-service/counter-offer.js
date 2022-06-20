const utils = require('./utils');
const { StatusCodes } = require('http-status-codes');
const schema = require('./validation/counter-offer-schema');
const { OfferStatus } = require('./utils');
const { getOfferById } = require('./lib/model/nft-offer');
const { getNftById } = require('./lib/model/nft');

module.exports.handler = async (event) => {
  try {    
    const body = JSON.parse(event.body);
    const {
      pathParameters: { nftId },
    } = event;
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

    const [nft, offer] = await Promise.all([
      getNftById(nftId),
      getOfferById(body.offerId),
    ]);

    if (!nft || !offer) {
      const message = !nft
        ? `NFT not found by nftId: ${nftId} !`
        : 'The offer is not exist. Please make new offer.';
      return utils.send(StatusCodes.NOT_FOUND, { message });
    }

    if (offer.status !== OfferStatus.PENDING) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: `The offer has been already approved or rejected.`,
      });
    }

    if (body.price < nft.minPrice) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: `Offering price is low than minimum. minimum price: ${
          nft.minPrice || 0
        }`,
      });
    }

    // body.nftId = nftId;
    // body.action = OfferAction.COUNTER;
    // body.offerPrice = body.price;
    // const result = await createOffer(Object.assign(nftId, body));

    // const response = {
    //   message: 'New counter offer has been applied successfully',
    //   data: result,
    // };
    // return utils.send(StatusCodes.OK, response);
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
