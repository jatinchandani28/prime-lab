const { StatusCodes } = require('http-status-codes');
const DynamoDB = require('aws-sdk/clients/dynamodb');
const utils = require('./utils');
const schema = require('./validation/swap-nft-schema');
let options = {};
if (process.env.IS_OFFLINE) {
  options = {
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
  };
}

const docClient = new DynamoDB.DocumentClient(options);

const getNftById = async (nftId) => {
  const tableParams = {
    TableName: process.env.DYNAMODB_NEAR_NFTS_TABLE,
    Key: {
      nftId,
    },
  };
  const { Item } = await docClient.get(tableParams).promise();
  return Item;
};

const swapNFT = async (nftId, ownerId, transId) => {
  const tableParams = {
    TableName: process.env.DYNAMODB_NEAR_NFTS_TABLE,
    Key: {
      nftId: nftId,
    },
    UpdateExpression:
      'set ownerWalletId = :ownerId, transactionId = :transactionId ',
    ConditionExpression: '#nftId = :nftId',
    ExpressionAttributeNames: {
      '#nftId': 'nftId',
    },
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
      ':nftId': nftId,
      ':transactionId': transId,
    },
  };
  const { Item } = await docClient.update(tableParams).promise();
  return Item;
};

module.exports.handler = async (event) => {
  const { nftId } = event.pathParameters;
  if (!nftId) {
    return utils.send(StatusCodes.BAD_REQUEST, {
      message: 'Missing nftId path param',
    });
  }

  const body = JSON.parse(event.body);
  const { error } = schema.validate(body, utils.schemaOptions);
  if (error) {
    return utils.send(StatusCodes.BAD_REQUEST, {
      status: false,
      message: error.details.map((x) => x.message).toString(),
    });
  }
  try {
    const { swapNftId } = body;
    /** Flag should be accepted/rejected */
    switch (body.flag) {
      case utils.NftSwapStatus.REJECTED:
        return utils.send(StatusCodes.OK, {
          message: 'NFT Swap rejected successfully',
        });

      case utils.NftSwapStatus.ACCEPTED: {
        const nftDetails = await getNftById(nftId);
        const swapNFTDetails = await getNftById(swapNftId);
        const userInfo = await utils.verifyAccessToken(event);
        const userWalletId = userInfo.walletId || userInfo.walletName;
        if (!nftDetails || !swapNFTDetails) {
          return utils.send(StatusCodes.BAD_REQUEST, {
            message: 'Ops... Invalid nftId',
          });
        }
        if (swapNFTDetails.ownerWalletId === userWalletId) {
          return utils.send(StatusCodes.BAD_REQUEST, {
            message: 'NFT already belongs to you.',
          });
        }
        //initiate transfer in blockchain
        const token =
          event.headers.Authorization || event.headers.authorization;
        const params = {
          senderWalletId: userWalletId,
          receiverWalletId: swapNFTDetails.ownerWalletId,
          nftContract: nftId,
          type: 'transfer_nft',
          tokenId: nftId,
          appId: '1',
          actionId: '1',
          transactionId: nftDetails.transactionId,
        };

        console.log(`call createTransaction: ${JSON.stringify(params)}`);
        const trans = await utils.createTransaction(
          params,
          'transfer_nft',
          token,
        );

        if (trans && trans.statusCode === 200) {
          let transactionId = trans.body.data.transactionId;
          await swapNFT(swapNftId, nftDetails.ownerWalletId, transactionId);
        }
        // console.log(JSON.stringify(trans));
        const swapParams = {
          senderWalletId: swapNFTDetails.ownerWalletId,
          receiverWalletId: userWalletId,
          nftContract: swapNftId,
          type: 'transfer_nft',
          tokenId: swapNftId,
          appId: '1',
          actionId: '1',
          transactionId: swapNFTDetails.transactionId,
        };

        console.log(`call createTransaction: ${JSON.stringify(swapParams)}`);
        const swaPtrans = await utils.createTransaction(
          swapParams,
          'transfer_nft',
          token,
        );
        console.log(JSON.stringify(swaPtrans));
        if (swaPtrans && swaPtrans.statusCode === 200) {
          let transId = swaPtrans.body.data.transactionId;
          await swapNFT(nftId, swapNFTDetails.ownerWalletId, transId);
        }
        if (trans.statusCode === 200 && swaPtrans.statusCode === 200) {
          return utils.send(StatusCodes.OK, {
            message: 'NFT swapped successfully.',
          });
        }
        return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
          message: 'There were problems initiating swap request',
        });
      }

      default:
        return utils.send(StatusCodes.OK, {
          message: 'Flag should be accepted or rejected',
        });
    }
  } catch (err) {
    console.log(`Error swapping NFT ${nftId}`, err);
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      { message: 'Ops...' },
      err,
    );
  }
};
