const utils = require("./utils");
const { StatusCodes } = require('http-status-codes');
const schema = require("./validation/price-limit-schema");
const { getNftById, updateNftById } = require("./lib/model/nft");

module.exports.handler = async (event) => {
  try {    
    const { pathParameters: { nftId } } = event;

    if (!nftId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'The path parameter "nftId" is required.'
      });
    }

    const body = JSON.parse(event.body);
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

    nft.minPrice = body.minPrice;
    await updateNftById(nftId, { minPrice: body.minPrice });

    return utils.send(StatusCodes.OK, {
      message: "The minimum price of NFT has been set successfully.",
      data: nft
    });
  } catch (error) {
    console.log("Error setting price limit of nft", error);
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
