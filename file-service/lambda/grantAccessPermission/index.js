'use strict';

const utils = require("../../utils");

module.exports.handler = async (event) => {

  const body = JSON.parse(event.body);

  try {
    const response = {
      message: "Grant permission successful!",
     ...body,
      isUserNotified: true
    }

    return utils.send(201, response);
  } catch (e) {
    console.error(e.message, e);
    return utils.send(500, e);
  }

};
