const utils = require('./utils');
const { OfferStatus } = require('./utils');
const { StatusCodes } = require('http-status-codes');
const schema = require('./validation/handle-nft-offer-schema');
const { updateOfferById } = require('./lib/model/nft-offer');

module.exports.handler = async (event) => {
  try {    
    const {
      pathParameters: { offerId },
    } = event;
    const body = JSON.parse(event.body);
    const { error } = schema.validate(body, { abortEarly: false });
    if (error)
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'One or more fields are invalid or missing.',
        data: error.details.map((item) => item.message),
      });
    if (!offerId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "offerId" is required.',
      });
    }

    const updatedOffer = await updateOfferById(offerId, {
      status: body.action,
      updated: +new Date(),
      ...(body.action === OfferStatus.REJECTED && {
        note: body.note,
      }),
    });

    // Now let's delete offer from near-nft-offers table

    return utils.send(StatusCodes.OK, {
      message: `The NFT offer has been ${body.action} successfully.`,
      data: updatedOffer,
    });
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
