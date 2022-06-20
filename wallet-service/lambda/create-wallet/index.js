const { StatusCodes } = require('http-status-codes');
const crypto = require('crypto');

const Wallets = require('../../src/models/wallets');
const utils = require('../../src/helpers/utils');
const schema = require('../../src/helpers/validation/wallet-create');

const { verifyUser } = require('../../src/helpers/auth/user');

const { callBlockchain } = require('../../src/models/transaction');

module.exports.handler = async (event) => {
  const { body } = event;
  try {
    const request = JSON.parse(body);
    const { error } = schema.validate(request);

    if (error) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'One or more fields are invalid.',
        errors: error.details,
      });
    }

    const { appId, walletName, walletIconUrl, actionId } = request;
    const { userId, countryCode, phone, email } = await verifyUser(event);
    const walletId = walletName.toLowerCase();

    // TODO: Replace the static strings
    const wallet = await Wallets.upsertWallet({
      appId,
      userId,
      walletId,
      walletName: walletName.toLowerCase(),
      blockchainHash: crypto.createHash('sha256', walletName).digest('hex'),
      isBlockchainVerified: 'verified',
      walletIconUrl,
      status: 'pending',
      balance: '0.00',
      kycProvider: 'kyc_provider',
      storageProvider: 'storage_provider',
      publicKey: crypto.createHash('sha256', walletName).digest('hex'),
    });

    const response = await callBlockchain(
      event.headers.Authorization || event.headers.authorization,
      {
        appId: appId || '123456',
        senderWalletId: walletId,
        type: 'create_account',
        actionId: actionId || '1343245',
      },
    );

    if (response && response.data) {
      await Wallets.updateWalletWithTransactionId(
        walletId,
        response.data.transactionId,
      );
    }

    return utils.send(StatusCodes.CREATED, wallet);
  } catch (e) {
    return utils.send(
      e.status || StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: e.message,
        data: e.data,
      },
      e,
    );
  }
};
