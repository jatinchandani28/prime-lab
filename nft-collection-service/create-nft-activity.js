const { nanoid } = require('nanoid');
const schema = require('./validation/create-nft-activity-schema');
const { StatusCodes } = require('http-status-codes');
const utils = require("./utils");
const { createActivity } = require("./lib/model/nft-activity");

module.exports.handler = async (event) => {  
  const reqId = nanoid();  //for msg logging
  const params = JSON.parse(event.body);
  const { error } = schema.validate(params);

  if (error)
    return utils.send(StatusCodes.BAD_REQUEST, {
      message: "One or more fields are invalid.",
      data: error.details
    });

  try {
    const activity = await createActivity(params);
    return utils.send(StatusCodes.OK, { message: "NFT activity created successfully.", data: activity });
  } catch (error) {
    console.log(`reqId: ${reqId}, error: Error adding NFT activity to the log table.`);
    return utils.send(error.status || StatusCodes.INTERNAL_SERVER_ERROR, {
      message: error.message,
      data: error.data,
    });
  }
};
