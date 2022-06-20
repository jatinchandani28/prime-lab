const utils = require("./utils");
const { StatusCodes } = require('http-status-codes');
const { OfferType } = require('./utils');
const schema = require("./validation/publish-token-offer-schema")
const { updateNftById } = require("./lib/model/nft");
const { getNftById } = require("./lib/model/nft");

module.exports.handler = async (event) => {
  try {    
    const { pathParameters } = event;
    const body = JSON.parse(event.body);
    const { pathParameters: { nftId } } = pathParameters;
    if (!nftId) {
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        message: `The path parameter "nftId" is required.`,
      };
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

    nft.offerType = OfferType.TOKEN;
    nft.minPrice = body.price;
    nft.expire = body.expire;
    nft.published = true;

    await updateNftById(nftId,
      {
        published: true,
        offerType: body.offerType,
        minPrice: body.price,
        expire: body.expire
      });

    return utils.send(StatusCodes.OK, {
      message: "The NFT has been published successfully. this one is only able to sold by TOKEN.",
      data: nft
    });
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
