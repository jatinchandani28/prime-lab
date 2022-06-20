const axios = require('axios');
const SSM = require('aws-sdk/clients/ssm');

const parameterStore = new SSM();

/**
 * Helper Function to fetch parameters from the parameter store
 * @param {string} param The parameter name in parameter store
 * @return {*}
 */
const getParam = (param) => {
  return new Promise((res, rej) => {
    parameterStore.getParameter(
      {
        Name: param,
      },
      (err, data) => {
        if (err) {
          return rej(err);
        }
        return res(data);
      },
    );
  });
};

/**
 * Blockchain Call (Pending further for Transaction API)
 * @param {} data { userId, walletName, email, phone }
 * @return {*}
 */
async function callBlockchain(token, data) {
  try {
    const apiGatewayParam = '/near/api-gateway/url';
    const apiGatewayStore = await getParam(apiGatewayParam);
    const apiGateway = apiGatewayStore.Parameter.Value;
    if (!apiGateway) {
      throw new Error(`'${apiGatewayParam}' parameter not set`);
    }
    const URL = `${apiGateway}/transactions`;
    const apiHeaders = {
      'Content-Type': 'application/json',
      Authorization: token,
    };

    const response = await axios.post(`${URL}`, data, {
      headers: apiHeaders,
    });
    return response.data;
  } catch (err) {
    console.log(JSON.stringify(err));
  }
}

module.exports = {
  callBlockchain,
};
