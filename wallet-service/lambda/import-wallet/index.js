const { StatusCodes } = require('http-status-codes');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const Wallets = require('../../src/models/wallets');

const utils = require('../../src/helpers/utils');
const schema = require('../../src/helpers/validation/wallet-import');
const { verifyUser } = require('../../src/helpers/auth/user');

module.exports.handler = async (event) => {
  try {
    const request = JSON.parse(event.body);
    const { error } = schema.validate(request);
    if (error) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'One or more fields are invalid.',
        errors: error.details,
      });
    }

    const { walletName, privateKey, passPhrases } = request;

    if (passPhrases) {
      const passphrasesArray = passPhrases.split('-');
      if (passphrasesArray.length !== 12) {
        return utils.send(StatusCodes.BAD_REQUEST, {
          message: 'passPhrases should be 12 words',
        });
      }
    }

    const { userId } = await verifyUser(event);

    const walletId = uuidv4();

    // TODO: Replace the static strings
    const wallet = await Wallets.upsertWallet({
      userId,
      walletId,
      walletName,
      blockchainHash: crypto.createHash('sha256', walletName).digest('hex'),
      isBlockchainVerified: 'verified',
      status: 'active',
      balance: '0.00',
      kycProvider: 'kyc_provider',
      storageProvider: 'storage_provider',
      publicKey: crypto.createHash('sha256', walletName).digest('hex'),
      privateKey,
      passPhrases,
    });

    return utils.send(StatusCodes.CREATED, {
      userId,
      walletName,
      blockchainHash: wallet.blockchainHash,
      publicKey: wallet.publicKey,
      isPrimary: wallet.isPrimary,
      status: wallet.status,
      balance: wallet.balance,
      blockchainExplorerUrl: `http://example.com/${walletId}`, // TODO: Update this url
      created: wallet.created,
    });
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
