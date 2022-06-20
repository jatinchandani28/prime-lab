/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
const { StatusCodes } = require('http-status-codes');
const { nanoid } = require('nanoid');
const utils = require('./utils');
const NftCollections = require('./lib/model/collections');
const NftCategories = require('./lib/model/categories');
const schema = require('./validation/create-nft-schema');
const { createNFT } = require('./lib/model/nft');
const HttpError = require('./lib/error');

function cleanInput(input) {
  const output = { ...input };
  const keys = Object.keys(output);
  // eslint-disable-next-line no-restricted-syntax
  for (const key of keys) {
    if (typeof output[key] === 'string') {
      output[key] = output[key].trim();
    }
    if (output[key] === '') {
      delete output[key];
    }
  }
  const cleanTags = [];
  if (output && output.tags) {
    for (let i = 0; i < output.tags.length; i += 1) {
      if (
        // eslint-disable-next-line operator-linebreak
        typeof output.tags[i] === 'string' &&
        output.tags[i].trim().length > 0
      ) {
        cleanTags.push(output.tags[i]);
      }
    }
  }
  output.tags = cleanTags;
  return output;
}
async function sendTransaction(data, token) {
  const params = {
    senderWalletId: data.ownerWalletId,
    type: 'create_and_mint_nft',
    name: data.title,
    capacity: '1',
    appId: '1',
    actionId: '1',
    media: data.filePath || '',
    reference: data.filePath || '',
    deposit: '0.1',
  };
  // // Data validation retrieved from transaction-service/validation/create-and-mint-nft-schema.js
  // eslint-disable-next-line operator-linebreak
  const { statusCode, body: transactionResponse } =
    await utils.callServerRequest('transactions', 'post', token, params);
  if (statusCode !== StatusCodes.OK) {
    console.error(
      `Transaction failed: ${transactionResponse.message}`,
      transactionResponse,
    );
    throw new HttpError(
      StatusCodes.BAD_REQUEST,
      `Transaction failed: ${transactionResponse.message}`,
    );
  }
  const createdNft = await createNFT({
    ...data,
    nftId: nanoid(),
    status: transactionResponse.data.blockchainStatus,
    transactionId: transactionResponse.data.transactionId,
  });
  return createdNft;
}

module.exports.sendTransaction = sendTransaction;

module.exports.handler = async (event) => {
  console.log('event', event);
  try {
    const body = JSON.parse(event.body);
    const data = { ...cleanInput(body) };

    const { error } = schema.validate(data, utils.schemaOptions);

    if (error) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        error.details.map((x) => x.message).join(', '),
        error.details,
      );
    }
    let user;
    try {
      user = await utils.verifyAccessToken(event);
    } catch (e) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, e.message);
    }
    // TODO: make a decision here is: it walletId or walletName
    data.ownerWalletId = user.walletId || user.walletName;
    data.ownerId = user.userId;
    const token = event.headers.Authorization || event.headers.authorization;

    const [
      // collection,
      category,
    ] = await Promise.all([
      // NftCollections.getById(data.collectionId),
      NftCategories.getById(data.categoryId),
    ]);
    // TODO: when the front end will be sending the collectionId uncomment this part
    // if (!collection) {
    //   throw new HttpError(
    //     StatusCodes.NOT_FOUND,
    //     `NFT collection '${data.collectionId}' not found`,
    //   );
    // }
    // // TODO: is collection ownerId = walletId or ownerId = userId ?
    // if (collection.ownerId !== user.userId) {
    //   throw new HttpError(
    //     StatusCodes.UNAUTHORIZED,
    //     { message: `You don't have access to collection '${data.collectionId}'` },
    //   );
    // }

    if (!category) {
      throw new HttpError(
        StatusCodes.NOT_FOUND,
        `NFT category '${data.categoryId}' not found`,
      );
    }
    const createdNft = await sendTransaction(data, token);

    return utils.send(StatusCodes.OK, {
      message: 'NFT created successfully.',
      data: createdNft,
    });
  } catch (e) {
    if (!e.status) {
      console.error(e.message, e);
    }
    return utils.send(
      e.status || StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error create NFT',
        data: e.message,
      },
      e,
    );
  }
};
