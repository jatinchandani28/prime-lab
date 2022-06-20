const utils = require('./utils');

module.exports.main = async (event) => {
  const params = JSON.parse(event.body);

  return utils.send(200, {
    message: "Transactions created!",
    data: {
      transactionId: "Z_STwmLQLh8NHqrG0261R",
      updated: 1646331259791,
      senderWalletId: "pougeuxsyci.near",
      status: "complete",
      created: "1646331259791",
      jobId: "zstwmlqlh8nhqrg0261r",
      appId: "123456",
      blockchainStatus: "pending",
      actionId: "1343245",
      type: params.type
    }
  });
 
}
