const { StatusCodes } = require('http-status-codes');
const DynamoDB = require('aws-sdk/clients/dynamodb');
const { nanoid } = require('nanoid');
const utils = require('./utils');
const schema = require('./validation/send-nft-schema');
const HttpError = require('./lib/error');
const { createNFT } = require('./lib/model/nft');

const { DEV_BASEURL, IS_OFFLINE, PROD_BASEURL } = process.env;
const url = IS_OFFLINE ? DEV_BASEURL : PROD_BASEURL;
/**  local test setting */
// const options = {
//   region: 'localhost',
//   endpoint: 'http://localhost:8000',
// };
// const docClient = new DynamoDB.DocumentClient(options);
/** end of local setting */
const docClient = new DynamoDB.DocumentClient();

const getNftById = async (nftId) => {
  const tableParams = {
    TableName: process.env.DYNAMODB_NEAR_NFTS_TABLE,
    Key: {
      nftId,
    },
  };
  const result = await docClient.get(tableParams).promise();
  return result.Item;
};

const updateNFT = async (params) => {
  const { nftId } = params;
  const tableParams = {
    TableName: process.env.DYNAMODB_NEAR_NFTS_TABLE,
    Key: {
      nftId,
    },
    UpdateExpression: 'set #nftStatus = :status',
    ConditionExpression:
      '#ownerWalletId = :ownerWalletId and #nftId = :nft_Id ',
    ExpressionAttributeNames: {
      '#nftStatus': 'status',
      '#nftId': 'nftId',
      '#ownerWalletId': 'ownerWalletId',
    },
    ExpressionAttributeValues: {
      ':status': 'transfered',
      ':nft_Id': nftId,
      ':ownerWalletId': params.ownerWalletId,
    },
  };
  console.log(tableParams);
  const { Item } = await docClient.update(tableParams).promise();
  return Item;
};

module.exports.handler = async (event) => {
  try {
    const { nftId } = event.pathParameters;

    if (!nftId) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'Missing nftId path param',
        data: {},
      });
    }

    const body = JSON.parse(event.body);
    const { error } = schema.validate(body, utils.schemaOptions);

    if (error) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        error.details.map((x) => x.message).join(', '),
        error.details,
      );
    }

    const { recipientWalletId } = body;
    const userInfo = await utils.verifyAccessToken(event);
    const nft = await getNftById(nftId);

    if (!nft) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'NFT does not exist.');
    }

    const { ownerWalletId } = nft;

    if (!ownerWalletId) {
      throw new HttpError(StatusCodes.NOT_FOUND, 'Owner Wallet ID is missing.');
    }

    if (![userInfo.walletId, userInfo.walletName].includes(ownerWalletId)) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, 'User is not the owner.');
    }

    // getWalletDetails
    const recipientWallet = await utils.getWalletDetails(recipientWalletId);
    if (!recipientWallet) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'Receiver Wallet does not exist.',
      );
    }

    const { userId } = recipientWallet;
    const recipientUserData = await utils.getUserDetails(userId);

    if (
      // eslint-disable-next-line operator-linebreak
      !recipientUserData ||
      // eslint-disable-next-line operator-linebreak
      !recipientUserData.status ||
      recipientUserData.status !== utils.UserStatus.Active.name
    ) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        'Recipient User is invalid or not active yet',
      );
    }

    const params = {
      senderWalletId: recipientWalletId,
      type: 'create_and_mint_nft',
      name: nft.title,
      capacity: '1',
      media: nft.filePath || '',
      reference: nft.filePath || '',
      deposit: '0.1',
      appId: '1',
      actionId: '1',
    };
    const token = event.headers.Authorization || event.headers.authorization;
    const createTransaction = await utils.callServerRequest(
      'transactions',
      'post',
      token,
      params,
    );
    if (createTransaction.statusCode !== StatusCodes.OK) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: `Trasaction API Status code is ${createTransaction.statusCode} and Message is ${createTransaction.message}, Trasaction API is not working or responding 200 status. We are calling Trasaction API to insert Transaction`,
      });
    }

    const transBody = createTransaction.body;
    /* update nft status with status = transfered */
    await updateNFT(nft);
    /* make a copy of the nft and set owner as recipient Wallet, create_and_mint in blockcahin 
       This will change when we have the transfer_nft working
    */
    const newNft = nft;
    newNft.nftId = nanoid();
    newNft.ownerWalletId = recipientWalletId;
    await createNFT({
      ...newNft,
      status: transBody.data.blockchainStatus,
      transactionId: transBody.data.transactionId,
    });

    if (recipientUserData.email) {
      // const transferNFTtoken = await utils.generateTokenLink(params);

      const fromEmailParameterStore = await utils.getParam(
        'FROM_EMAIL_ADDRESS',
      );
      const FROM_EMAIL_ADDRESS = fromEmailParameterStore.Parameter.Value;
      const otpMessageSubject = 'You have just received an NFT';
      const otpMessage = `You have received NFT from  ${ownerWalletId} , click link to view '${url}/nfts/${nftId}'`;

      await utils.sendEmail(
        [recipientUserData.email],
        FROM_EMAIL_ADDRESS,
        otpMessageSubject,
        otpMessage,
      );
    }
    return utils.send(StatusCodes.OK, {
      message: 'NFT send successfully.',
      newNft,
    });
  } catch (err) {
    console.error('Internal server error', err.stack);
    console.error('Internal server error', err);
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Internal server error',
        data: err.message,
      },
      err,
    );
  }
};
