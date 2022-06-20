const utils = require("./utils");
const { getActivitiesByNftId } = require("./lib/model/nft-activity");
const { StatusCodes } = require('http-status-codes');

module.exports.handler = async (event) => {
  try {  
    const { pathParameters: { nftId } } = event;
    const activities = await getActivitiesByNftId(nftId);

    return utils.send(StatusCodes.OK, {
      message: `NFT activities retrieved successfully.`,
      body: activities,
    });
  } catch (error) {
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
