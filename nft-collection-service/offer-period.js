const utils = require('./utils');
const { StatusCodes } = require('http-status-codes');
const schema = require('./validation/offer-period-schema');
const { getOfferById } = require('./lib/model/nft-offer');

module.exports.handler = async (event) => {
  try {    
    const { pathParameters: { offerId } } = event;

    if (!offerId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "offerId" is required.',
      });
    }

    const result = await getOfferById(offerId);

    const response = {
      message: result
        ? 'Offer has been fetched successfully.'
        : 'The offer is not exist. Please make new offer.',
      data: result,
    };
    return utils.send(StatusCodes.OK, response);
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
