const utils = require("./utils");
const { StatusCodes } = require('http-status-codes');
const schema = require("./validation/make-token-offer-schema")
const { OfferAction } = require("./utils");
const { createOffer } = require("./lib/model/nft-offer");
const { getNftById } = require("./lib/model/nft");

module.exports.handler = async (event) => {
  const body = JSON.parse(event.body);

  try {  
    const { pathParameters: { nftId } } = event;

    if (!nftId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "nftId" is required.'
      });
    }

    const { error } = schema.validate(body, { abortEarly: false });
    if (error)
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: "One or more fields are invalid or missing.",
        data: error.details.map((item) => item.message)
      });

    const nft = await getNftById(nftId);
    if (!nft) {
      return utils.send(StatusCodes.NOT_FOUND, {
        message: `NFT not found by nftId: ${nftId} !`
      });
    }

    if (body.price < nft.minPrice) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: `Offering price is low than minimum. minimum price: ${nft.minPrice || 0}`
      });
    }
    body.nftId = nftId;
    body.action = OfferAction.INITIAL;
    const result = await createOffer(Object.assign(nftId, body));

    return utils.send(StatusCodes.OK, {
      message: "The TOKEN offer has been initialized successfully.",
      data: result
    });
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
