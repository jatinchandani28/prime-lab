const { StatusCodes } = require('http-status-codes');
const utils = require('./utils');
const Nfts = require('./lib/model/nft');
const HttpError = require('./lib/error');

module.exports.handler = async (event) => {
  const { nftId } = event.pathParameters;
  try {
    if (!nftId) {
      throw new HttpError(StatusCodes.BAD_REQUEST, 'Missing nftId path param');
    }

    let user;
    try {
      user = await utils.verifyAccessToken(event);
    } catch (e) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, e.message);
    }

    const nft = await Nfts.getNftById(nftId);
    if (!nft) {
      throw new HttpError(StatusCodes.NOT_FOUND, `NFT '${nftId}' not found`);
    }
    // TODO: make a decision here is: it walletId or walletName
    if (![user.walletId, user.walletName].includes(nft.ownerWalletId)) {
      throw new HttpError(
        StatusCodes.FORBIDDEN,
        `You don't have the right to access NFT '${nftId}'`,
      );
    }
    return utils.send(StatusCodes.OK, {
      message: 'NFT detail retrieved successfully.',
      data: nft,
    });
  } catch (err) {
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error detail NFT',
        data: err.message,
      },
      err,
    );
  }
};
