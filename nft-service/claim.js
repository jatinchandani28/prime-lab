const { StatusCodes } = require('http-status-codes');
const DynamoDB = require('aws-sdk/clients/dynamodb');
const { nanoid } = require('nanoid');
const axios = require('axios');
const utils = require('./utils');

let options = {};
if (process.env.IS_OFFLINE) {
  options = {
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
  };
}

const docClient = new DynamoDB.DocumentClient(options);

// 1 . Create a new nft collection
// 2 . Clone the NFT using the sames values except for nftId, collectionId
// 3 . Get the transaction object
// 4 . Call the transactions create using the same payload
//     except the senderWalletId (should use the current userId)
// 5. Update the NFT using the new transactionId

const createNftCollection = async (params) => {
  const { userId, collectionId } = params;
  const tableParams = {
    TableName: 'near-nft-collections',
    Item: {
      collectionId,
      collectionName: 'My new Collection',
      userId,
      active: true,
      created: +new Date(),
      updated: +new Date(),
    },
  };

  await docClient.put(tableParams).promise();
  return tableParams.Item;
};

const createNftCopy = async (data) => {
  const nftId = nanoid();
  const params = {
    TableName: 'near-nfts',
    Item: {
      nftId,
      ownerWalletId: data.ownerWalletId,
      categoryId: data.categoryId,
      title: data.title,
      description: data.description,
      filePath: data.filePath,
      tags: data.tags,
      created: +new Date(),
    },
  };
  await docClient.put(params).promise();
  return params.Item;
};

const getNftById = async (nftId) => {
  const tableParams = {
    TableName: 'near-nfts',
    Key: {
      nftId,
    },
  };
  const result = await docClient.get(tableParams).promise();
  return result.Item;
};

const updateNFT = async ({ nftId }, collectionId, transactionId) => {
  const tableParams = {
    TableName: 'near-nfts',
    Key: {
      nftId,
    },
    UpdateExpression:
      'set transactionId = :transactionId, collectionId = :collectionId',
    ConditionExpression: '#nftId = :nftId',
    ExpressionAttributeNames: {
      '#nftId': 'nftId',
    },
    ExpressionAttributeValues: {
      ':transactionId': transactionId,
      ':collectionId': collectionId,
      ':nftId': nftId,
    },
    ReturnValues: 'ALL_NEW',
  };
  const { Item } = await docClient.update(tableParams).promise();
  return Item;
};

const getTransactionById = async (transactionId) => {
  console.log('transactionId', transactionId);

  const tableParams = {
    TableName: 'near-transactions',
    Key: {
      transactionId,
    },
  };
  const { Item } = await docClient.get(tableParams).promise();
  console.log('transactioObj', Item);
  return Item;
};

async function callTransactionAPI(data, bearerToken) {
  try {
    const params = {
      senderWalletId: data.senderWalletId,
      type: data.type,
      name: data.name,
      capacity: data.capacity,
      media: data.media,
      reference: data.reference,
      deposit: data.deposit,
      appId: data.appId,
      actionId: data.actionId,
    };
    console.log('params', JSON.stringify(params));
    const URL = 'https://api.dev.nearlogin.io/transactions';
    const apiHeaders = {
      'Content-Type': 'application/json',
      Authorization: `${bearerToken}`,
    };

    const response = await axios.post(`${URL}`, params, {
      headers: apiHeaders,
    });
    return response;
  } catch (err) {
    console.log(err);
  }
}

module.exports.handler = async (event) => {
  const { nftId, claimToken } = event.pathParameters;
  const token = event.headers.Authorization;

  if (!nftId) {
    return utils.send(StatusCodes.BAD_REQUEST, {
      message: 'Missing nftId path param',
      data: {},
    });
  }
  if (!claimToken) {
    return utils.send(StatusCodes.BAD_REQUEST, {
      message: 'Missing claimToken path param',
      data: {},
    });
  }
  try {
    const userInfo = await utils.verifyAccessToken(event);

    // const nftInfo = await utils.verifyAccessToken(claimToken); /// talk to someone (frontend)

    // 1. create collection based on UserInfo
    const collectionId = nanoid();
    userInfo.collectionId = collectionId;
    console.log('userInfo', userInfo);

    await createNftCollection(userInfo);
    console.log('collectionCreated');

    const nft = await getNftById(nftId);
    console.log('nft', nft);

    if (!nft) {
      return utils.send(StatusCodes.BAD_REQUEST, {
        message: 'Invalid nftId',
        data: {},
      });
    }
    // 2. make copy of nft
    const nftIdNew = await createNftCopy(nft);
    console.log('copy Created', nftIdNew);

    // 3 .get transaction object
    const transactioObj = await getTransactionById(nft.transactionId);
    console.log('transactioObj', transactioObj);

    const reqParams = JSON.parse(transactioObj.requestParams);
    reqParams.senderWalletId = userInfo.walletId;

    // if (nft.ownerWalletId === userInfo.walletId) {
    //   return utils.send(StatusCodes.BAD_REQUEST, {
    //     message: 'NFT already claimed by the user.',
    //     data: {},
    //   });
    // }

    // 4 . Call transaction API
    try {
      const transactionApiResponse = await callTransactionAPI(reqParams, token);
      if (transactionApiResponse && transactionApiResponse.status === 200) {
        const { transactionId } = transactionApiResponse.data.data;

        // 5. Update the nft with ids
        await updateNFT(nftIdNew, collectionId, transactionId);

        return utils.send(StatusCodes.OK, {
          message: 'NFT claimed successfully.',
          data: {
            nftId: nftIdNew.nftId,
            claimToken,
            walletId: userInfo.walletId,
          },
        });
      }
      // Call Further Transection API Here
    } catch (err) {
      console.error('Internal server error', err);
      return utils.send(StatusCodes.INTERNAL_SERVER_ERROR, {
        message: `Ops...${err.message}`,
        data: err.message,
      });
    }
  } catch (err) {
    // console.error(`Error claiming NFT ${nftId}`, err);
    console.log('Error claiming NFT', nftId, err);
    return utils.send(
      StatusCodes.INTERNAL_SERVER_ERROR,
      {
        message: 'Error claiming NFT',
        data: err.message,
      },
      err,
    );
  }
};
