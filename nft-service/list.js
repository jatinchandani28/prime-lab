const { StatusCodes } = require('http-status-codes');
const { listNftByOwnerId } = require('./lib/model/nft');
const { getTransactionById } = require('./lib/model/transaction');
const utils = require('./utils');
const HttpError = require('./lib/error');

module.exports.handler = async (event) => {
  console.log('event', event);

  try {
    let user;
    try {
      user = await utils.verifyAccessToken(event);
    } catch (e) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, e.message);
    }

    // TODO: make a decision here is: it walletId or walletName
    const ownerWalletId = user.walletId || user.walletName;
    if (!ownerWalletId) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'User does not have any wallet associated with it\'s identity',
      );
    }
    const nfts = await listNftByOwnerId(ownerWalletId);
    const data = await Promise.all(
      nfts.map(async (nft) => {
        if (!nft.transactionId) {
          return nft;
        }
        const transaction = await getTransactionById(nft.transactionId);
        return {
          ...nft,
          status: transaction.status,
        };
      }),
    );
    return utils.send(StatusCodes.OK, {
      message: 'NFT Collections retrieved successfully.',
      data,
    });
  } catch (err) {
    if (!err.status) {
      console.error(err.message, err);
    }
    return utils.send(
      err.status || StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error NFT Collection',
        data: err.message,
      },
      err,
    );
  }
};
