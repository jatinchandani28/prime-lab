const utils = require("./utils");
const { StatusCodes } = require('http-status-codes');
const schema = require('./validation/offer-status-list-schema');
const { getOffersByNftId } = require("./lib/model/nft-offer");

module.exports.handler = async (event) => {
  try {    
    const { pathParameters: { status, nftId } } = event;
    const { error } = schema.validate({ status, nftId });
    if (error)
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: "One or more fields are invalid.",
        data: error.details.map((item) => item.message)
      });

    const offers = await getOffersByNftId(nftId)
    const result = offers.filter((offer) => offer.status === status);

    return utils.send(StatusCodes.OK, {
      message: `offer list by '${status}' retrieved successfully`,
      data: result
    });

  } catch (error) {
    console.log("Error list offers", err);
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
